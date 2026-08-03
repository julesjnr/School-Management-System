import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from "express";
import path from "path";
import fs from "fs";
import http from "http";
import net from "net";
import { execSync } from "child_process";
import crypto from "crypto";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createCorsMiddleware } from "./src/cors.ts";
import { db, closePool } from "./src/db/index.ts";
import { runMigrations } from "./src/db/migrate.ts";
import {
  systemState,
  students,
  studentEnrollments,
  payments,
  invoices,
  studentAttendance,
  grades,
  examPapers,
  lecturers,
  courses,
  lecturerSubjects,
  lecturerPublications,
  lecturerResearchInterests,
  officeHourSlots,
  courseReviews,
  expenses,
  stockItems,
  requisitions,
  testimonies,
  books,
  loans,
  reservations,
  readingLists,
  readingListBooks,
  bookReviews,
  bookRequests,
  teacherResources,
  libraryGateLogs,
  notifications,
  passwordResetRequests,
  transactions,
  studentLedger,
  users,
  teachingSessions,
  lectureSchedules,
  syllabusTopics,
  academicRanks,
  classAttendanceSessions,
  departments,
  archiveRecords,
  archiveAuditLogs,
} from "./src/db/schema.ts";
import { eq, notInArray, and, or, desc, asc, count, ilike, inArray, sql, gte } from "drizzle-orm";
import { supabase } from "./src/db/supabaseClient.ts";
import {
  hashPassword,
  verifyPassword,
  resolvePassword,
  upsertUserAuthRecord,
  sanitizeProfile,
  issueAuthToken,
  issueAccessToken,
  issueRefreshToken,
  migrateAuthSchemaAndData,
  authenticateUser,
  changeUserPassword,
  adminResetUserPassword,
  PasswordResetError,
  resetStudentPassword,
  findUserByIdentifier,
} from "./src/auth.ts";

// Import initial mock databases from src/data.ts to bootstrap our persistent store
import { 
  initialCourses, initialLecturers, initialStudents, 
  initialExpenses, initialInventory, initialRequisitions, 
  initialNews, initialTestimonies, initialReviews,
  initialBooks, initialLoans, initialReservations, initialReadingLists,
  initialBookReviews, initialBookRequests, initialExamPapers, initialTeacherResources, initialLibraryGateLogs,
  initialNotifications
} from "./src/data";

const app = express();
const PORT = Number(process.env.PORT) || 8000;

// Set up larger limit for full state synchronizations
app.use(express.json({ limit: "20mb" }));

// JWT Secret Key configuration (loads from environment, fallback to secure random on the fly)
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// CORS must be enabled on the API layer that serves database routes.
app.use(createCorsMiddleware());

const DB_FILE = path.join(process.cwd(), "db_store.json");

// Local cache for Postgres DB state to support synchronous access inside existing API controllers
let cachedDb: any = null;

type ArchivableResource = "student" | "lecturer" | "course" | "department" | "book" | "user";

const archiveResourceTables: Record<ArchivableResource, any> = {
  student: students,
  lecturer: lecturers,
  course: courses,
  department: departments,
  book: books,
  user: users,
};

function activeResourceCondition(resourceType: ArchivableResource, idColumn: any) {
  return sql`NOT EXISTS (
    SELECT 1 FROM archive_records
    WHERE resource_type = ${resourceType} AND resource_id = ${idColumn}::text
  )`;
}

async function activeStudentExists(studentId: string): Promise<boolean> {
  const rows = await db.select({ id: students.id })
    .from(students)
    .where(and(eq(students.id, studentId), activeResourceCondition("student", students.id)))
    .limit(1);
  return rows.length === 1;
}

function archiveDisplayName(resourceType: ArchivableResource, record: any): string {
  switch (resourceType) {
    case "student": return `${record.name} (${record.admissionNo})`;
    case "lecturer": return `${record.name} (${record.designatorCode})`;
    case "course": return `${record.code} — ${record.title}`;
    case "department": return `${record.code} — ${record.name}`;
    case "book": return `${record.title} — ${record.author}`;
    case "user": return record.username || record.email || record.uid;
  }
}

async function getArchivableRecord(resourceType: ArchivableResource, resourceId: string) {
  const table = archiveResourceTables[resourceType];
  if (resourceType === "user") {
    const userId = Number(resourceId);
    return Number.isInteger(userId) ? (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0] : undefined;
  }
  return (await db.select().from(table).where(eq(table.id, resourceId)).limit(1))[0];
}

async function dependencySummary(resourceType: ArchivableResource, resourceId: string): Promise<string[]> {
  const countRows = async (table: any, condition: any) => Number((await db.select({ total: count() }).from(table).where(condition))[0]?.total || 0);
  const dependencies: string[] = [];
  if (resourceType === "student") {
    const checks = [[studentEnrollments, studentEnrollments.studentId, "enrollments"], [grades, grades.studentId, "grades"], [invoices, invoices.studentId, "invoices"], [payments, payments.studentId, "payments"], [studentLedger, studentLedger.studentId, "ledger entries"], [studentAttendance, studentAttendance.studentId, "attendance records"]] as const;
    for (const [table, column, label] of checks) { const total = await countRows(table, eq(column, resourceId)); if (total) dependencies.push(`${total} ${label}`); }
  } else if (resourceType === "lecturer") {
    const checks = [[lecturerSubjects, lecturerSubjects.lecturerId, "subject allocations"], [officeHourSlots, officeHourSlots.lecturerId, "office-hour slots"], [readingLists, readingLists.lecturerId, "reading lists"]] as const;
    for (const [table, column, label] of checks) { const total = await countRows(table, eq(column, resourceId)); if (total) dependencies.push(`${total} ${label}`); }
  } else if (resourceType === "book") {
    const checks = [[loans, loans.bookId, "loan records"], [reservations, reservations.bookId, "reservations"], [bookReviews, bookReviews.bookId, "reviews"]] as const;
    for (const [table, column, label] of checks) { const total = await countRows(table, eq(column, resourceId)); if (total) dependencies.push(`${total} ${label}`); }
  } else if (resourceType === "course") {
    const record = await getArchivableRecord(resourceType, resourceId);
    const reviews = await countRows(courseReviews, eq(courseReviews.courseId, resourceId));
    const enrollments = record ? await countRows(studentEnrollments, eq(studentEnrollments.courseCode, (record as any).code)) : 0;
    if (reviews) dependencies.push(`${reviews} reviews`);
    if (enrollments) dependencies.push(`${enrollments} enrollments`);
  } else if (resourceType === "department") {
    const heads = await countRows(departments, eq(departments.headOfDepartmentId, resourceId));
    if (heads) dependencies.push(`${heads} department-head assignments`);
  } else if (resourceType === "user") {
    const user = await getArchivableRecord(resourceType, resourceId);
    if (user?.roleId) dependencies.push("linked role profile");
  }
  return dependencies;
}

// Load full state from individual database tables
export async function loadFullDatabaseState(): Promise<any> {
  const existing = await db.select().from(systemState).where(eq(systemState.id, 1));
  let dbState: any = {};
  if (existing.length > 0) {
    dbState = { ...(existing[0].data as any) };
  } else {
    dbState = {
      news: initialNews,
      attendanceSessions: [],
    };
  }

  // Class roll-call sessions (relational source of truth)
  try {
    const attendanceSessionRows = await db.select().from(classAttendanceSessions);
    dbState.attendanceSessions = attendanceSessionRows.map((s) => ({
      id: s.id,
      date: s.sessionDate,
      subjectCode: s.subjectCode,
      presentStudents: Array.isArray(s.presentStudentIds) ? s.presentStudentIds : [],
      absentStudents: Array.isArray(s.absentStudentIds) ? s.absentStudentIds : [],
      lecturerId: s.lecturerId,
    }));
  } catch (e) {
    console.warn("attendance_sessions table not available yet:", e);
    dbState.attendanceSessions = dbState.attendanceSessions || [];
  }

  // 1. Courses
  const courseRows = await db.select().from(courses).where(activeResourceCondition("course", courses.id));
  dbState.courses = courseRows.map(c => ({
    id: c.id,
    code: c.code,
    title: c.title,
    description: c.description ?? "",
    duration: c.duration,
    fees: Number(c.fees),
    thumbnail: c.thumbnail ?? "",
    faculty: c.faculty,
    active: c.active
  }));

  // 2. Reviews (Course reviews)
  const courseReviewRows = await db.select().from(courseReviews);
  dbState.reviews = courseReviewRows.map(r => ({
    id: r.id,
    courseId: r.courseId ?? "",
    studentId: r.studentId,
    studentName: r.studentName,
    rating: r.rating,
    comment: r.comment ?? "",
    date: r.date
  }));

  // 3. Lecturers
  const lecturerRows = await db.select().from(lecturers).where(activeResourceCondition("lecturer", lecturers.id));
  const lecturerSubjRows = await db.select().from(lecturerSubjects);
  const lecturerPubRows = await db.select().from(lecturerPublications);
  const lecturerResRows = await db.select().from(lecturerResearchInterests);
  const officeSlotRows = await db.select().from(officeHourSlots);

  dbState.lecturers = lecturerRows.map(l => ({
    id: l.id,
    name: l.name,
    email: l.email,
    phone: l.phone,
    hourlyRate: Number(l.hourlyRate),
    loggedHours: Number(l.loggedHours),
    bankDetails: l.bankDetails ?? "",
    contractLength: l.contractLength,
    designatorCode: l.designatorCode,
    bio: l.bio ?? "",
    avatar: l.avatar ?? "",
    isActive: l.isActive,
    isAccountant: l.isAccountant,
    isLibrarian: l.isLibrarian,
    subjects: lecturerSubjRows.filter(s => s.lecturerId === l.id).map(s => s.subjectCode),
    publications: lecturerPubRows.filter(p => p.lecturerId === l.id).map(p => p.publicationText),
    researchInterests: lecturerResRows.filter(r => r.lecturerId === l.id).map(r => r.interestText),
    officeHours: officeSlotRows.filter(o => o.lecturerId === l.id).map(o => ({
      id: o.id,
      day: o.day,
      time: o.timeSlot,
      status: o.status as 'available' | 'booked',
      studentId: o.studentId ?? undefined,
      studentName: o.studentName ?? undefined,
      studentEmail: o.studentEmail ?? undefined,
      studentNotes: o.studentNotes ?? undefined
    }))
  }));

  // 4. Students
  const studentRows = await db.select().from(students).where(activeResourceCondition("student", students.id));
  const enrollmentRows = await db.select().from(studentEnrollments);
  const gradeRows = await db.select().from(grades);
  const invoiceRows = await db.select().from(invoices);
  const paymentRows = await db.select().from(payments);
  const attendanceRows = await db.select().from(studentAttendance);

  const oldStudents = dbState.students || [];

  dbState.students = studentRows.map(s => {
    const enrolledUnits = enrollmentRows.filter(e => e.studentId === s.id).map(e => e.courseCode);
    
    const studentGrades: Record<string, { cat: number; exam: number; gradedAt?: string }> = {};
    gradeRows.filter(g => g.studentId === s.id).forEach(g => {
      studentGrades[g.subjectCode] = {
        cat: g.catScore ? Number(g.catScore) : 0,
        exam: g.examScore ? Number(g.examScore) : 0,
        gradedAt: g.gradedAt ?? undefined,
      };
    });

    const ledger = invoiceRows.filter(i => i.studentId === s.id).map(i => ({
      id: i.id,
      invoiceNo: i.invoiceNo,
      description: i.description,
      amount: Number(i.amount),
      date: i.date,
      status: i.status as 'unpaid' | 'paid'
    }));

    const paymentsList = paymentRows.filter(p => p.studentId === s.id).map(p => ({
      id: p.id,
      amount: Number(p.amount),
      invoiceId: p.invoiceId ?? "",
      studentId: p.studentId,
      paymentMethod: p.paymentMethod as 'M-Pesa' | 'Bank Transfer' | 'Card',
      transactionId: p.transactionId,
      date: p.date,
      status: p.status as 'unreconciled' | 'reconciled'
    }));

    const attendanceMap: Record<string, number> = {};
    attendanceRows.filter(a => a.studentId === s.id).forEach(a => {
      attendanceMap[a.subjectCode] = a.attendanceRate;
    });

    const matchedCachedStudent = oldStudents.find((cs: any) => cs.id === s.id);
    const cachedStatus = matchedCachedStudent?.accountStatus;
    const accountStatus = s.accountStatus || cachedStatus || "Active";

    return {
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      admissionNo: s.admissionNo,
      cohort: s.cohort,
      programme: s.programme ?? undefined,
      department: s.department ?? undefined,
      avatar: s.avatar ?? undefined,
      accountStatus,
      createdAt: s.createdAt ?? undefined,
      enrolledUnits,
      grades: studentGrades,
      ledger,
      payments: paymentsList,
      attendance: attendanceMap
    };
  });

  // 5. Expenses
  const expenseRows = await db.select().from(expenses);
  dbState.expenses = expenseRows.map(e => ({
    id: e.id,
    description: e.description,
    category: e.category,
    amount: Number(e.amount),
    date: e.date
  }));

  // 6. Inventory (Stock Items)
  const stockRows = await db.select().from(stockItems);
  dbState.inventory = stockRows.map(s => ({
    id: s.id,
    name: s.name,
    quantity: s.quantity,
    category: s.category,
    location: s.location,
    lowestThreshold: s.lowestThreshold
  }));

  // 7. Requisitions
  const reqRows = await db.select().from(requisitions);
  dbState.requisitions = reqRows.map(r => ({
    id: r.id,
    itemName: r.itemName,
    quantity: r.quantity,
    staffName: r.staffName,
    date: r.date,
    status: r.status as 'pending' | 'approved' | 'rejected'
  }));

  // 8. Testimonies
  const testimonyRows = await db.select().from(testimonies);
  dbState.testimonies = testimonyRows.map(t => ({
    id: t.id,
    name: t.name,
    role: t.role,
    content: t.content,
    avatar: t.avatar ?? ""
  }));

  // 9. Books
  const bookRows = await db.select().from(books).where(activeResourceCondition("book", books.id));
  dbState.books = bookRows.map(b => ({
    id: b.id,
    title: b.title,
    author: b.author,
    isbn: b.isbn,
    publisher: b.publisher ?? "",
    edition: b.edition ?? "",
    purchasePrice: Number(b.purchasePrice),
    rackNumber: b.rackNumber,
    shelfRow: b.shelfRow,
    libraryCode: b.libraryCode,
    type: b.type as 'Physical Book' | 'E-Book',
    eUrl_aid: b.eUrl ?? undefined,
    copiesTotal: b.copiesTotal,
    copiesAvailable: b.copiesAvailable,
    category: b.category
  }));

  // 10. Loans
  const loanRows = await db.select().from(loans).where(activeResourceCondition("book", loans.bookId));
  dbState.loans = loanRows.map(l => ({
    id: l.id,
    bookId: l.bookId,
    bookTitle: l.bookTitle,
    patronId: l.patronId,
    patronName: l.patronName,
    patronRole: l.patronRole as 'student' | 'lecturer',
    checkoutDate: l.checkoutDate,
    dueDate: l.dueDate,
    returnDate: l.returnDate ?? undefined,
    status: l.status as 'borrowed' | 'returned' | 'overdue' | 'lost' | 'damaged',
    lateFeeAssessed: l.lateFeeAssessed ? Number(l.lateFeeAssessed) : 0
  }));

  // 11. Reservations
  const reservationRows = await db.select().from(reservations).where(activeResourceCondition("book", reservations.bookId));
  dbState.reservations = reservationRows.map(r => ({
    id: r.id,
    bookId: r.bookId,
    bookTitle: r.bookTitle,
    patronId: r.patronId,
    patronName: r.patronName,
    reservationDate: r.reservationDate,
    status: r.status as 'pending' | 'fulfilled' | 'cancelled'
  }));

  // 12. Reading Lists
  const readingListRows = await db.select().from(readingLists).where(activeResourceCondition("lecturer", readingLists.lecturerId));
  const readingListBookRows = await db.select().from(readingListBooks).where(activeResourceCondition("book", readingListBooks.bookId));
  dbState.readingLists = readingListRows.map(rl => ({
    id: rl.id,
    subjectCode: rl.subjectCode,
    lecturerId: rl.lecturerId,
    notes: rl.notes ?? "",
    bookIds: readingListBookRows.filter(b => b.readingListId === rl.id).map(b => b.bookId)
  }));

  // 13. Book Reviews
  const bookReviewRows = await db.select().from(bookReviews).where(activeResourceCondition("book", bookReviews.bookId));
  dbState.bookReviews = bookReviewRows.map(br => ({
    id: br.id,
    bookId: br.bookId,
    studentId: br.studentId,
    studentName: br.studentName,
    rating: br.rating,
    comment: br.comment ?? "",
    date: br.date
  }));

  // 14. Book Requests
  const bookRequestRows = await db.select().from(bookRequests);
  dbState.bookRequests = bookRequestRows.map(br => ({
    id: br.id,
    title: br.title,
    author: br.author,
    isbn: br.isbn ?? undefined,
    suggestedBy: br.suggestedBy,
    suggestorRole: br.suggestorRole as 'student' | 'lecturer',
    date: br.date,
    reason: br.reason ?? undefined,
    status: br.status as 'pending' | 'approved' | 'rejected',
    adminFeedback: br.adminFeedback ?? undefined
  }));

  // 15. Exam Papers
  const examPaperRows = await db.select().from(examPapers);
  dbState.examPapers = examPaperRows.map(ep => ({
    id: ep.id,
    title: ep.title,
    subjectCode: ep.subjectCode,
    year: ep.year,
    semester: ep.semester,
    examType: ep.examType as 'Midterm' | 'Final' | 'National Exam (KCSE/IGCSE)',
    downloadUrl_aid: ep.downloadUrl,
    downloadsCount: ep.downloadsCount
  }));

  // 16. Teacher Resources
  const resourceRows = await db.select().from(teacherResources);
  dbState.teacherResources = resourceRows.map(tr => ({
    id: tr.id,
    name: tr.name,
    category: tr.category as 'Instructional Guide' | 'Lab Manual' | 'Hardware/Projector' | 'Scientific Kit',
    serialNo: tr.serialNo,
    status: tr.status as 'available' | 'reserved',
    reservedByLecturerId: tr.reservedByLecturerId ?? undefined,
    reservedByLecturerName: tr.reservedByLecturerName ?? undefined,
    reservationDate: tr.reservationDate ?? undefined
  }));

  // 17. Library Gate Logs
  const gateLogRows = await db.select().from(libraryGateLogs);
  dbState.libraryGateLogs = gateLogRows.map(gl => ({
    id: gl.id,
    timestamp: gl.timestamp,
    patronName: gl.patronName,
    patronId: gl.patronId,
    role: gl.role as 'student' | 'lecturer',
    authMethod: gl.authMethod as 'biometric_fingerprint' | 'biometric_facial' | 'rfid_tap',
    gateAction: gl.gateAction as 'Entry' | 'Exit',
    status: 'success'
  }));

  // 18. Notifications
  const notificationRows = await db.select().from(notifications);
  dbState.notifications = notificationRows.map(n => ({
    id: n.id,
    targetUserId: n.targetUserId ?? undefined,
    targetUserRole: n.targetUserRole as 'student' | 'lecturer' | 'accountant' | 'librarian' | 'admin' | 'all',
    type: n.type as 'library' | 'payment' | 'announcement',
    title: n.title,
    message: n.message,
    status: n.status as 'unread' | 'read',
    dateTime: n.dateTime
  }));

  // 19. Password Reset Requests
  const pwdReqRows = await db.select().from(passwordResetRequests);
  dbState.passwordResetRequests = pwdReqRows.map(pr => ({
    id: pr.id,
    userId: pr.userId,
    name: pr.name,
    email: pr.email,
    role: pr.role as 'student' | 'lecturer' | 'accountant' | 'librarian' | 'admin',
    date: pr.date,
    reason: pr.reason,
    status: pr.status as 'pending' | 'resolved' | 'rejected',
    adminFeedback: pr.adminFeedback ?? undefined,
    temporaryPasscode: pr.temporaryPasscode ?? undefined
  }));

  return dbState;
}

function toUuid(str: any): any {
  if (typeof str !== 'string') return str;
  // If it's already a valid UUID, return it
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) {
    return str.toLowerCase();
  }
  // Deterministic MD5 hash to produce a 32-character hex string
  const hash = crypto.createHash('md5').update(str).digest('hex');
  // Format as 8-4-4-4-12
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

// Recursively traverse and convert all ID fields to valid UUIDs
export function sanitizeStateIds(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeStateIds);
  }
  if (typeof obj === 'object') {
    const res: any = {};
    const idKeys = new Set([
      'id', 'courseId', 'studentId', 'lecturerId', 'patronId', 
      'bookId', 'readingListId', 'invoiceId', 'targetUserId', 
      'userId', 'reservedByLecturerId'
    ]);
    for (const [key, val] of Object.entries(obj)) {
      if (idKeys.has(key) && typeof val === 'string' && val.trim() !== '') {
        res[key] = toUuid(val);
      } else {
        res[key] = sanitizeStateIds(val);
      }
    }
    return res;
  }
  return obj;
}

let isSavingFullState = false;
let pendingSaveState: any = null;
let saveTimeout: any = null;
let lastSaveTime = 0;
const DEBOUNCE_DELAY = 3000;
const THROTTLE_LIMIT = 5000;

let syncFailureCount = 0;
let isSyncPausedUntil = 0;

function isTransientDbError(err: any): boolean {
  if (!err) return false;
  const msg = (err.message || err.toString() || '').toLowerCase();
  const code = err.code || err.errno;

  const transientCodes = [
    'ETIMEDOUT', 'ECONNRESET', 'EPIPE', '57P01', '57P02',
    '08006', '08003', '08001', '08004', '57000', -110
  ];
  if (transientCodes.includes(code)) return true;

  const transientPhrases = [
    'connection terminated',
    'connection timeout',
    'connection terminated unexpectedly',
    'timeout',
    'socket hang up',
    'terminating connection',
    'could not connect',
    'drizzlequeryerror',
    'econnreset',
    'etimedout'
  ];

  return transientPhrases.some(phrase => msg.includes(phrase));
}

async function performDatabaseSync(dbState: any): Promise<void> {
  isSavingFullState = true;
  lastSaveTime = Date.now();

  const maxAttempts = 3;
  let attempt = 0;

  try {
    while (attempt < maxAttempts) {
      attempt++;
      try {
        const tx = db;
        // await db.transaction(async (tx) => {
        // 1. Courses
    if (dbState.courses) {
      // State sync is upsert-only: omitted IDs may be archived records.
      for (const c of dbState.courses) {
        const val = {
          id: c.id,
          code: c.code,
          title: c.title,
          description: c.description || null,
          duration: c.duration,
          fees: String(c.fees || 0),
          thumbnail: c.thumbnail || null,
          active: c.active !== false,
          faculty: c.faculty || "School of Computing"
        };
        await tx.insert(courses).values(val).onConflictDoUpdate({
          target: courses.id,
          set: val
        });
      }
    }

    // 2. Course Reviews (dbState.reviews)
    if (dbState.reviews) {
      const ids = dbState.reviews.map((r: any) => r.id).filter(Boolean);
      if (ids.length > 0) {
        await tx.delete(courseReviews).where(notInArray(courseReviews.id, ids));
      } else {
        await tx.delete(courseReviews);
      }
      for (const r of dbState.reviews) {
        const val = {
          id: r.id,
          courseId: r.courseId || null,
          studentId: r.studentId,
          studentName: r.studentName,
          rating: Number(r.rating) || 5,
          comment: r.comment || null,
          date: r.date || new Date().toISOString().split('T')[0]
        };
        await tx.insert(courseReviews).values(val).onConflictDoUpdate({
          target: courseReviews.id,
          set: val
        });
      }
    }

    // 3. Lecturers
    if (dbState.lecturers) {
      for (const l of dbState.lecturers) {
        const lecturerVal = {
          id: l.id,
          name: l.name,
          email: l.email,
          phone: l.phone,
          hourlyRate: String(l.hourlyRate || 0),
          loggedHours: String(l.loggedHours || 0),
          bankDetails: l.bankDetails || null,
          contractLength: l.contractLength || "Permanent",
          designatorCode: l.designatorCode || `LEC-${Date.now()}`,
          bio: l.bio || null,
          avatar: l.avatar || null,
          isActive: l.isActive !== false,
          isAccountant: l.isAccountant === true,
          isLibrarian: l.isLibrarian === true,
        };
        await tx.insert(lecturers).values(lecturerVal).onConflictDoUpdate({
          target: lecturers.id,
          set: lecturerVal
        });

        await tx.delete(lecturerPublications).where(eq(lecturerPublications.lecturerId, l.id));
        if (l.publications) {
          for (const pub of l.publications) {
            await tx.insert(lecturerPublications).values({
              lecturerId: l.id,
              publicationText: pub
            });
          }
        }

        await tx.delete(lecturerResearchInterests).where(eq(lecturerResearchInterests.lecturerId, l.id));
        if (l.researchInterests) {
          for (const res of l.researchInterests) {
            await tx.insert(lecturerResearchInterests).values({
              lecturerId: l.id,
              interestText: res
            });
          }
        }

        await tx.delete(lecturerSubjects).where(eq(lecturerSubjects.lecturerId, l.id));
        if (l.subjects) {
          for (const sub of l.subjects) {
            await tx.insert(lecturerSubjects).values({
              lecturerId: l.id,
              subjectCode: sub
            });
          }
        }

        const slotIds = (l.officeHours || []).map((s: any) => s.id).filter(Boolean);
        if (slotIds.length > 0) {
          await tx.delete(officeHourSlots).where(and(eq(officeHourSlots.lecturerId, l.id), notInArray(officeHourSlots.id, slotIds)));
        } else {
          await tx.delete(officeHourSlots).where(eq(officeHourSlots.lecturerId, l.id));
        }
        for (const s of (l.officeHours || [])) {
          const slotVal = {
            id: s.id,
            lecturerId: l.id,
            day: s.day,
            timeSlot: s.time,
            status: s.status || 'available',
            studentId: s.studentId || null,
            studentName: s.studentName || null,
            studentEmail: s.studentEmail || null,
            studentNotes: s.studentNotes || null
          };
          await tx.insert(officeHourSlots).values(slotVal).onConflictDoUpdate({
            target: officeHourSlots.id,
            set: slotVal
          });
        }
      }
    }

    // 4. Students
    if (dbState.students) {
      for (const s of dbState.students) {
        const studentVal = {
          id: s.id,
          name: s.name,
          email: s.email,
          phone: s.phone,
          admissionNo: s.admissionNo,
          cohort: s.cohort,
          programme: s.programme || null,
          department: s.department || null,
          avatar: s.avatar || null,
          accountStatus: s.accountStatus || "Active",
        };
        await tx.insert(students).values(studentVal).onConflictDoUpdate({
          target: students.id,
          set: studentVal
        });

        await tx.delete(studentEnrollments).where(eq(studentEnrollments.studentId, s.id));
        if (s.enrolledUnits) {
          for (const code of s.enrolledUnits) {
            await tx.insert(studentEnrollments).values({
              studentId: s.id,
              courseCode: code
            });
          }
        }

        await tx.delete(grades).where(eq(grades.studentId, s.id));
        if (s.grades) {
          for (const [subjCode, gr] of Object.entries(s.grades)) {
            const g = gr as { cat: number; exam: number };
            await tx.insert(grades).values({
              studentId: s.id,
              subjectCode: subjCode,
              catScore: String(g.cat || 0),
              examScore: String(g.exam || 0)
            });
          }
        }

        const invoiceIds = (s.ledger || []).map((i: any) => i.id).filter(Boolean);
        if (invoiceIds.length > 0) {
          await tx.delete(invoices).where(and(eq(invoices.studentId, s.id), notInArray(invoices.id, invoiceIds)));
        } else {
          await tx.delete(invoices).where(eq(invoices.studentId, s.id));
        }
        for (const inv of (s.ledger || [])) {
          const invVal = {
            id: inv.id,
            studentId: s.id,
            invoiceNo: inv.invoiceNo,
            description: inv.description,
            amount: String(inv.amount || 0),
            date: inv.date || new Date().toISOString().split('T')[0],
            status: inv.status || 'unpaid'
          };
          await tx.insert(invoices).values(invVal).onConflictDoUpdate({
            target: invoices.id,
            set: invVal
          });
        }

        const paymentIds = (s.payments || []).map((p: any) => p.id).filter(Boolean);
        if (paymentIds.length > 0) {
          await tx.delete(payments).where(and(eq(payments.studentId, s.id), notInArray(payments.id, paymentIds)));
        } else {
          await tx.delete(payments).where(eq(payments.studentId, s.id));
        }
        for (const p of (s.payments || [])) {
          const payVal = {
            id: p.id,
            studentId: s.id,
            invoiceId: p.invoiceId || null,
            amount: String(p.amount || 0),
            paymentMethod: p.paymentMethod,
            transactionId: p.transactionId,
            date: p.date || new Date().toISOString().split('T')[0],
            status: p.status || 'unreconciled'
          };
          await tx.insert(payments).values(payVal).onConflictDoUpdate({
            target: payments.id,
            set: payVal
          });
        }

        await tx.delete(studentAttendance).where(eq(studentAttendance.studentId, s.id));
        if (s.attendance) {
          for (const [subjCode, rate] of Object.entries(s.attendance)) {
            await tx.insert(studentAttendance).values({
              studentId: s.id,
              subjectCode: subjCode,
              attendanceRate: Number(rate) || 100
            });
          }
        }
      }
    }

    // 5. Expenses
    if (dbState.expenses) {
      const ids = dbState.expenses.map((e: any) => e.id).filter(Boolean);
      if (ids.length > 0) {
        await tx.delete(expenses).where(notInArray(expenses.id, ids));
      } else {
        await tx.delete(expenses);
      }
      for (const e of dbState.expenses) {
        const val = {
          id: e.id,
          description: e.description,
          category: e.category,
          amount: String(e.amount || 0),
          date: e.date || new Date().toISOString().split('T')[0]
        };
        await tx.insert(expenses).values(val).onConflictDoUpdate({
          target: expenses.id,
          set: val
        });
      }
    }

    // 6. Inventory (Stock Items)
    if (dbState.inventory) {
      const ids = dbState.inventory.map((i: any) => i.id).filter(Boolean);
      if (ids.length > 0) {
        await tx.delete(stockItems).where(notInArray(stockItems.id, ids));
      } else {
        await tx.delete(stockItems);
      }
      for (const i of dbState.inventory) {
        const val = {
          id: i.id,
          name: i.name,
          quantity: Number(i.quantity) || 0,
          category: i.category,
          location: i.location,
          lowestThreshold: Number(i.lowestThreshold) || 5
        };
        await tx.insert(stockItems).values(val).onConflictDoUpdate({
          target: stockItems.id,
          set: val
        });
      }
    }

    // 7. Requisitions
    if (dbState.requisitions) {
      const ids = dbState.requisitions.map((r: any) => r.id).filter(Boolean);
      if (ids.length > 0) {
        await tx.delete(requisitions).where(notInArray(requisitions.id, ids));
      } else {
        await tx.delete(requisitions);
      }
      for (const r of dbState.requisitions) {
        const val = {
          id: r.id,
          itemName: r.itemName,
          quantity: Number(r.quantity) || 1,
          staffName: r.staffName,
          date: r.date || new Date().toISOString().split('T')[0],
          status: r.status || 'pending'
        };
        await tx.insert(requisitions).values(val).onConflictDoUpdate({
          target: requisitions.id,
          set: val
        });
      }
    }

    // 8. Testimonies
    if (dbState.testimonies) {
      const ids = dbState.testimonies.map((t: any) => t.id).filter(Boolean);
      if (ids.length > 0) {
        await tx.delete(testimonies).where(notInArray(testimonies.id, ids));
      } else {
        await tx.delete(testimonies);
      }
      for (const t of dbState.testimonies) {
        const val = {
          id: t.id,
          name: t.name,
          role: t.role,
          content: t.content,
          avatar: t.avatar || null
        };
        await tx.insert(testimonies).values(val).onConflictDoUpdate({
          target: testimonies.id,
          set: val
        });
      }
    }

    // 9. Books
    if (dbState.books) {
      for (const b of dbState.books) {
        const val = {
          id: b.id,
          title: b.title,
          author: b.author,
          isbn: b.isbn || `ISBN-${Date.now()}`,
          publisher: b.publisher || null,
          edition: b.edition || null,
          purchasePrice: String(b.purchasePrice || 0),
          rackNumber: b.rackNumber || 'N/A',
          shelfRow: b.shelfRow || 'N/A',
          libraryCode: b.libraryCode || `LIB-${Date.now()}`,
          type: b.type || 'Physical Book',
          eUrl: b.eUrl_aid || null,
          copiesTotal: Number(b.copiesTotal) || 1,
          copiesAvailable: Number(b.copiesAvailable) || 1,
          category: b.category
        };
        await tx.insert(books).values(val).onConflictDoUpdate({
          target: books.id,
          set: val
        });
      }
    }

    // 10. Loans
    if (dbState.loans) {
      const ids = dbState.loans.map((l: any) => l.id).filter(Boolean);
      if (ids.length > 0) {
        await tx.delete(loans).where(notInArray(loans.id, ids));
      } else {
        await tx.delete(loans);
      }
      for (const l of dbState.loans) {
        const val = {
          id: l.id,
          bookId: l.bookId,
          bookTitle: l.bookTitle || 'N/A',
          patronId: l.patronId,
          patronName: l.patronName || 'N/A',
          patronRole: l.patronRole || 'student',
          checkoutDate: l.checkoutDate || new Date().toISOString().split('T')[0],
          dueDate: l.dueDate || new Date().toISOString().split('T')[0],
          returnDate: l.returnDate || null,
          status: l.status || 'borrowed',
          lateFeeAssessed: String(l.lateFeeAssessed || 0)
        };
        await tx.insert(loans).values(val).onConflictDoUpdate({
          target: loans.id,
          set: val
        });
      }
    }

    // 11. Reservations
    if (dbState.reservations) {
      const ids = dbState.reservations.map((r: any) => r.id).filter(Boolean);
      if (ids.length > 0) {
        await tx.delete(reservations).where(notInArray(reservations.id, ids));
      } else {
        await tx.delete(reservations);
      }
      for (const r of dbState.reservations) {
        const val = {
          id: r.id,
          bookId: r.bookId,
          bookTitle: r.bookTitle || 'N/A',
          patronId: r.patronId,
          patronName: r.patronName || 'N/A',
          reservationDate: r.reservationDate || new Date().toISOString().split('T')[0],
          status: r.status || 'pending'
        };
        await tx.insert(reservations).values(val).onConflictDoUpdate({
          target: reservations.id,
          set: val
        });
      }
    }

    // 12. Reading Lists
    if (dbState.readingLists) {
      const ids = dbState.readingLists.map((rl: any) => rl.id).filter(Boolean);
      if (ids.length > 0) {
        await tx.delete(readingLists).where(notInArray(readingLists.id, ids));
      } else {
        await tx.delete(readingLists);
      }
      for (const rl of dbState.readingLists) {
        const val = {
          id: rl.id,
          subjectCode: rl.subjectCode,
          lecturerId: rl.lecturerId,
          notes: rl.notes || null
        };
        await tx.insert(readingLists).values(val).onConflictDoUpdate({
          target: readingLists.id,
          set: val
        });

        await tx.delete(readingListBooks).where(eq(readingListBooks.readingListId, rl.id));
        if (rl.bookIds) {
          for (const bId of rl.bookIds) {
            await tx.insert(readingListBooks).values({
              readingListId: rl.id,
              bookId: bId
            });
          }
        }
      }
    }

    // 13. Book Reviews
    if (dbState.bookReviews) {
      const ids = dbState.bookReviews.map((br: any) => br.id).filter(Boolean);
      if (ids.length > 0) {
        await tx.delete(bookReviews).where(notInArray(bookReviews.id, ids));
      } else {
        await tx.delete(bookReviews);
      }
      for (const br of dbState.bookReviews) {
        const val = {
          id: br.id,
          bookId: br.bookId,
          studentId: br.studentId,
          studentName: br.studentName,
          rating: Number(br.rating) || 5,
          comment: br.comment || null,
          date: br.date || new Date().toISOString().split('T')[0]
        };
        await tx.insert(bookReviews).values(val).onConflictDoUpdate({
          target: bookReviews.id,
          set: val
        });
      }
    }

    // 14. Book Requests
    if (dbState.bookRequests) {
      const ids = dbState.bookRequests.map((br: any) => br.id).filter(Boolean);
      if (ids.length > 0) {
        await tx.delete(bookRequests).where(notInArray(bookRequests.id, ids));
      } else {
        await tx.delete(bookRequests);
      }
      for (const br of dbState.bookRequests) {
        const val = {
          id: br.id,
          title: br.title,
          author: br.author,
          isbn: br.isbn || null,
          suggestedBy: br.suggestedBy,
          suggestorRole: br.suggestorRole,
          date: br.date || new Date().toISOString().split('T')[0],
          reason: br.reason || null,
          status: br.status || 'pending',
          adminFeedback: br.adminFeedback || null
        };
        await tx.insert(bookRequests).values(val).onConflictDoUpdate({
          target: bookRequests.id,
          set: val
        });
      }
    }

    // 15. Exam Papers
    if (dbState.examPapers) {
      const ids = dbState.examPapers.map((ep: any) => ep.id).filter(Boolean);
      if (ids.length > 0) {
        await tx.delete(examPapers).where(notInArray(examPapers.id, ids));
      } else {
        await tx.delete(examPapers);
      }
      for (const ep of dbState.examPapers) {
        const val = {
          id: ep.id,
          title: ep.title,
          subjectCode: ep.subjectCode,
          year: Number(ep.year) || 2026,
          semester: ep.semester,
          examType: ep.examType,
          downloadUrl: ep.downloadUrl_aid,
          downloadsCount: Number(ep.downloadsCount) || 0
        };
        await tx.insert(examPapers).values(val).onConflictDoUpdate({
          target: examPapers.id,
          set: val
        });
      }
    }

    // 16. Teacher Resources
    if (dbState.teacherResources) {
      const ids = dbState.teacherResources.map((tr: any) => tr.id).filter(Boolean);
      if (ids.length > 0) {
        await tx.delete(teacherResources).where(notInArray(teacherResources.id, ids));
      } else {
        await tx.delete(teacherResources);
      }
      for (const tr of dbState.teacherResources) {
        const val = {
          id: tr.id,
          name: tr.name,
          category: tr.category,
          serialNo: tr.serialNo,
          status: tr.status || 'available',
          reservedByLecturerId: tr.reservedByLecturerId || null,
          reservedByLecturerName: tr.reservedByLecturerName || null,
          reservationDate: tr.reservationDate || null
        };
        await tx.insert(teacherResources).values(val).onConflictDoUpdate({
          target: teacherResources.id,
          set: val
        });
      }
    }

    // 17. Library Gate Logs
    if (dbState.libraryGateLogs) {
      const ids = dbState.libraryGateLogs.map((gl: any) => gl.id).filter(Boolean);
      if (ids.length > 0) {
        await tx.delete(libraryGateLogs).where(notInArray(libraryGateLogs.id, ids));
      } else {
        await tx.delete(libraryGateLogs);
      }
      for (const gl of dbState.libraryGateLogs) {
        const ts = gl.timestamp ? new Date(gl.timestamp).toISOString() : new Date().toISOString();
        const val = {
          id: gl.id,
          timestamp: ts,
          patronName: gl.patronName,
          patronId: gl.patronId || '00000000-0000-0000-0000-000000000000',
          role: gl.role || 'student',
          authMethod: gl.authMethod || 'rfid_tap',
          gateAction: gl.gateAction || 'Entry'
        };
        await tx.insert(libraryGateLogs).values(val).onConflictDoUpdate({
          target: libraryGateLogs.id,
          set: val
        });
      }
    }

    // 18. Notifications
    if (dbState.notifications) {
      const ids = dbState.notifications.map((n: any) => n.id).filter(Boolean);
      if (ids.length > 0) {
        await tx.delete(notifications).where(notInArray(notifications.id, ids));
      } else {
        await tx.delete(notifications);
      }
      for (const n of dbState.notifications) {
        const val = {
          id: n.id,
          targetUserId: n.targetUserId || null,
          targetUserRole: n.targetUserRole || 'all',
          type: n.type || 'announcement',
          title: n.title,
          message: n.message,
          status: n.status || 'unread',
          dateTime: n.dateTime ? new Date(n.dateTime).toISOString() : new Date().toISOString()
        };
        await tx.insert(notifications).values(val).onConflictDoUpdate({
          target: notifications.id,
          set: val
        });
      }
    }

    // 19. Password Reset Requests
    if (dbState.passwordResetRequests) {
      const ids = dbState.passwordResetRequests.map((pr: any) => pr.id).filter(Boolean);
      if (ids.length > 0) {
        await tx.delete(passwordResetRequests).where(notInArray(passwordResetRequests.id, ids));
      } else {
        await tx.delete(passwordResetRequests);
      }
      for (const pr of dbState.passwordResetRequests) {
        const val = {
          id: pr.id,
          userId: pr.userId,
          name: pr.name,
          email: pr.email,
          role: pr.role,
          date: pr.date || new Date().toISOString().split('T')[0],
          reason: pr.reason,
          status: pr.status || 'pending',
          adminFeedback: pr.adminFeedback || null,
          temporaryPasscode: pr.temporaryPasscode || null
        };
        await tx.insert(passwordResetRequests).values(val).onConflictDoUpdate({
          target: passwordResetRequests.id,
          set: val
        });
      }
    }

    // Persist system_state snapshot
    await tx.insert(systemState)
      .values({
        id: 1,
        data: dbState,
      })
      .onConflictDoUpdate({
        target: systemState.id,
        set: {
          data: dbState,
          updatedAt: new Date().toISOString(),
        },
      });

    syncFailureCount = 0; // Reset on successful write
        break; // Exit retry loop on successful completion
      } catch (err: any) {
        const isTransient = isTransientDbError(err);
        if (isTransient && attempt < maxAttempts) {
          const retryDelay = Math.pow(2, attempt - 1) * 1000;
          console.warn(`[DB Sync] Transient DB disconnect/timeout on attempt ${attempt}/${maxAttempts} (${err?.message || err}). Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }

        syncFailureCount++;
        const backoffDelay = Math.min(30000 * Math.pow(2, syncFailureCount - 1), 300000);
        isSyncPausedUntil = Date.now() + backoffDelay;
        console.error(`[DB TUNER] Relational database synchronization failed (${syncFailureCount} consecutive failures). Pausing database writes for ${backoffDelay / 1000} seconds. Error:`, err);
        throw err;
      }
    }
  } finally {
    isSavingFullState = false;
    if (pendingSaveState) {
      const nextState = pendingSaveState;
      pendingSaveState = null;
      const timeSinceLastSave = Date.now() - lastSaveTime;
      const delay = Math.max(0, DEBOUNCE_DELAY - timeSinceLastSave);
      saveTimeout = setTimeout(() => {
        performDatabaseSync(nextState).catch(err => {
          console.error("[DB TUNER] Failed to run queued performDatabaseSync:", err);
        });
      }, delay);
    }
  }
}

export async function saveFullDatabaseState(dbState: any): Promise<void> {
  if (Date.now() < isSyncPausedUntil) {
    // Silently bypass sync writes during backoff pause period
    return;
  }
  dbState = sanitizeStateIds(dbState);
  pendingSaveState = dbState;

  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  if (isSavingFullState) {
    return;
  }

  const timeSinceLastSave = Date.now() - lastSaveTime;
  if (timeSinceLastSave >= THROTTLE_LIMIT) {
    const nextState = pendingSaveState;
    pendingSaveState = null;
    performDatabaseSync(nextState).catch(err => {
      console.error("[DB TUNER] Failed to run throttled database synchronization:", err);
    });
  } else {
    const nextState = pendingSaveState;
    pendingSaveState = null;
    saveTimeout = setTimeout(() => {
      performDatabaseSync(nextState).catch(err => {
        console.error("[DB TUNER] Failed to run debounced database synchronization:", err);
      });
    }, DEBOUNCE_DELAY);
  }
}

// Helper to initialize database state directly from PostgreSQL
async function initPostgresDB() {
  try {
    if (!process.env.DATABASE_URL && (!process.env.SQL_HOST || !process.env.SQL_PASSWORD || !process.env.SQL_USER || !process.env.SQL_DB_NAME)) {
      throw new Error("Missing database environment variables (DATABASE_URL or SQL_HOST, SQL_PASSWORD, SQL_USER, or SQL_DB_NAME). Please configure your local .env file.");
    }
    cachedDb = await loadFullDatabaseState();
    console.log("Successfully loaded database state from PostgreSQL!");
  } catch (err) {
    console.error("Failed to initialize PostgreSQL DB state:", err);
    if (fs.existsSync(DB_FILE)) {
      try {
        const content = fs.readFileSync(DB_FILE, "utf-8");
        cachedDb = JSON.parse(content);
        console.log("Fallback: Loaded database state from local db_store.json!");
      } catch (e) {
        console.error("Error reading db_store.json", e);
        cachedDb = null;
      }
    } else {
      cachedDb = null;
    }
  }
}

// Helper to retrieve database state
function getDatabase() {
  if (cachedDb && typeof cachedDb === 'object' && Object.keys(cachedDb).length > 0) {
    return cachedDb;
  }
  // Fallback if not initialized yet or empty
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      cachedDb = JSON.parse(content);
      return cachedDb;
    } catch (e) {
      console.error("Error reading db_store.json", e);
    }
  }
  return cachedDb || {};
}

/**
 * Drops the obsolete `passcode` field from profile records before anything is persisted.
 * Authentication moved to the `users` table and the column was dropped from `students` /
 * `lecturers`, so a stray passcode is only a way to leak or resurrect a stale credential.
 */
function stripLegacyProfilePasscodes(dbState: any) {
  if (!dbState) return dbState;
  for (const key of ['students', 'lecturers']) {
    if (Array.isArray(dbState[key])) {
      dbState[key] = dbState[key].map((record: any) => {
        if (record && 'passcode' in record) {
          const { passcode: _legacyPasscode, ...rest } = record;
          return rest;
        }
        return record;
      });
    }
  }
  return dbState;
}

// Helper to save database state
function saveDatabase(dbState: any) {
  // Credentials live exclusively in the `users` table; the profile tables no longer carry
  // a `passcode` column, so nothing password-related is hashed or persisted from here.
  dbState = stripLegacyProfilePasscodes(dbState);
  dbState = sanitizeStateIds(dbState);
  cachedDb = dbState;
  
  // Persist asynchronously via throttled/debounced database sync
  saveFullDatabaseState(dbState)
    .catch((err) => {
      console.error("Failed to persist updated state to PostgreSQL:", err);
    });

  // Keep db_store.json as a secondary local fallback
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), "utf-8");
  } catch (e) {
    console.error("Error writing fallback db_store.json", e);
  }
  return true;
}


// Role-Based Access Control (RBAC) Protection Middleware
function checkRBAC(allowedRoles: string[]) {
  return (req: any, res: any, next: any) => {
    // The global /api middleware verifies the JWT before protected routes run.
    // Never authorize this action from a client-controlled role header.
    const userRole = req.user?.role;

    if (!userRole) {
      return res.status(403).json({
        success: false,
        error: "Access Denied: Authentication required.",
        code: "RBAC_UNAUTHENTICATED",
        allowedRoles,
      });
    }

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: `Access Denied: Users with role '${userRole}' are not permitted to access this resource.`,
        code: "RBAC_FORBIDDEN_ROLE",
        allowedRoles,
      });
    }

    next();
  };
}

/** Teaching-safe student DTO — never includes passwords, ledger lines, or auth identifiers. */
function buildLecturerStudentLookupView(params: {
  student: typeof students.$inferSelect;
  enrollments: Array<{ courseCode: string }>;
  gradeRows: Array<{ subjectCode: string; catScore: string | null; examScore: string | null; gradedAt: string | null }>;
  attendanceRows: Array<{ subjectCode: string; attendanceRate: number }>;
  courseRows: Array<{ code: string; title: string; faculty: string }>;
  invoiceRows: Array<{ status: string; amount: string | null }>;
  advisorNotes: Array<{ id: string; day: string; timeSlot: string; notes: string; lecturerName?: string }>;
  taughtSubjectCodes: string[];
  semesterFromDb: string | null;
}) {
  const {
    student,
    enrollments,
    gradeRows,
    attendanceRows,
    courseRows,
    invoiceRows,
    advisorNotes,
    taughtSubjectCodes,
    semesterFromDb,
  } = params;

  const courseByCode = new Map(courseRows.map((c) => [c.code, c]));
  const enrolledUnits = enrollments.map((e) => e.courseCode);

  const facultyCounts = new Map<string, number>();
  for (const code of enrolledUnits) {
    const faculty = courseByCode.get(code)?.faculty;
    if (faculty) facultyCounts.set(faculty, (facultyCounts.get(faculty) || 0) + 1);
  }
  let department: string | null = null;
  let maxFaculty = 0;
  for (const [faculty, count] of facultyCounts) {
    if (count > maxFaculty) {
      maxFaculty = count;
      department = faculty;
    }
  }

  const markToGpa = (mark: number): number => {
    if (mark >= 70) return 4.0;
    if (mark >= 60) return 3.0;
    if (mark >= 50) return 2.0;
    if (mark >= 40) return 1.0;
    return 0.0;
  };

  const gpaStanding = (gpa: number): string => {
    if (gpa >= 3.7) return "Excellent";
    if (gpa >= 3.0) return "Good";
    if (gpa >= 2.0) return "Satisfactory";
    if (gpa > 0) return "At Risk";
    return "N/A";
  };

  const letterFromTotal = (total: number): string => {
    if (total >= 70) return "A";
    if (total >= 60) return "B";
    if (total >= 50) return "C";
    if (total >= 40) return "D";
    return "F";
  };

  let gpa: number | null = null;
  let academicStanding = "N/A";
  if (gradeRows.length > 0) {
    const total = gradeRows.reduce((sum, g) => {
      const mark = Number(g.catScore || 0) + Number(g.examScore || 0);
      return sum + markToGpa(mark);
    }, 0);
    gpa = Number((total / gradeRows.length).toFixed(2));
    academicStanding = gpaStanding(gpa);
  }

  const attendanceByCode = new Map(
    attendanceRows.map((a) => [a.subjectCode, Number(a.attendanceRate)])
  );
  const gradesByCode = new Map(
    gradeRows.map((g) => [
      g.subjectCode,
      {
        cat: Number(g.catScore || 0),
        exam: Number(g.examScore || 0),
        gradedAt: g.gradedAt || undefined,
      },
    ])
  );

  const registeredUnits = enrolledUnits.map((code) => {
    const course = courseByCode.get(code);
    const grade = gradesByCode.get(code);
    const total = grade ? grade.cat + grade.exam : null;
    return {
      code,
      title: course?.title || code,
      faculty: course?.faculty || null,
      isMyClass: taughtSubjectCodes.includes(code),
      attendanceRate: attendanceByCode.has(code) ? attendanceByCode.get(code)! : null,
      grade: grade
        ? {
            cat: grade.cat,
            exam: grade.exam,
            total: total as number,
            letter: letterFromTotal(total as number),
            gradedAt: grade.gradedAt,
          }
        : null,
    };
  });

  const outstanding = invoiceRows
    .filter((i) => i.status === "unpaid")
    .reduce((sum, i) => sum + Number(i.amount || 0), 0);
  const financeStatus: "Finance Cleared" | "Finance Hold" =
    outstanding > 0 ? "Finance Hold" : "Finance Cleared";

  // Year of study from cohort year when present (e.g. "2024 Intake") — cohort is stored in PostgreSQL
  const cohortYearMatch = String(student.cohort || "").match(/(20\d{2})/);
  const cohortYear = cohortYearMatch ? Number(cohortYearMatch[1]) : null;
  const currentYear = new Date().getFullYear();
  const yearOfStudy =
    cohortYear && cohortYear <= currentYear
      ? Math.min(Math.max(1, currentYear - cohortYear + 1), 6)
      : null;

  return {
    id: student.id,
    name: student.name,
    admissionNo: student.admissionNo,
    avatar: student.avatar || null,
    cohort: student.cohort,
    course: department || student.cohort || "Undergraduate Programme",
    department: department,
    yearOfStudy,
    semester: semesterFromDb,
    financeStatus,
    gpa,
    academicStanding,
    registeredUnits,
    advisorNotes,
  };
}

async function isArchivedSessionIdentity(decoded: any): Promise<boolean> {
  const role = String(decoded?.role || "");
  const profileId = String(decoded?.roleId || decoded?.userId || "");
  const email = String(decoded?.email || "").toLowerCase();
  const profileType = role === "student" ? "student"
    : ["lecturer", "accountant", "librarian"].includes(role) ? "lecturer"
    : "";
  const result = await db.execute(sql`
    SELECT 1
    FROM archive_records ar
    WHERE (${profileType} <> '' AND ar.resource_type = ${profileType} AND ar.resource_id = ${profileId})
       OR (
         ar.resource_type = 'user'
         AND ar.resource_id = (
           SELECT u.id::text FROM users u WHERE LOWER(u.email) = ${email} LIMIT 1
         )
       )
    LIMIT 1
  `);
  return result.rows.length > 0;
}

function parseCookies(req: any): Record<string, string> {
  const list: Record<string, string> = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach((cookie: string) => {
    let [name, ...rest] = cookie.split('=');
    name = name?.trim();
    if (!name) return;
    const value = rest.join('=').trim();
    if (!value) return;
    list[name] = decodeURIComponent(value);
  });
  return list;
}

// JWT Verification Middleware
async function authenticateJWT(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  let token = null;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    token = authHeader.substring(7);
  } else {
    token = req.headers['x-session-token'] || req.query.token;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Access Denied: Authentication token required. Please sign in."
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded.tokenType && decoded.tokenType !== 'access') {
      return res.status(401).json({
        success: false,
        error: "Access Denied: Invalid token type for API access."
      });
    }
    if (await isArchivedSessionIdentity(decoded)) {
      return res.status(403).json({
        success: false,
        error: "Access Denied: This account is archived. Please contact System Administrator.",
        code: "ACCOUNT_ARCHIVED",
      });
    }
    req.user = decoded;
    
    // Propagate role and ID to headers for downstream compatibility
    req.headers['x-user-role'] = decoded.role;
    req.headers['x-user-id'] = decoded.userId;
    
    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      error: "Access Denied: Invalid or expired authentication token."
    });
  }
}

// Public API endpoints bypass list
const publicAPIPaths = [
  "/api/health",
  "/api/auth/login",
  "/api/auth/refresh",
  // Forced first-login password changes happen before any token is issued, so this
  // endpoint cannot sit behind the JWT gate. It authenticates the caller itself by
  // verifying the current password before writing a new one.
  "/api/auth/change-password",
  "/api/auth/change-passcode",
  "/api/auth/reset-request",
  "/api/auth/reset-requests",
  "/api/data",
  "/api/courses",
  "/api/students"
];

// Mount JWT Protection Middleware globally across all /api routes except public endpoints
app.use("/api", (req: any, res: any, next: any) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  
  const pathWithoutQuery = req.path.split('?')[0];
  const fullPath = req.baseUrl + pathWithoutQuery;
  const relativePath = '/api' + pathWithoutQuery;
  
  // Lecturer student-lookup endpoints require JWT + RBAC (never public).
  const lecturerLookupProtected =
    relativePath.startsWith("/api/lecturer/student-lookup") ||
    relativePath.startsWith("/api/lecturer/students");
  const isProtectedStudentRegistrationRoute =
    relativePath === "/api/student/registered-units" ||
    relativePath === "/api/student-enrollments" ||
    relativePath.startsWith("/api/student-enrollments/");
  const isPublicStudentRoute =
    !isProtectedStudentRegistrationRoute &&
    (relativePath === "/api/student" || relativePath.startsWith("/api/student/"));
  const isPublicLecturerRoute =
    relativePath === "/api/lecturer" || relativePath.startsWith("/api/lecturer/");
  const isPublic =
    !lecturerLookupProtected &&
    (publicAPIPaths.includes(fullPath) ||
      publicAPIPaths.includes(relativePath) ||
      isPublicStudentRoute ||
      isPublicLecturerRoute);
  if (isPublic) {
    return next();
  }
  
  authenticateJWT(req, res, next);
});

// ==========================================
// CORE API ROUTE HANDLERS
// ==========================================

// 1. Healthcheck Endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// GET native PostgreSQL / Cloud SQL connection status
app.get("/api/postgres/status", async (req, res) => {
  try {
    const isConfigured = !!process.env.SQL_HOST;
    if (!isConfigured) {
      return res.json({
        success: false,
        status: "unconfigured",
        message: "Native PostgreSQL host (SQL_HOST) is not configured in the environment."
      });
    }

    // Try a simple select to test connection
    const result = await db.select().from(systemState).limit(1);
    res.json({
      success: true,
      status: "connected",
      message: "Successfully connected to managed Cloud SQL PostgreSQL instance using Drizzle ORM.",
      host: process.env.SQL_HOST,
      database: process.env.SQL_DB_NAME,
      user: process.env.SQL_USER,
      records: result.length
    });
  } catch (err: any) {
    console.error("Native PostgreSQL status check failed:", err);
    res.json({
      success: false,
      status: "error",
      error: err.message,
      message: "PostgreSQL connection attempt failed. Ensure database proxy is running and credentials are valid."
    });
  }
});

// =========================================================================
// SUPABASE REAL DATABASE ROUTE INTEGRATIONS
// =========================================================================

// GET all students from Supabase (joins grades table relational structure)
app.get("/api/supabase/students", async (req, res) => {
  try {
    const isPlaceholder = !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY || process.env.SUPABASE_URL.includes("placeholder");
    
    if (isPlaceholder) {
      return res.json({
        success: false,
        status: "unconfigured",
        message: "Supabase connection is running in simulation mode. Please configure SUPABASE_URL and SUPABASE_KEY in settings to fetch from your real database.",
        students: getDatabase().students || []
      });
    }

    // Query real Supabase tables
    const { data, error } = await supabase
      .from('students')
      .select('*, grades(*)');

    if (error) {
      console.error("Supabase students query error:", error);
      return res.status(500).json({
        success: false,
        error: error.message,
        details: error.details || "",
        message: "Error fetching data from Supabase. Ensure 'students' and 'grades' tables exist with correct relations."
      });
    }

    res.json({
      success: true,
      status: "connected",
      students: data
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all courses from Supabase
app.get("/api/supabase/courses", async (req, res) => {
  try {
    const isPlaceholder = !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY || process.env.SUPABASE_URL.includes("placeholder");
    
    if (isPlaceholder) {
      return res.json({
        success: false,
        status: "unconfigured",
        message: "Supabase connection is not configured.",
        courses: getDatabase().courses || []
      });
    }

    const { data, error } = await supabase.from('courses').select('*');
    if (error) throw error;

    res.json({
      success: true,
      status: "connected",
      courses: data
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET all lecturers from Supabase
app.get("/api/supabase/lecturers", async (req, res) => {
  try {
    const isPlaceholder = !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY || process.env.SUPABASE_URL.includes("placeholder");
    
    if (isPlaceholder) {
      const lecturersList = (getDatabase().lecturers || []).map((l: any) => {
        const { passcode, ...rest } = l;
        return rest;
      });
      return res.json({
        success: false,
        status: "unconfigured",
        message: "Supabase connection is not configured.",
        lecturers: lecturersList
      });
    }

    const { data, error } = await supabase
      .from('lecturers')
      .select('id, name, email, phone, hourly_rate, logged_hours, bank_details, contract_length, designator_code, bio, avatar, is_active, is_accountant, is_librarian');
    if (error) throw error;

    res.json({
      success: true,
      status: "connected",
      lecturers: data
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Seed/Sync current portal state to Supabase tables for fast bootstrapping
app.post("/api/supabase/sync", async (req, res) => {
  try {
    const isPlaceholder = !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY || process.env.SUPABASE_URL.includes("placeholder");
    
    if (isPlaceholder) {
      return res.status(400).json({
        success: false,
        message: "Sync failed: Supabase credentials are not configured yet."
      });
    }

    const dbState = getDatabase();

    // 1. Sync courses catalog
    if (dbState.courses && dbState.courses.length > 0) {
      const coursesToSync = dbState.courses.map((c: any) => ({
        code: c.code,
        title: c.title,
        description: c.description || "",
        duration: c.duration || "1 Semester",
        fees: Number(c.fees) || 0,
        thumbnail: c.thumbnail || "",
        faculty: c.faculty || "School of Computing",
        active: c.active !== false
      }));
      const { error: err } = await supabase.from('courses').upsert(coursesToSync, { onConflict: 'code' });
      if (err) throw new Error(`Courses sync error: ${err.message}`);
    }

    // 2. Sync lecturers
    if (dbState.lecturers && dbState.lecturers.length > 0) {
      const lecturersToSync = dbState.lecturers.map((l: any) => ({
        name: l.name,
        email: l.email,
        phone: l.phone || "+254711222333",
        hourly_rate: Number(l.hourlyRate || l.hourly_rate) || 3000,
        logged_hours: Number(l.loggedHours || l.logged_hours) || 0,
        bank_details: l.bankDetails || l.bank_details || "",
        contract_length: l.contractLength || l.contract_length || "Permanent",
        designator_code: l.designatorCode || l.designator_code || `LEC-${Math.floor(100 + Math.random() * 900)}`,
        bio: l.bio || "",
        avatar: l.avatar || "",
        is_active: l.isActive !== false
      }));
      const { error: err } = await supabase.from('lecturers').upsert(lecturersToSync, { onConflict: 'email' });
      if (err) throw new Error(`Lecturers sync error: ${err.message}`);
    }

    // 3. Sync students
    if (dbState.students && dbState.students.length > 0) {
      const studentsToSync = dbState.students.map((s: any) => ({
        name: s.name,
        email: s.email,
        phone: s.phone || "+254799000111",
        admission_no: s.admissionNo || s.admission_no || `ED-CS-2026-${Math.floor(100 + Math.random() * 900)}`,
        cohort: s.cohort || "2026 Cohort",
        avatar: s.avatar || ""
      }));
      const { error: err } = await supabase.from('students').upsert(studentsToSync, { onConflict: 'email' });
      if (err) throw new Error(`Students sync error: ${err.message}`);
    }

    res.json({
      success: true,
      message: "Successfully synchronized Courses, Lecturers, and Students catalog into Supabase! Relational state matches perfectly."
    });
  } catch (err: any) {
    console.error("Supabase sync failed:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Profile loader helper function
async function getProfileForUser(role: string, roleId: string | null, email: string) {
  const fullDb = getDatabase();
  if (role === "student") {
    const student = (fullDb.students || []).find((s: any) =>
      s.id === roleId || s.admissionNo?.toLowerCase() === roleId?.toLowerCase() || s.email?.toLowerCase() === email.toLowerCase()
    );
    return sanitizeProfile(student);
  }
  if (["lecturer", "accountant", "librarian"].includes(role)) {
    const lecturer = (fullDb.lecturers || []).find((l: any) =>
      l.id === roleId || l.designatorCode?.toLowerCase() === roleId?.toLowerCase() || l.email?.toLowerCase() === email.toLowerCase()
    );
    return sanitizeProfile(lecturer);
  }
  if (role === "admin") {
    return { name: "System Administrator", email: email || "admin@zenti.edu" };
  }
  return null;
}

// Admin User Creation Endpoint - Creates profile & corresponding record in users table with hashed password
app.post("/api/admin/create-user", checkRBAC(["admin"]), async (req: any, res: any) => {
  try {
    const {
      email,
      role,
      name,
      password,
      passcode,
      admissionNo,
      designatorCode,
      cohort,
      phone,
      hourlyRate,
      contractLength,
      isAccountant,
      isLibrarian
    } = req.body;

    if (!email || !role || !name) {
      res.status(400).json({ success: false, error: "Missing required parameters: email, role, and name are required." });
      return;
    }

    const validRoles = ["student", "lecturer", "accountant", "librarian", "admin"];
    if (!validRoles.includes(role)) {
      res.status(400).json({ success: false, error: `Invalid role '${role}'. Allowed roles: ${validRoles.join(", ")}` });
      return;
    }

    const rawInputPass = (password || passcode || "").trim();
    const { plain: plainPassword } = resolvePassword(rawInputPass, role);
    const passwordHash = hashPassword(plainPassword);
    const mustChangePassword = true;

    let uid = "";
    let createdRecord: any = null;
    const fullDb = getDatabase();

    if (role === "student") {
      uid = admissionNo ? admissionNo.trim() : `STU-${Date.now()}`;
      try {
        const [student] = await db
          .insert(students)
          .values({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone ? phone.trim() : null,
            admissionNo: uid,
            cohort: cohort ? cohort.trim() : "2026 Intake",
            accountStatus: "Pending Setup",
          })
          .returning();
        createdRecord = student;
      } catch (dbErr) {
        const newStudent = {
          id: `stu-${Date.now()}`,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone || "+254 700 000000",
          admissionNo: uid,
          cohort: cohort || "2026 Intake",
          accountStatus: "Pending Setup",
          enrolledUnits: [],
          grades: {},
          ledger: [],
          payments: [],
          attendance: {},
        };
        fullDb.students = fullDb.students || [];
        fullDb.students.push(newStudent);
        createdRecord = newStudent;
      }
    } else if (["lecturer", "accountant", "librarian"].includes(role)) {
      uid = designatorCode ? designatorCode.trim() : `LEC-${Date.now()}`;
      try {
        const [lecturer] = await db
          .insert(lecturers)
          .values({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            phone: phone ? phone.trim() : "+254 700 000000",
            hourlyRate: hourlyRate ? String(hourlyRate) : "0.00",
            contractLength: contractLength ? String(contractLength) : "1 Year",
            designatorCode: uid,
            isActive: true,
            isAccountant: role === "accountant" || isAccountant === true,
            isLibrarian: role === "librarian" || isLibrarian === true,
          })
          .returning();
        createdRecord = lecturer;
      } catch (dbErr) {
        const newLecturer = {
          id: `lec-${Date.now()}`,
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone || "+254 700 000000",
          hourlyRate: parseFloat(hourlyRate || "0"),
          bankDetails: "NCBA Bank",
          contractLength: contractLength || "1 Year",
          designatorCode: uid,
          subjects: [],
          isActive: true,
          isAccountant: role === "accountant" || isAccountant === true,
          isLibrarian: role === "librarian" || isLibrarian === true,
        };
        fullDb.lecturers = fullDb.lecturers || [];
        fullDb.lecturers.push(newLecturer);
        createdRecord = newLecturer;
      }
    } else {
      uid = `ADM-${Date.now()}`;
      createdRecord = { id: uid, name, email, role };
    }

    // Automatically create/sync corresponding user record in users table
    try {
      await upsertUserAuthRecord({
        username: uid,
        email: email.trim().toLowerCase(),
        passwordHash,
        role,
        roleId: createdRecord?.id || uid,
        isActive: true,
        mustChangePassword,
      });
    } catch (authErr) {
      console.warn("Could not sync with users table:", authErr);
    }

    saveDatabase(fullDb);

    res.status(201).json({
      success: true,
      message: "User account created successfully with default password.",
      user: {
        id: createdRecord?.id || uid,
        uid: uid,
        email: email.trim().toLowerCase(),
        name: name,
        role: role,
        mustChangePassword: true,
      },
      defaultPassword: plainPassword,
    });
  } catch (err: any) {
    console.error("Failed to create user account:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to create user account." });
  }
});

// Unified Login Endpoint - Authenticates exclusively through the users table
app.post("/api/auth/login", async (req: any, res: any) => {
  try {
    const { role, userId, passcode, password } = req.body;
    const inputIdentifier = userId;
    const inputPasscode = passcode || password;

    if (!inputIdentifier || !inputPasscode) {
      res.status(400).json({ success: false, error: "Missing required role, identity, or passcode parameter." });
      return;
    }

    const result = await authenticateUser({
      identifier: inputIdentifier,
      passcode: inputPasscode,
      roleHint: role,
      jwtSecret: JWT_SECRET,
      getProfileFn: getProfileForUser
    });

    if (!result.success) {
      if (result.error && /deactivated/i.test(result.error)) {
        res.status(403).json({ success: false, error: result.error });
        return;
      }
      res.status(401).json({ success: false, error: "Invalid username or password." });
      return;
    }

    if (result.status === "REQUIRES_PASSWORD_CHANGE") {
      res.json({
        success: true,
        status: "REQUIRES_PASSWORD_CHANGE",
        userId: result.userId,
        username: result.username,
        role: result.role,
        email: result.email,
        message: result.message
      });
      return;
    }

    if (result.refreshToken) {
      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    }

    res.json({
      success: true,
      role: result.role,
      userId: result.userId,
      username: result.username,
      email: result.email,
      token: result.token,
      refreshToken: result.refreshToken,
      profile: result.profile
    });
  } catch (err: any) {
    console.error("Login endpoint error:", err);
    res.status(500).json({ success: false, error: err.message || "Authentication failed." });
  }
});

// Password Change Endpoint (/api/auth/change-password and /api/auth/change-passcode)
app.post(["/api/auth/change-password", "/api/auth/change-passcode"], async (req: any, res: any) => {
  try {
    const { role, userId, currentPasscode, currentPassword, newPasscode, newPassword } = req.body;
    const inputCurrent = currentPassword || currentPasscode;
    const inputNew = newPassword || newPasscode;
    const identifier = userId || req.user?.userId;

    if (!identifier || !inputCurrent || !inputNew) {
      res.status(400).json({ success: false, error: "Missing required parameters for password update." });
      return;
    }

    const result = await changeUserPassword({
      identifier,
      roleHint: role,
      currentPasscode: inputCurrent,
      newPasscode: inputNew,
      jwtSecret: JWT_SECRET,
      getProfileFn: getProfileForUser
    });

    if (!result.success) {
      // 400, not 401: a wrong current password is a validation failure on this form, not an
      // expired session. A 401 here would trip the client's global session-expiry handler
      // and bounce the user to the login page before they can read the error.
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    if (result.refreshToken) {
      const isProduction = process.env.NODE_ENV === "production";
      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000
      });
    }

    res.json(result);
  } catch (err: any) {
    console.error("Password change endpoint error:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to update password." });
  }
});

// Token Refresh Endpoint (/api/auth/refresh)
app.all("/api/auth/refresh", async (req: any, res: any) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  try {
    const cookies = parseCookies(req);
    const refreshToken =
      cookies.refreshToken ||
      cookies.zenti_refresh_token ||
      req.body?.refreshToken ||
      req.headers['x-refresh-token'] ||
      (req.headers.authorization && req.headers.authorization.toLowerCase().startsWith('bearer ') ? req.headers.authorization.substring(7) : null);

    if (!refreshToken) {
      return res.status(401).json({ success: false, error: "Refresh token required." });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, error: "Invalid or expired refresh token." });
    }

    if (decoded.tokenType && decoded.tokenType !== 'refresh') {
      return res.status(401).json({ success: false, error: "Invalid token type for refresh." });
    }

    const user = await findUserByIdentifier(decoded.userId || decoded.username, decoded.role);
    if (!user || user.is_active === false) {
      return res.status(401).json({ success: false, error: "Account is inactive or not found." });
    }

    if (await isArchivedSessionIdentity(decoded)) {
      return res.status(403).json({ success: false, error: "Account is archived." });
    }

    const profileId = user.role_id || user.username || String(user.id);
    const newAccessToken = issueAccessToken(profileId, user.role, user.email, JWT_SECRET, user.role_id);
    const newRefreshToken = issueRefreshToken(profileId, user.role, user.email, JWT_SECRET, user.role_id);

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      token: newAccessToken,
      refreshToken: newRefreshToken,
      userId: profileId,
      role: user.role,
      email: user.email
    });
  } catch (err: any) {
    console.error("Refresh endpoint error:", err);
    return res.status(500).json({ success: false, error: "Failed to refresh token." });
  }
});

// Protected Administrative System Statistics Route
app.get("/api/admin/system-stats", checkRBAC(["admin", "accountant", "librarian"]), async (req, res) => {
  try {
    const [cCount, sCount, lCount, bCount] = await Promise.all([
      db.select({ value: count() }).from(courses).where(activeResourceCondition("course", courses.id)),
      db.select({ value: count() }).from(students).where(activeResourceCondition("student", students.id)),
      db.select({ value: count() }).from(lecturers).where(activeResourceCondition("lecturer", lecturers.id)),
      db.select({ value: count() }).from(books).where(activeResourceCondition("book", books.id)),
    ]);
    res.json({
      systemOnline: true,
      metrics: {
        totalCourses: Number(cCount[0]?.value || 0),
        totalStudents: Number(sCount[0]?.value || 0),
        totalLecturers: Number(lCount[0]?.value || 0),
        totalBooks: Number(bCount[0]?.value || 0),
      },
      environment: process.env.NODE_ENV || "development",
      lastBackup: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to query system stats." });
  }
});

// Submit a password reset request
app.post("/api/auth/reset-request", async (req: any, res: any) => {
  try {
    const { email, reason } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: "Email is required." });
      return;
    }

    const searchEmail = email.trim().toLowerCase();
    const userAuth = await findUserByIdentifier(searchEmail);

    if (!userAuth) {
      res.status(404).json({ success: false, error: `No account registered with "${email}" could be located.` });
      return;
    }

    const dbStore = getDatabase();
    const existingPending = (dbStore.passwordResetRequests || []).find(
      (r: any) => r.email.toLowerCase() === searchEmail && r.status === 'pending'
    );
    if (existingPending) {
      res.status(400).json({ 
        success: false, 
        error: "You already have a pending reset request under review by the Administrator." 
      });
      return;
    }

    const profileObj = await getProfileForUser(userAuth.role, userAuth.role_id, userAuth.email);

    const newRequest = {
      id: `req-${Date.now()}`,
      userId: userAuth.role_id || userAuth.username || String(userAuth.id),
      name: profileObj?.name || userAuth.username,
      email: userAuth.email,
      role: userAuth.role,
      date: new Date().toLocaleString(),
      reason: reason || "Forgotten password",
      status: 'pending'
    };

    dbStore.passwordResetRequests = [newRequest, ...(dbStore.passwordResetRequests || [])];
    saveDatabase(dbStore);

    res.status(201).json({ success: true, message: "Reset request submitted to the Administrator.", request: newRequest });
  } catch (err: any) {
    console.error("Reset request submission error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Check status of password reset requests for a given email
app.get("/api/auth/reset-requests", (req, res) => {
  const { email } = req.query;
  if (!email) {
    res.status(400).json({ success: false, error: "Missing email parameter" });
    return;
  }
  const dbStore = getDatabase();
  const list = (dbStore.passwordResetRequests || []).filter(
    (r: any) => r.email.toLowerCase() === (email as string).trim().toLowerCase()
  );
  res.json({ success: true, requests: list });
});

// Admin Route: Get all password reset requests
app.get("/api/admin/reset-requests", checkRBAC(["admin"]), (req, res) => {
  const dbStore = getDatabase();
  res.json({ success: true, requests: dbStore.passwordResetRequests || [] });
});

// Admin Route: Take action on a password reset request
app.post("/api/admin/reset-requests/:id/action", checkRBAC(["admin"]), async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { action, feedback, passcode } = req.body;
    if (!action || !["approve", "reject"].includes(action)) {
      res.status(400).json({ success: false, error: "Invalid action. Must be 'approve' or 'reject'." });
      return;
    }

    const dbStore = getDatabase();
    const reqIdx = (dbStore.passwordResetRequests || []).findIndex((r: any) => r.id === id);
    if (reqIdx === -1) {
      res.status(404).json({ success: false, error: "Password reset request not found." });
      return;
    }

    const resetReq = dbStore.passwordResetRequests[reqIdx];
    if (resetReq.status !== 'pending') {
      res.status(400).json({ success: false, error: "Request has already been processed." });
      return;
    }

    if (action === "approve") {
      const resetRes = await adminResetUserPassword(resetReq.userId || resetReq.email, passcode);
      if (!resetRes.success) {
        res.status(404).json({ success: false, error: resetRes.error || "Corresponding user account not found in database." });
        return;
      }

      dbStore.passwordResetRequests[reqIdx].status = 'resolved';
      dbStore.passwordResetRequests[reqIdx].temporaryPasscode = resetRes.temporaryPasscode;
      dbStore.passwordResetRequests[reqIdx].adminFeedback = feedback || "Approved and passcode updated.";
    } else {
      dbStore.passwordResetRequests[reqIdx].status = 'rejected';
      dbStore.passwordResetRequests[reqIdx].adminFeedback = feedback || "Request declined by Administrator.";
    }

    saveDatabase(dbStore);
    res.json({ success: true, request: dbStore.passwordResetRequests[reqIdx] });
  } catch (err: any) {
    console.error("Action on reset request error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Fetch Full Database State
// Helper to sanitize state for client consumption by removing passcodes
function sanitizeStateForClient(dbState: any) {
  if (!dbState) return dbState;
  const cloned = { ...dbState };
  if (Array.isArray(cloned.students)) {
    cloned.students = cloned.students.map((s: any) => {
      const { passcode, ...rest } = s;
      return rest;
    });
  }
  if (Array.isArray(cloned.lecturers)) {
    cloned.lecturers = cloned.lecturers.map((l: any) => {
      const { passcode, ...rest } = l;
      return rest;
    });
  }
  return cloned;
}

app.get("/api/data", async (req, res) => {
  try {
    const dbState = await loadFullDatabaseState();
    res.json(sanitizeStateForClient(dbState));
  } catch (error) {
    console.warn("Notice: Database query timed out, returning cached database state.");
    res.json(sanitizeStateForClient(getDatabase()));
  }
});

// 3. Sync/Save Entire Database State (Used by Frontend State-Sync Engine)
app.post("/api/data", async (req, res) => {
  const incomingData = req.body;
  if (!incomingData || typeof incomingData !== "object") {
    res.status(400).json({ error: "Invalid data payload" });
    return;
  }

  const dbVal = getDatabase();
  // Merge keys dynamically to ensure schema resilience
  const updatedDb = { ...dbVal, ...incomingData };
  const success = saveDatabase(updatedDb);

  if (success) {
    res.json({ success: true, message: "Database synchronized successfully" });
  } else {
    res.status(500).json({ error: "Failed to persist database synchronization" });
  }
});

// 4. REST Resource: Courses
app.get("/api/courses", async (req, res) => {
  try {
    const courseRows = await db.select().from(courses).where(activeResourceCondition("course", courses.id));
    const result = courseRows.map(c => ({
      id: c.id,
      code: c.code,
      title: c.title,
      description: c.description ?? "",
      duration: c.duration,
      fees: Number(c.fees),
      thumbnail: c.thumbnail ?? "",
      active: c.active,
      faculty: c.faculty
    }));
    res.json(result);
  } catch (err: any) {
    console.error("Failed to fetch courses:", err);
    res.json(getDatabase().courses || []);
  }
});

app.post("/api/courses", async (req, res) => {
  try {
    const courseData = req.body;

    if (!courseData?.code || !courseData?.title) {
      return res.status(400).json({
        error: "Course code and title are required",
      });
    }

    const [course] = await db
      .insert(courses)
      .values({
        code: courseData.code,
        title: courseData.title,
        description: courseData.description ?? null,
        duration: courseData.duration,
        fees: courseData.fees,
        thumbnail: courseData.thumbnail ?? null,
        active: courseData.active ?? true,
        faculty: courseData.faculty,
      })
      .returning();

    // Sync database cache
    const fullDb = await loadFullDatabaseState();
    saveDatabase(fullDb);

    res.status(201).json(course);
  } catch (error: any) {
    console.error("Failed to create course:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

  // REST Resource: Invoices
// REST Resource: Invoices
app.get("/api/invoices", async (req, res) => {
  try {
    const { studentId } = req.query;
    if (studentId) {
      let resolvedStudentId = String(studentId);
      try {
        const [st] = await db
          .select({ id: students.id })
          .from(students)
          .where(or(eq(students.id, resolvedStudentId), eq(students.admissionNo, resolvedStudentId)));
        if (st) resolvedStudentId = st.id;
      } catch (_) {}

      const invList = await db.select().from(invoices).where(eq(invoices.studentId, resolvedStudentId));
      return res.json(invList);
    }
    const result = await db.select().from(invoices);
    res.json(result);
  } catch (error: any) {
    console.error("Failed to fetch invoices:", error);
    try {
      const dbVal = getDatabase();
      const allInvoices = dbVal.invoices || [];
      if (req.query.studentId) {
        const filtered = allInvoices.filter((i: any) => i.studentId === req.query.studentId || i.admissionNo === req.query.studentId);
        return res.json(filtered);
      }
      res.json(allInvoices);
    } catch (fallbackErr: any) {
      res.status(500).json({ error: error.message });
    }
  }
});

app.get("/api/students/:studentId/invoices", async (req, res) => {
  try {
    const { studentId } = req.params;
    let resolvedId = studentId;
    try {
      const [st] = await db
        .select({ id: students.id })
        .from(students)
        .where(or(eq(students.id, studentId), eq(students.admissionNo, studentId)));
      if (st) resolvedId = st.id;
    } catch (_) {}

    const result = await db.select().from(invoices).where(eq(invoices.studentId, resolvedId));
    res.json(result);
  } catch (error: any) {
    console.error("Failed to fetch student invoices:", error);
    try {
      const dbVal = getDatabase();
      const allInvoices = dbVal.invoices || [];
      const filtered = allInvoices.filter((i: any) => i.studentId === req.params.studentId || i.admissionNo === req.params.studentId);
      res.json(filtered);
    } catch (fallbackErr: any) {
      res.status(500).json({ error: error.message });
    }
  }
});

app.post("/api/invoices", checkRBAC(["accountant", "admin"]), async (req: any, res: any) => {
  try {
    const { studentId, admissionNumber, admissionNo, feeCategory, voteHead, amount, description, term, invoiceNo, date } = req.body;

    const targetIdentifier = studentId || admissionNumber || admissionNo;
    if (!targetIdentifier || !amount || isNaN(Number(amount))) {
      return res.status(400).json({
        error: "Student ID or admission number, and a valid numeric amount are required",
      });
    }

    const numAmount = Number(amount);
    if (numAmount <= 0) {
      return res.status(400).json({ error: "Amount must be a positive numeric value" });
    }

    // Resolve student record in PostgreSQL
    let resolvedStudent: { id: string; name: string; admissionNo: string } | null = null;
    try {
      const [st] = await db
        .select({ id: students.id, name: students.name, admissionNo: students.admissionNo })
        .from(students)
        .where(or(eq(students.id, String(targetIdentifier)), eq(students.admissionNo, String(targetIdentifier))));
      if (st) resolvedStudent = st;
    } catch (_) {}

    // Fallback student lookup in JSON store
    if (!resolvedStudent) {
      const dbVal = getDatabase();
      const st = dbVal.students?.find((s: any) => s.id === targetIdentifier || s.admissionNo === targetIdentifier);
      if (st) {
        resolvedStudent = { id: st.id, name: st.name, admissionNo: st.admissionNo };
      }
    }

    if (!resolvedStudent) {
      return res.status(404).json({ error: "Student not found with provided identifier" });
    }

    const categoryStr = feeCategory || voteHead || "Tuition";
    const rawDesc = description || term || "Semester Fees";
    const formattedDesc = rawDesc.toLowerCase().includes(categoryStr.toLowerCase()) 
      ? rawDesc 
      : `[${categoryStr}] ${rawDesc}`;

    const finalInvoiceNo = invoiceNo || `INV-${Math.floor(100000 + Math.random() * 900000)}`;
    const dateStr = date || new Date().toISOString().substring(0, 10);

    let createdInvoice: any = null;
    let createdLedgerEntry: any = null;

    try {
      // 1. Save invoice to PostgreSQL invoices table
      const [inv] = await db
        .insert(invoices)
        .values({
          studentId: resolvedStudent.id,
          invoiceNo: finalInvoiceNo,
          description: formattedDesc,
          amount: String(numAmount),
          date: dateStr,
          status: "unpaid",
        })
        .returning();
      createdInvoice = inv;

      // 2. Save debit entry to PostgreSQL studentLedger table
      const [led] = await db
        .insert(studentLedger)
        .values({
          studentId: resolvedStudent.id,
          entryType: "DEBIT",
          voteHead: categoryStr,
          amount: String(numAmount),
          description: formattedDesc,
        })
        .returning();
      createdLedgerEntry = led;

      // Keep JSON file store updated for offline/mixed mode fallback consistency
      try {
        const dbVal = getDatabase();
        dbVal.invoices = dbVal.invoices || [];
        dbVal.student_ledger = dbVal.student_ledger || [];

        const newInv = {
          id: inv.id,
          studentId: resolvedStudent.id,
          invoiceNo: finalInvoiceNo,
          description: formattedDesc,
          amount: numAmount,
          date: dateStr,
          status: "unpaid",
        };
        dbVal.invoices.push(newInv);

        const st = dbVal.students?.find((s: any) => s.id === resolvedStudent!.id);
        if (st) {
          st.ledger = st.ledger || [];
          if (!st.ledger.some((existing: any) => existing.id === newInv.id)) {
            st.ledger.push(newInv);
          }
        }
        saveDatabase(dbVal);
      } catch (_) {}

    } catch (dbErr: any) {
      console.warn("PostgreSQL invoice creation warning, executing JSON fallback:", dbErr.message);
      const dbVal = getDatabase();
      dbVal.invoices = dbVal.invoices || [];
      dbVal.student_ledger = dbVal.student_ledger || [];

      const newInv = {
        id: `inv-${Date.now()}`,
        studentId: resolvedStudent.id,
        invoiceNo: finalInvoiceNo,
        description: formattedDesc,
        amount: numAmount,
        date: dateStr,
        status: "unpaid",
      };

      const newLedger = {
        id: `ledger-${Date.now()}`,
        studentId: resolvedStudent.id,
        entryType: "DEBIT",
        voteHead: categoryStr,
        amount: numAmount,
        description: formattedDesc,
        createdAt: new Date().toISOString(),
      };

      dbVal.invoices.push(newInv);
      dbVal.student_ledger.push(newLedger);

      const st = dbVal.students?.find((s: any) => s.id === resolvedStudent.id);
      if (st) {
        st.ledger = st.ledger || [];
        st.ledger.push(newInv);
      }

      saveDatabase(dbVal);
      createdInvoice = newInv;
      createdLedgerEntry = newLedger;
    }

    // Return sanitized JSON response (no sensitive user/hash data)
    return res.status(201).json({
      success: true,
      invoice: createdInvoice,
      invoiceNo: finalInvoiceNo,
      ledgerEntry: createdLedgerEntry,
      studentId: resolvedStudent.id,
      studentName: resolvedStudent.name,
      amount: numAmount,
      feeCategory: categoryStr,
      description: formattedDesc,
      status: "unpaid",
    });

  } catch (error: any) {
    console.error("Failed to create invoice:", error);
    res.status(500).json({ error: error.message || "Failed to create invoice" });
  }
});

app.post("/api/student-attendance", async (req, res) => {
  try {
    const payload = req.body;
    const records = Array.isArray(payload) ? payload : [payload];

    if (records.length === 0) {
      return res.status(400).json({
        error: "Student ID, subject code and attendance rate are required",
      });
    }

    const saved = [];
    for (const attendanceData of records) {
      if (
        !attendanceData?.studentId ||
        !attendanceData?.subjectCode ||
        attendanceData?.attendanceRate === undefined
      ) {
        return res.status(400).json({
          error: "Student ID, subject code and attendance rate are required",
        });
      }

      const rate = Number(attendanceData.attendanceRate);
      if (Number.isNaN(rate) || rate < 0 || rate > 100) {
        return res.status(400).json({
          error: "attendanceRate must be a number between 0 and 100",
        });
      }

      const [attendance] = await db
        .insert(studentAttendance)
        .values({
          studentId: attendanceData.studentId,
          subjectCode: attendanceData.subjectCode,
          attendanceRate: rate,
        })
        .onConflictDoUpdate({
          target: [
            studentAttendance.studentId,
            studentAttendance.subjectCode,
          ],
          set: {
            attendanceRate: rate,
          },
        })
        .returning();

      saved.push(attendance);
    }

    res.status(201).json(Array.isArray(payload) ? saved : saved[0]);
  } catch (error: any) {
    console.error("Failed to save attendance:", error);
    res.status(500).json({
      error: error.message,
    });
  }
});
// 5. REST Resource: Lecturers
app.get("/api/lecturers", async (req, res) => {
  try {
    const lecturerRows = await db
      .select({
        id: lecturers.id,
        name: lecturers.name,
        email: lecturers.email,
        phone: lecturers.phone,
        hourlyRate: lecturers.hourlyRate,
        loggedHours: lecturers.loggedHours,
        bankDetails: lecturers.bankDetails,
        contractLength: lecturers.contractLength,
        designatorCode: lecturers.designatorCode,
        bio: lecturers.bio,
        avatar: lecturers.avatar,
        isActive: lecturers.isActive,
        isAccountant: lecturers.isAccountant,
        isLibrarian: lecturers.isLibrarian,
      })
      .from(lecturers)
      .where(activeResourceCondition("lecturer", lecturers.id));

    const subjectRows = await db.select().from(lecturerSubjects);
    const publicationRows = await db.select().from(lecturerPublications);
    const researchRows = await db.select().from(lecturerResearchInterests);
    const officeRows = await db.select().from(officeHourSlots);

    const result = lecturerRows.map((lecturer) => {
      return {
        ...lecturer,
        subjects: subjectRows
          .filter((s) => s.lecturerId === lecturer.id)
          .map((s) => s.subjectCode),

        publications: publicationRows
          .filter((p) => p.lecturerId === lecturer.id)
          .map((p) => p.publicationText),

        researchInterests: researchRows
          .filter((r) => r.lecturerId === lecturer.id)
          .map((r) => r.interestText),

        officeHours: officeRows.filter(
          (o) => o.lecturerId === lecturer.id
        ),
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Failed to fetch lecturers:", error);
    res.status(500).json({ error: "Failed to fetch lecturers" });
  }
});

app.post("/api/lecturers", async (req, res) => {
  try {
    const lecturerData = req.body;

    if (!lecturerData?.name || !lecturerData?.email) {
      return res.status(400).json({
        error: "Lecturer name and email are required",
      });
    }

    const isGenerated = !lecturerData.passcode;
    const rawPasscode = lecturerData.passcode || crypto.randomBytes(6).toString('hex');
    const hashedPasscode = (rawPasscode.startsWith('$2b$') || rawPasscode.startsWith('$2a$') || rawPasscode.startsWith('$2y$'))
      ? rawPasscode
      : hashPassword(rawPasscode);

    const [lecturer] = await db
      .insert(lecturers)
      .values({
        name: lecturerData.name,
        email: lecturerData.email,
        phone: lecturerData.phone,
        hourlyRate: lecturerData.hourlyRate,
        loggedHours: lecturerData.loggedHours ?? "0.00",
        bankDetails: lecturerData.bankDetails ?? null,
        contractLength: lecturerData.contractLength,
        designatorCode: lecturerData.designatorCode,
        bio: lecturerData.bio ?? null,
        avatar: lecturerData.avatar ?? null,
        isActive: lecturerData.isActive ?? true,
        isAccountant: lecturerData.isAccountant ?? false,
        isLibrarian: lecturerData.isLibrarian ?? false,
      })
      .returning();

    const role = lecturerData.isAccountant ? "accountant" : lecturerData.isLibrarian ? "librarian" : "lecturer";
    const uid = lecturerData.designatorCode || lecturer.id;
    try {
      await upsertUserAuthRecord({
        username: uid,
        email: lecturerData.email,
        passwordHash: hashedPasscode,
        role,
        roleId: lecturer.id,
        isActive: true,
        mustChangePassword: true,
      });
    } catch (e) {}

    // Sync database cache
    const fullDb = await loadFullDatabaseState();
    saveDatabase(fullDb);

    res.status(201).json({
      ...lecturer,
      ...(isGenerated ? { temporaryPasscode: rawPasscode } : {})
    });
  } catch (error: any) {
    console.error("Failed to create lecturer:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});
   
// GET API for transactions (fetches 5 most recent)
app.get("/api/transactions", async (req, res) => {
  try {
    const recentTransactions = await db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt))
      .limit(5);

    const result = recentTransactions.map(t => ({
      id: t.id,
      reference_no: t.referenceNo,
      recipient_sender: t.recipientSender,
      description: t.description,
      amount: Number(t.amount),
      currency: t.currency,
      created_at: t.createdAt,
    }));
    res.json(result);
  } catch (err: any) {
    console.error("Failed to fetch transactions:", err);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// GET API to search for a student by their admission_no
app.get("/api/students/search", async (req: any, res: any) => {
  try {
    const admissionNoQuery = req.query.admission_no || req.query.admissionNo;
    if (!admissionNoQuery || typeof admissionNoQuery !== "string") {
      return res.status(400).json({ error: "admission_no query parameter is required" });
    }

    const admissionNo = admissionNoQuery.trim();
    const userRole = req.headers["x-user-role"] || req.user?.role;

    // Lecturers must use the redacted teaching-safe lookup endpoint
    if (userRole === "lecturer") {
      return res.status(403).json({
        success: false,
        error:
          "Lecturers must use /api/lecturer/student-lookup for student profiles. Full student records are not available.",
        code: "RBAC_USE_LECTURER_LOOKUP",
      });
    }

    // Query fully constructed students list (with all nested details like grades, ledger, etc.)
    const fullDb = await loadFullDatabaseState();
    const student = (fullDb.students || []).find(
      (s: any) => s.admissionNo?.toLowerCase() === admissionNo.toLowerCase()
    );

    if (!student) {
      // Fallback: check local database cache
      const cachedStudents = getDatabase().students || [];
      const cachedStudent = cachedStudents.find(
        (s: any) => s.accountStatus !== "Archived" && s.admissionNo?.toLowerCase() === admissionNo.toLowerCase()
      );

      if (cachedStudent) {
        const { passcode, passwordHash, password, ...studentWithoutPasscode } = cachedStudent;
        return res.json(studentWithoutPasscode);
      }
      return res.status(404).json({ error: `Student with admission number ${admissionNo} not found.` });
    }

    const { passcode, passwordHash, password, ...studentWithoutPasscode } = student;
    res.json(studentWithoutPasscode);
  } catch (err: any) {
    console.error("Error searching student by admission_no:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// FINANCIAL SUITE AND LEDGER APIS
// 1. GET /api/finance/students (fetches students with computed outstanding ledger balances)
app.get("/api/finance/students", async (req, res) => {
  try {
    const allStudents = await db.select().from(students).where(activeResourceCondition("student", students.id));
    const ledgerEntries = await db.select().from(studentLedger);

    const result = allStudents.map(s => {
      const studentEntries = ledgerEntries.filter(entry => entry.studentId === s.id);
      const debits = studentEntries
        .filter(entry => entry.entryType === 'DEBIT')
        .reduce((sum, entry) => sum + Number(entry.amount), 0);
      const credits = studentEntries
        .filter(entry => entry.entryType === 'CREDIT')
        .reduce((sum, entry) => sum + Number(entry.amount), 0);
      
      const outstandingBalance = debits - credits;
      const status = outstandingBalance > 0 ? "Outstanding" : "Cleared";

      return {
        id: s.id,
        name: s.name,
        admissionNo: s.admissionNo,
        cohort: s.cohort,
        outstandingBalance,
        status
      };
    });

    res.json(result);
  } catch (err: any) {
    console.error("Failed to fetch finance students from PostgreSQL:", err);
    res.status(500).json({ error: "Failed to fetch finance students" });
  }
});

// 2. POST /api/finance/bill (process a debit ledger entry and corresponding unpaid invoice)
app.post("/api/finance/bill", async (req, res) => {
  const { studentId, voteHead, amount, description } = req.body;

  if (!studentId || !voteHead || !amount || isNaN(Number(amount))) {
    return res.status(400).json({ error: "Missing required billing fields or invalid amount" });
  }
  if (!await activeStudentExists(studentId)) {
    return res.status(404).json({ error: "Active student not found" });
  }

  const invoiceNo = `INV-${Math.floor(100000 + Math.random() * 900000)}`;
  const dateStr = new Date().toISOString().substring(0, 10);
  const formattedDesc = `[${voteHead}] ${description || "Semester Fees"}`;

  try {
    // 1. Insert into student_ledger
    const [ledgerEntry] = await db.insert(studentLedger).values({
      studentId,
      entryType: 'DEBIT',
      voteHead,
      amount: String(amount),
      description: formattedDesc,
    }).returning();

    // 2. Insert corresponding invoice to maintain system compatibility
    await db.insert(invoices).values({
      studentId,
      invoiceNo,
      description: formattedDesc,
      amount: String(amount),
      date: dateStr,
      status: "unpaid",
    });

    res.status(201).json({
      success: true,
      ledgerEntry,
      invoiceNo
    });
  } catch (err: any) {
    console.error("Failed to create billing debit entry in PostgreSQL:", err);
    // JSON file fallback
    try {
      const dbVal = getDatabase();
      dbVal.student_ledger = dbVal.student_ledger || [];
      dbVal.invoices = dbVal.invoices || [];

      const newLedgerEntry = {
        id: `ledger-${Date.now()}`,
        studentId,
        entryType: 'DEBIT',
        voteHead,
        amount: Number(amount),
        description: formattedDesc,
        createdAt: new Date().toISOString(),
      };

      const newInvoice = {
        id: `inv-${Date.now()}`,
        studentId,
        invoiceNo,
        description: formattedDesc,
        amount: Number(amount),
        date: dateStr,
        status: "unpaid"
      };

      dbVal.student_ledger.push(newLedgerEntry);
      dbVal.invoices.push(newInvoice);

      const student = dbVal.students?.find((s: any) => s.id === studentId);
      if (student) {
        student.ledger = student.ledger || [];
        student.ledger.push(newInvoice);
      }

      saveDatabase(dbVal);
      res.status(201).json({
        success: true,
        ledgerEntry: newLedgerEntry,
        invoiceNo
      });
    } catch (fallbackErr: any) {
      res.status(500).json({ error: fallbackErr.message });
    }
  }
});

// 3. POST /api/finance/grant (process a credit ledger entry and negative waiver invoice)
app.post("/api/finance/grant", async (req, res) => {
  const { studentId, discountTypology, amount, description } = req.body;

  if (!studentId || !discountTypology || !amount || isNaN(Number(amount))) {
    return res.status(400).json({ error: "Missing required grant fields or invalid credit value" });
  }
  if (!await activeStudentExists(studentId)) {
    return res.status(404).json({ error: "Active student not found" });
  }

  const creditNo = `CRD-${Math.floor(100000 + Math.random() * 900000)}`;
  const dateStr = new Date().toISOString().substring(0, 10);
  const formattedDesc = `[${discountTypology} Approved] ${description || "Waiver allocation"}`;

  try {
    // 1. Insert into student_ledger
    const [ledgerEntry] = await db.insert(studentLedger).values({
      studentId,
      entryType: 'CREDIT',
      voteHead: discountTypology,
      amount: String(amount),
      description: formattedDesc,
    }).returning();

    // 2. Insert corresponding negative amount invoice to maintain compatibility
    await db.insert(invoices).values({
      studentId,
      invoiceNo: creditNo,
      description: formattedDesc,
      amount: String(-Number(amount)),
      date: dateStr,
      status: "paid",
    });

    res.status(201).json({
      success: true,
      ledgerEntry,
      creditNo
    });
  } catch (err: any) {
    console.error("Failed to create grant credit entry in PostgreSQL:", err);
    // JSON file fallback
    try {
      const dbVal = getDatabase();
      dbVal.student_ledger = dbVal.student_ledger || [];
      dbVal.invoices = dbVal.invoices || [];

      const newLedgerEntry = {
        id: `ledger-${Date.now()}`,
        studentId,
        entryType: 'CREDIT',
        voteHead: discountTypology,
        amount: Number(amount),
        description: formattedDesc,
        createdAt: new Date().toISOString(),
      };

      const newInvoice = {
        id: `inv-${Date.now()}`,
        studentId,
        invoiceNo: creditNo,
        description: formattedDesc,
        amount: -Number(amount),
        date: dateStr,
        status: "paid"
      };

      dbVal.student_ledger.push(newLedgerEntry);
      dbVal.invoices.push(newInvoice);

      const student = dbVal.students?.find((s: any) => s.id === studentId);
      if (student) {
        student.ledger = student.ledger || [];
        student.ledger.push(newInvoice);
      }

      saveDatabase(dbVal);
      res.status(201).json({
        success: true,
        ledgerEntry: newLedgerEntry,
        creditNo
      });
    } catch (fallbackErr: any) {
      res.status(500).json({ error: fallbackErr.message });
    }
  }
});

// 4. POST /api/finance/reconcile (automatically match statement records with unpaid student bills)
app.post("/api/finance/reconcile", async (req, res) => {
  let matchCount = 0;
  const matches: any[] = [];

  try {
    const allTransactions = await db.select().from(transactions);
    const activeStudents = await db.select({ id: students.id }).from(students).where(activeResourceCondition("student", students.id));
    const activeStudentIds = activeStudents.map((student) => student.id);
    const unpaidInvoices = activeStudentIds.length
      ? await db.select().from(invoices).where(and(eq(invoices.status, "unpaid"), inArray(invoices.studentId, activeStudentIds)))
      : [];
    const allPayments = await db.select().from(payments);

    const usedRefs = new Set(allPayments.map(p => p.transactionId));

    for (const tx of allTransactions) {
      if (usedRefs.has(tx.referenceNo) || Number(tx.amount) <= 0) {
        continue;
      }

      const txAmount = Number(tx.amount);
      const matchingInvoice = unpaidInvoices.find(inv => Number(inv.amount) === txAmount && !matches.some(m => m.invoiceId === inv.id));

      if (matchingInvoice) {
        const dateStr = new Date().toISOString().substring(0, 10);
        
        let paymentMethod: 'M-Pesa' | 'Bank Transfer' | 'Card' = 'Bank Transfer';
        if (tx.referenceNo.toLowerCase().includes('mpesa') || tx.description.toLowerCase().includes('mpesa')) {
          paymentMethod = 'M-Pesa';
        } else if (tx.referenceNo.toLowerCase().includes('card') || tx.description.toLowerCase().includes('card')) {
          paymentMethod = 'Card';
        }

        await db.update(invoices)
          .set({ status: 'paid' })
          .where(eq(invoices.id, matchingInvoice.id));

        await db.insert(payments).values({
          studentId: matchingInvoice.studentId,
          invoiceId: matchingInvoice.id,
          amount: String(txAmount),
          paymentMethod,
          transactionId: tx.referenceNo,
          date: dateStr,
          status: 'reconciled',
        });

        await db.insert(studentLedger).values({
          studentId: matchingInvoice.studentId,
          entryType: 'CREDIT',
          voteHead: 'Tuition',
          amount: String(txAmount),
          description: `Broad Matching Sync Reconciled Ref: ${tx.referenceNo}`,
        });

        matches.push({
          invoiceId: matchingInvoice.id,
          referenceNo: tx.referenceNo,
          studentId: matchingInvoice.studentId,
          amount: txAmount
        });

        matchCount++;
      }
    }

    res.json({
      success: true,
      message: `Broad matching sync complete. Reconciled ${matchCount} payments.`,
      matchCount,
      matches
    });
  } catch (err: any) {
    console.error("PostgreSQL automated reconciliation failed:", err);
    // JSON file fallback
    try {
      const dbVal = getDatabase();
      dbVal.transactions = dbVal.transactions || [];
      dbVal.invoices = dbVal.invoices || [];
      dbVal.payments = dbVal.payments || [];
      dbVal.student_ledger = dbVal.student_ledger || [];

      const usedRefs = new Set(dbVal.payments.map((p: any) => p.transactionId || p.transaction_id));
      const unpaidInvoices = dbVal.invoices.filter((inv: any) => inv.status === 'unpaid');

      for (const tx of dbVal.transactions) {
        const ref = tx.referenceNo || tx.reference_no;
        const amt = tx.amount;

        if (usedRefs.has(ref) || amt <= 0) {
          continue;
        }

        const matchingInvoice = unpaidInvoices.find((inv: any) => Number(inv.amount) === amt && !matches.some(m => m.invoiceId === inv.id));

        if (matchingInvoice) {
          const dateStr = new Date().toISOString().substring(0, 10);
          
          let paymentMethod: 'M-Pesa' | 'Bank Transfer' | 'Card' = 'Bank Transfer';
          if (ref.toLowerCase().includes('mpesa') || tx.description.toLowerCase().includes('mpesa')) {
            paymentMethod = 'M-Pesa';
          }

          matchingInvoice.status = 'paid';

          const student = dbVal.students?.find((s: any) => s.id === matchingInvoice.studentId);
          if (student) {
            const studentInv = student.ledger?.find((i: any) => i.id === matchingInvoice.id);
            if (studentInv) studentInv.status = 'paid';
          }

          const newPayment = {
            id: `pay-${Date.now()}-${matchCount}`,
            studentId: matchingInvoice.studentId,
            invoiceId: matchingInvoice.id,
            amount: amt,
            paymentMethod,
            transactionId: ref,
            date: dateStr,
            status: 'reconciled'
          };
          dbVal.payments.push(newPayment);
          if (student) {
            student.payments = student.payments || [];
            student.payments.push(newPayment);
          }

          const newLedgerEntry = {
            id: `ledger-${Date.now()}-${matchCount}`,
            studentId: matchingInvoice.studentId,
            entryType: 'CREDIT',
            voteHead: 'Tuition',
            amount: amt,
            description: `Broad Matching Sync Reconciled Ref: ${ref}`,
            createdAt: new Date().toISOString()
          };
          dbVal.student_ledger.push(newLedgerEntry);

          matches.push({
            invoiceId: matchingInvoice.id,
            referenceNo: ref,
            studentId: matchingInvoice.studentId,
            amount: amt
          });

          matchCount++;
        }
      }

      saveDatabase(dbVal);
      res.json({
        success: true,
        message: `Broad matching sync complete (fallback mode). Reconciled ${matchCount} payments.`,
        matchCount,
        matches
      });
    } catch (fallbackErr: any) {
      res.status(500).json({ error: fallbackErr.message });
    }
  }
});

// 5. GET /api/finance/payments & PATCH /api/finance/payments/:id/reconcile
app.get("/api/finance/payments", async (req, res) => {
  try {
    const activeStudents = await db.select({ id: students.id }).from(students).where(activeResourceCondition("student", students.id));
    const activeStudentIds = activeStudents.map((student) => student.id);
    const paymentRows = activeStudentIds.length
      ? await db.select().from(payments).where(inArray(payments.studentId, activeStudentIds))
      : [];
    const studentRows = await db.select().from(students).where(activeResourceCondition("student", students.id));

    const result = paymentRows.map(p => {
      const student = studentRows.find(s => s.id === p.studentId);
      return {
        id: p.id,
        studentId: p.studentId,
        studentName: student ? student.name : "Unknown Student",
        studentAdmissionNo: student ? student.admissionNo : "",
        invoiceId: p.invoiceId ?? "",
        amount: Number(p.amount),
        paymentMethod: p.paymentMethod,
        transactionId: p.transactionId,
        date: p.date,
        status: p.status
      };
    });

    res.json(result);
  } catch (err: any) {
    console.error("Failed to fetch payments from PostgreSQL:", err);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

app.patch("/api/finance/payments/:id/reconcile", async (req, res) => {
  const { id } = req.params;
  try {
    const [updatedPayment] = await db
      .update(payments)
      .set({ status: 'reconciled' })
      .where(eq(payments.id, id))
      .returning();

    if (updatedPayment && updatedPayment.invoiceId) {
      await db.update(invoices)
        .set({ status: 'paid' })
        .where(eq(invoices.id, updatedPayment.invoiceId));

      await db.insert(studentLedger).values({
        studentId: updatedPayment.studentId,
        entryType: 'CREDIT',
        voteHead: 'Tuition',
        amount: String(updatedPayment.amount),
        description: `Manual Reconciled Payment Ref: ${updatedPayment.transactionId}`
      });
    }

    res.json({ success: true, payment: updatedPayment });
  } catch (err: any) {
    console.error("Failed to reconcile payment in PostgreSQL:", err);
    res.status(500).json({ error: "Failed to reconcile payment" });
  }
});

// 6. GET /api/finance/expenses & POST /api/finance/expenses
app.get("/api/finance/expenses", async (req, res) => {
  try {
    const expenseRows = await db.select().from(expenses);
    const result = expenseRows.map(e => ({
      id: e.id,
      description: e.description,
      category: e.category,
      amount: Number(e.amount),
      date: e.date
    }));
    res.json(result);
  } catch (err: any) {
    console.error("Failed to fetch expenses from PostgreSQL:", err);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

app.post("/api/finance/expenses", async (req, res) => {
  const { description, category, amount, date } = req.body;
  if (!description || !category || !amount || isNaN(Number(amount))) {
    return res.status(400).json({ error: "Invalid expense parameters" });
  }
  try {
    const dateStr = date || new Date().toISOString().substring(0, 10);
    const [newExpense] = await db.insert(expenses).values({
      description,
      category,
      amount: String(amount),
      date: dateStr
    }).returning();

    res.status(201).json({
      id: newExpense.id,
      description: newExpense.description,
      category: newExpense.category,
      amount: Number(newExpense.amount),
      date: newExpense.date
    });
  } catch (err: any) {
    console.error("Failed to insert expense into PostgreSQL:", err);
    res.status(500).json({ error: "Failed to create expense" });
  }
});

// 7. GET /api/finance/budgets & POST /api/finance/budgets
app.get("/api/finance/budgets", async (req, res) => {
  try {
    const defaultBudgets = {
      'Operations & IT': 180000,
      'Estates & Facilities': 140000,
      'Admissions & Outreach': 150000,
      'Academic Affairs': 600000,
      'General Administration': 95000
    };

    const dbState = await loadFullDatabaseState();
    const budgets = dbState.budgets || defaultBudgets;
    res.json(budgets);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch budgets" });
  }
});

app.post("/api/finance/budgets", async (req, res) => {
  const { department, amount } = req.body;
  if (!department || isNaN(Number(amount))) {
    return res.status(400).json({ error: "Invalid budget payload" });
  }
  try {
    const dbState = await loadFullDatabaseState();
    dbState.budgets = dbState.budgets || {
      'Operations & IT': 180000,
      'Estates & Facilities': 140000,
      'Admissions & Outreach': 150000,
      'Academic Affairs': 600000,
      'General Administration': 95000
    };
    dbState.budgets[department] = Number(amount);
    
    await db.insert(systemState)
      .values({ id: 1, data: dbState, updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({ target: systemState.id, set: { data: dbState, updatedAt: new Date().toISOString() } });

    res.json({ success: true, budgets: dbState.budgets });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update budget ceiling" });
  }
});

// 8. VOUCHERS API: GET, POST, PATCH approve
app.get("/api/finance/vouchers", async (req, res) => {
  try {
    const dbState = await loadFullDatabaseState();
    res.json(dbState.vouchers || []);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch vouchers" });
  }
});

app.post("/api/finance/vouchers", async (req, res) => {
  const { voucherNo, type, category, description, amount, date, approvedBy, status } = req.body;
  if (!type || !category || !amount || isNaN(Number(amount))) {
    return res.status(400).json({ error: "Invalid voucher fields" });
  }
  try {
    const newVoucher = {
      id: `v-${Date.now()}`,
      voucherNo: voucherNo || `VOU-${Math.floor(100 + Math.random() * 900)}`,
      type,
      category,
      description: description || "",
      amount: Number(amount),
      date: date || new Date().toISOString().substring(0, 10),
      approvedBy: approvedBy || "Grace Wanjiku (Accountant)",
      status: status || "Approved"
    };

    const dbState = await loadFullDatabaseState();
    dbState.vouchers = [newVoucher, ...(dbState.vouchers || [])];

    await db.insert(systemState)
      .values({ id: 1, data: dbState, updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({ target: systemState.id, set: { data: dbState, updatedAt: new Date().toISOString() } });

    // Insert into PostgreSQL expenses table if approved debit
    if (type === 'Debit' && newVoucher.status === 'Approved') {
      await db.insert(expenses).values({
        description: `[Voucher ${newVoucher.voucherNo}] ${newVoucher.description}`,
        category: newVoucher.category,
        amount: String(newVoucher.amount),
        date: newVoucher.date
      });
    }

    res.status(201).json(newVoucher);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create voucher" });
  }
});

app.patch("/api/finance/vouchers/:id/approve", async (req, res) => {
  const { id } = req.params;
  try {
    const dbState = await loadFullDatabaseState();
    dbState.vouchers = (dbState.vouchers || []).map((v: any) => {
      if (v.id === id) {
        return { ...v, status: 'Approved', approvedBy: 'System Admin' };
      }
      return v;
    });

    await db.insert(systemState)
      .values({ id: 1, data: dbState, updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({ target: systemState.id, set: { data: dbState, updatedAt: new Date().toISOString() } });

    const updatedVoucher = dbState.vouchers.find((v: any) => v.id === id);
    if (updatedVoucher && updatedVoucher.type === 'Debit') {
      await db.insert(expenses).values({
        description: `[Voucher ${updatedVoucher.voucherNo}] ${updatedVoucher.description} (Approved by Admin)`,
        category: updatedVoucher.category,
        amount: String(updatedVoucher.amount),
        date: updatedVoucher.date
      });
    }

    res.json({ success: true, voucher: updatedVoucher });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to approve voucher" });
  }
});

// 9. IMPRESTS API: GET, POST, PATCH status
app.get("/api/finance/imprests", async (req, res) => {
  try {
    const dbState = await loadFullDatabaseState();
    res.json(dbState.imprests || []);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch imprests" });
  }
});

app.post("/api/finance/imprests", async (req, res) => {
  const { staffName, amount, purpose } = req.body;
  if (!staffName || !amount || isNaN(Number(amount))) {
    return res.status(400).json({ error: "Invalid imprest fields" });
  }
  try {
    const newImprest = {
      id: `imp-${Date.now()}`,
      staffName,
      amount: Number(amount),
      purpose: purpose || "",
      status: 'pending',
      date: new Date().toISOString().substring(0, 10)
    };
    const dbState = await loadFullDatabaseState();
    dbState.imprests = [...(dbState.imprests || []), newImprest];

    await db.insert(systemState)
      .values({ id: 1, data: dbState, updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({ target: systemState.id, set: { data: dbState, updatedAt: new Date().toISOString() } });

    res.status(201).json(newImprest);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create imprest" });
  }
});

app.patch("/api/finance/imprests/:id/status", async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const dbState = await loadFullDatabaseState();
    let targetImp: any = null;

    dbState.imprests = (dbState.imprests || []).map((imp: any) => {
      if (imp.id === id) {
        targetImp = { ...imp, status };
        return targetImp;
      }
      return imp;
    });

    if (status === 'approved' && targetImp) {
      const vouNo = `VOU-${Math.floor(100 + Math.random() * 900)}`;
      const autoVoucher = {
        id: `v-${Date.now()}`,
        voucherNo: vouNo,
        type: 'Debit',
        category: 'General Administration',
        description: `[Automatic Petty Cash Allocation] Dispatched KES ${targetImp.amount.toLocaleString()} petty cash to ${targetImp.staffName}. Purpose: ${targetImp.purpose}`,
        amount: targetImp.amount,
        date: new Date().toISOString().substring(0, 10),
        approvedBy: 'Grace Wanjiku (Accountant)',
        status: 'Approved'
      };
      dbState.vouchers = [autoVoucher, ...(dbState.vouchers || [])];
      targetImp.voucherId = autoVoucher.id;

      await db.insert(expenses).values({
        description: `[Petty cash ${vouNo}] Allocated to ${targetImp.staffName}`,
        category: 'General Administration',
        amount: String(targetImp.amount),
        date: new Date().toISOString().substring(0, 10)
      });
    }

    await db.insert(systemState)
      .values({ id: 1, data: dbState, updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({ target: systemState.id, set: { data: dbState, updatedAt: new Date().toISOString() } });

    res.json({ success: true, imprest: targetImp });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update imprest status" });
  }
});

// 10. SUPPLIERS API: GET, POST, POST po, PATCH po status
app.get("/api/finance/suppliers", async (req, res) => {
  try {
    const dbState = await loadFullDatabaseState();
    res.json(dbState.suppliers || []);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
});

app.post("/api/finance/suppliers", async (req, res) => {
  const { companyName, contactPerson } = req.body;
  if (!companyName) return res.status(400).json({ error: "Supplier company name is required" });

  try {
    const newSup = {
      id: `sup-${Date.now()}`,
      companyName,
      contactPerson: contactPerson || "General Partner",
      status: "Active",
      balance: 0,
      purchaseOrders: []
    };
    const dbState = await loadFullDatabaseState();
    dbState.suppliers = [...(dbState.suppliers || []), newSup];

    await db.insert(systemState)
      .values({ id: 1, data: dbState, updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({ target: systemState.id, set: { data: dbState, updatedAt: new Date().toISOString() } });

    res.status(201).json(newSup);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to add supplier" });
  }
});

app.post("/api/finance/suppliers/po", async (req, res) => {
  const { supplierId, itemName, amount } = req.body;
  if (!supplierId || !itemName || !amount || isNaN(Number(amount))) {
    return res.status(400).json({ error: "Invalid PO fields" });
  }
  try {
    const val = Number(amount);
    const newPO = {
      id: `po-${Date.now()}`,
      poNo: `PO-${Math.floor(8000 + Math.random() * 1999)}`,
      itemName,
      amount: val,
      status: 'pending',
      date: new Date().toISOString().substring(0, 10)
    };

    const dbState = await loadFullDatabaseState();
    dbState.suppliers = (dbState.suppliers || []).map((sup: any) => {
      if (sup.id === supplierId) {
        return {
          ...sup,
          balance: (sup.balance || 0) + val,
          purchaseOrders: [...(sup.purchaseOrders || []), newPO]
        };
      }
      return sup;
    });

    await db.insert(systemState)
      .values({ id: 1, data: dbState, updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({ target: systemState.id, set: { data: dbState, updatedAt: new Date().toISOString() } });

    res.status(201).json(newPO);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to raise PO" });
  }
});

app.patch("/api/finance/suppliers/po/:id", async (req, res) => {
  const poId = req.params.id;
  const { supplierId, action } = req.body; // action: 'approve' | 'settle'
  try {
    const dbState = await loadFullDatabaseState();
    dbState.suppliers = (dbState.suppliers || []).map((sup: any) => {
      if (sup.id === supplierId) {
        const updatedPOs = (sup.purchaseOrders || []).map((po: any) => {
          if (po.id === poId) {
            if (action === 'approve') {
              return { ...po, status: 'approved' };
            } else if (action === 'settle') {
              return { ...po, status: 'paid' };
            }
          }
          return po;
        });

        let newBalance = sup.balance || 0;
        if (action === 'settle') {
          const poObj = sup.purchaseOrders?.find((p: any) => p.id === poId);
          if (poObj) newBalance = Math.max(0, newBalance - poObj.amount);
        }

        return { ...sup, balance: newBalance, purchaseOrders: updatedPOs };
      }
      return sup;
    });

    await db.insert(systemState)
      .values({ id: 1, data: dbState, updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({ target: systemState.id, set: { data: dbState, updatedAt: new Date().toISOString() } });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update PO" });
  }
});

// 11. BANK STATEMENTS & MANUAL MATCHING API
app.get("/api/finance/bank-statements", async (req, res) => {
  try {
    const allTx = await db.select().from(transactions);
    const dbState = await loadFullDatabaseState();
    const savedStatements = dbState.bankStatements || [];

    const statementsFromTx = allTx.map(tx => ({
      id: tx.id,
      date: new Date(tx.createdAt).toISOString().substring(0, 10),
      reference: tx.referenceNo,
      details: `${tx.description} (${tx.recipientSender})`,
      amount: Number(tx.amount),
      isMatched: savedStatements.find((s: any) => s.id === tx.id)?.isMatched || false,
      matchedTxId: savedStatements.find((s: any) => s.id === tx.id)?.matchedTxId
    }));

    res.json(statementsFromTx);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch bank statements" });
  }
});

app.post("/api/finance/bank-statements/match", async (req, res) => {
  const { statementId, studentId, invoiceId } = req.body;
  if (!statementId || !studentId || !invoiceId) {
    return res.status(400).json({ error: "Missing matching payload" });
  }

  try {
    const allTx = await db.select().from(transactions);
    const statement = allTx.find(t => t.id === statementId);
    const txAmount = statement ? Number(statement.amount) : 0;
    const txRef = statement ? statement.referenceNo : `TX-${Date.now()}`;

    // 1. Update invoice status in PostgreSQL
    await db.update(invoices)
      .set({ status: 'paid' })
      .where(eq(invoices.id, invoiceId));

    // 2. Create payment record in PostgreSQL
    await db.insert(payments).values({
      studentId,
      invoiceId,
      amount: String(txAmount),
      paymentMethod: txRef.toLowerCase().includes('mpesa') ? 'M-Pesa' : 'Bank Transfer',
      transactionId: txRef,
      date: new Date().toISOString().substring(0, 10),
      status: 'reconciled'
    });

    // 3. Create credit ledger entry in PostgreSQL
    await db.insert(studentLedger).values({
      studentId,
      entryType: 'CREDIT',
      voteHead: 'Tuition',
      amount: String(txAmount),
      description: `Manual Bank Statement Reconciled Ref: ${txRef}`
    });

    // 4. Record matched status in system state
    const dbState = await loadFullDatabaseState();
    dbState.bankStatements = dbState.bankStatements || [];
    dbState.bankStatements.push({ id: statementId, isMatched: true, matchedTxId: txRef });

    await db.insert(systemState)
      .values({ id: 1, data: dbState, updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({ target: systemState.id, set: { data: dbState, updatedAt: new Date().toISOString() } });

    res.json({ success: true, message: "Bank statement matched successfully" });
  } catch (err: any) {
    console.error("Failed to match bank statement in PostgreSQL:", err);
    res.status(500).json({ error: "Failed to match bank statement" });
  }
});

// 12. AUDITS API: GET & POST
app.get("/api/finance/audits", async (req, res) => {
  try {
    const dbState = await loadFullDatabaseState();
    res.json(dbState.audits || []);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

app.post("/api/finance/audits", async (req, res) => {
  const { action, resource, status, user, role } = req.body;
  if (!action || !resource) {
    return res.status(400).json({ error: "Action and resource are required" });
  }
  try {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const newLog = {
      id: `aud-${Date.now()}`,
      timestamp,
      user: user || 'Grace Wanjiku (Accountant)',
      role: role || 'Accountant',
      action,
      resource,
      status: status || 'Success'
    };

    const dbState = await loadFullDatabaseState();
    dbState.audits = [newLog, ...(dbState.audits || [])];

    await db.insert(systemState)
      .values({ id: 1, data: dbState, updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({ target: systemState.id, set: { data: dbState, updatedAt: new Date().toISOString() } });

    res.status(201).json(newLog);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to log audit" });
  }
});

// 6. REST Resource: Students with Server-Side Pagination, Filtering, Sorting, and Search
app.get("/api/students", async (req, res) => {
  try {
    const pageParam = parseInt(req.query.page as string, 10);
    const limitParam = parseInt(req.query.limit as string, 10);
    const searchParam = ((req.query.search as string) || "").trim();
    const cohortParam = ((req.query.cohort as string) || "").trim();
    const statusParam = ((req.query.accountStatus as string) || "").trim();
    const unitsParam = ((req.query.registeredUnits as string) || (req.query.units as string) || "").trim();
    const sortByParam = ((req.query.sortBy as string) || "").trim();
    const sortOrderParam = ((req.query.sortOrder as string) || "asc").toLowerCase() === "desc" ? "desc" : "asc";
    const isAllParam = req.query.all === "true";

    const page = !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit = !isNaN(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 25;
    const offset = (page - 1) * limit;

    // Build SQL conditions
    const conditions = [activeResourceCondition("student", students.id)];

    if (searchParam) {
      const searchPattern = `%${searchParam}%`;
      conditions.push(
        or(
          ilike(students.name, searchPattern),
          ilike(students.admissionNo, searchPattern),
          ilike(students.email, searchPattern),
          ilike(students.cohort, searchPattern),
          ilike(students.programme, searchPattern),
          ilike(students.department, searchPattern)
        )
      );
    }

    if (cohortParam && cohortParam !== "all" && cohortParam !== "All Cohorts") {
      conditions.push(eq(students.cohort, cohortParam));
    }

    if (statusParam && statusParam !== "all" && statusParam !== "All Statuses") {
      conditions.push(eq(students.accountStatus, statusParam));
    }

    if (unitsParam && unitsParam !== "all" && unitsParam !== "All Units") {
      const enrolledCountSubquery = sql<number>`(SELECT COUNT(*)::int FROM student_enrollments WHERE student_id = ${students.id})`;
      if (unitsParam === "0" || unitsParam === "none" || unitsParam === "no_units") {
        conditions.push(sql`${enrolledCountSubquery} = 0`);
      } else if (unitsParam === "1") {
        conditions.push(sql`${enrolledCountSubquery} = 1`);
      } else if (unitsParam === "2") {
        conditions.push(sql`${enrolledCountSubquery} = 2`);
      } else if (unitsParam === "3+" || unitsParam === "3_plus" || unitsParam === "3") {
        conditions.push(sql`${enrolledCountSubquery} >= 3`);
      } else if (unitsParam === "has_units") {
        conditions.push(sql`${enrolledCountSubquery} > 0`);
      } else if (!isNaN(parseInt(unitsParam, 10))) {
        conditions.push(sql`${enrolledCountSubquery} = ${parseInt(unitsParam, 10)}`);
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sorting Clause
    let orderByClause;
    const unitCountSubquery = sql<number>`(SELECT COUNT(*)::int FROM student_enrollments WHERE student_id = ${students.id})`;
    switch (sortByParam) {
      case "name":
      case "fullName":
      case "studentName":
        orderByClause = sortOrderParam === "desc" ? desc(students.name) : asc(students.name);
        break;
      case "cohort":
        orderByClause = sortOrderParam === "desc" ? desc(students.cohort) : asc(students.cohort);
        break;
      case "programme":
        orderByClause = sortOrderParam === "desc" ? desc(students.programme) : asc(students.programme);
        break;
      case "department":
        orderByClause = sortOrderParam === "desc" ? desc(students.department) : asc(students.department);
        break;
      case "accountStatus":
      case "status":
        orderByClause = sortOrderParam === "desc" ? desc(students.accountStatus) : asc(students.accountStatus);
        break;
      case "createdAt":
      case "dateRegistered":
      case "registrationDate":
      case "date":
        orderByClause = sortOrderParam === "desc" ? desc(students.createdAt) : asc(students.createdAt);
        break;
      case "registeredUnits":
      case "enrolledUnits":
      case "units":
        orderByClause = sortOrderParam === "desc" ? desc(unitCountSubquery) : asc(unitCountSubquery);
        break;
      case "admissionNo":
      default:
        orderByClause = sortOrderParam === "desc" ? desc(students.admissionNo) : asc(students.admissionNo);
        break;
    }

    // 1. Total matching count query
    const countRes = await db.select({ total: count() }).from(students).where(whereClause);
    const totalRecords = Number(countRes[0]?.total || 0);
    const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 1;

    // 2. Paginated student records query
    const studentRows = isAllParam 
      ? await db.select().from(students).where(whereClause).orderBy(orderByClause)
      : await db.select().from(students).where(whereClause).orderBy(orderByClause).limit(limit).offset(offset);

    const pageStudentIds = studentRows.map((s) => s.id);

    let enrollmentRows: any[] = [];
    let gradeRows: any[] = [];
    let invoiceRows: any[] = [];
    let paymentRows: any[] = [];
    let attendanceRows: any[] = [];

    if (pageStudentIds.length > 0) {
      enrollmentRows = await db.select().from(studentEnrollments).where(inArray(studentEnrollments.studentId, pageStudentIds));
      gradeRows = await db.select().from(grades).where(inArray(grades.studentId, pageStudentIds));
      invoiceRows = await db.select().from(invoices).where(inArray(invoices.studentId, pageStudentIds));
      paymentRows = await db.select().from(payments).where(inArray(payments.studentId, pageStudentIds));
      attendanceRows = await db.select().from(studentAttendance).where(inArray(studentAttendance.studentId, pageStudentIds));
    }

    const studentList = studentRows.map((s) => {
      const enrolledUnits = enrollmentRows.filter((e) => e.studentId === s.id).map((e) => e.courseCode);

      const studentGradesMap: Record<string, { cat: number; exam: number }> = {};
      gradeRows
        .filter((g) => g.studentId === s.id)
        .forEach((g) => {
          studentGradesMap[g.subjectCode] = {
            cat: g.catScore ? Number(g.catScore) : 0,
            exam: g.examScore ? Number(g.examScore) : 0,
          };
        });

      const ledgerList = invoiceRows
        .filter((i) => i.studentId === s.id)
        .map((i) => ({
          id: i.id,
          invoiceNo: i.invoiceNo,
          description: i.description,
          amount: Number(i.amount),
          date: i.date,
          status: i.status as "unpaid" | "paid",
        }));

      const paymentsList = paymentRows
        .filter((p) => p.studentId === s.id)
        .map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          invoiceId: p.invoiceId ?? "",
          studentId: p.studentId,
          paymentMethod: p.paymentMethod as "M-Pesa" | "Bank Transfer" | "Card",
          transactionId: p.transactionId,
          transactionRef: p.transactionId,
          date: p.date,
          status: p.status,
        }));

      const attendanceMap: Record<string, number> = {};
      attendanceRows
        .filter((a) => a.studentId === s.id)
        .forEach((a) => {
          attendanceMap[a.subjectCode] = Number(a.attendanceRate);
        });

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        admissionNo: s.admissionNo,
        cohort: s.cohort,
        programme: s.programme ?? undefined,
        department: s.department ?? undefined,
        avatar: s.avatar ?? "",
        accountStatus: s.accountStatus,
        createdAt: s.createdAt,
        enrolledUnits,
        grades: studentGradesMap,
        ledger: ledgerList,
        payments: paymentsList,
        attendance: attendanceMap,
      };
    });

    if (isAllParam) {
      res.json(studentList);
      return;
    }

    res.json({
      students: studentList,
      page,
      limit,
      totalRecords,
      totalPages,
    });
  } catch (err: any) {
    console.error("Failed to fetch paginated students from PostgreSQL:", err);
    // Fallback using cached database memory store
    const fullDb = getDatabase();
    let allStudents = fullDb.students || [];
    allStudents = allStudents.filter((student: any) => student.accountStatus !== "Archived");

    const searchParam = ((req.query.search as string) || "").toLowerCase().trim();
    const cohortParam = ((req.query.cohort as string) || "").trim();
    const statusParam = ((req.query.accountStatus as string) || "").trim();
    const unitsParam = ((req.query.registeredUnits as string) || (req.query.units as string) || "").trim();
    const sortByParam = ((req.query.sortBy as string) || "").trim();
    const sortOrderParam = ((req.query.sortOrder as string) || "asc").toLowerCase() === "desc" ? "desc" : "asc";

    if (searchParam) {
      allStudents = allStudents.filter(
        (s: any) =>
          s.name?.toLowerCase().includes(searchParam) ||
          s.admissionNo?.toLowerCase().includes(searchParam) ||
          s.email?.toLowerCase().includes(searchParam) ||
          s.cohort?.toLowerCase().includes(searchParam) ||
          s.programme?.toLowerCase().includes(searchParam) ||
          s.department?.toLowerCase().includes(searchParam)
      );
    }

    if (cohortParam && cohortParam !== "all" && cohortParam !== "All Cohorts") {
      allStudents = allStudents.filter((s: any) => s.cohort === cohortParam);
    }

    if (statusParam && statusParam !== "all" && statusParam !== "All Statuses") {
      allStudents = allStudents.filter((s: any) => s.accountStatus === statusParam);
    }

    if (unitsParam && unitsParam !== "all" && unitsParam !== "All Units") {
      if (unitsParam === "0" || unitsParam === "none" || unitsParam === "no_units") {
        allStudents = allStudents.filter((s: any) => (s.enrolledUnits?.length || 0) === 0);
      } else if (unitsParam === "1") {
        allStudents = allStudents.filter((s: any) => (s.enrolledUnits?.length || 0) === 1);
      } else if (unitsParam === "2") {
        allStudents = allStudents.filter((s: any) => (s.enrolledUnits?.length || 0) === 2);
      } else if (unitsParam === "3+" || unitsParam === "3_plus" || unitsParam === "3") {
        allStudents = allStudents.filter((s: any) => (s.enrolledUnits?.length || 0) >= 3);
      } else if (unitsParam === "has_units") {
        allStudents = allStudents.filter((s: any) => (s.enrolledUnits?.length || 0) > 0);
      }
    }

    allStudents.sort((a: any, b: any) => {
      let valA: any = "";
      let valB: any = "";

      switch (sortByParam) {
        case "name":
        case "fullName":
          valA = a.name || "";
          valB = b.name || "";
          break;
        case "cohort":
          valA = a.cohort || "";
          valB = b.cohort || "";
          break;
        case "programme":
          valA = a.programme || "";
          valB = b.programme || "";
          break;
        case "department":
          valA = a.department || "";
          valB = b.department || "";
          break;
        case "accountStatus":
          valA = a.accountStatus || "";
          valB = b.accountStatus || "";
          break;
        case "registeredUnits":
        case "enrolledUnits":
          valA = a.enrolledUnits?.length || 0;
          valB = b.enrolledUnits?.length || 0;
          break;
        case "createdAt":
          valA = a.createdAt || "";
          valB = b.createdAt || "";
          break;
        case "admissionNo":
        default:
          valA = a.admissionNo || "";
          valB = b.admissionNo || "";
          break;
      }

      if (valA < valB) return sortOrderParam === "desc" ? 1 : -1;
      if (valA > valB) return sortOrderParam === "desc" ? -1 : 1;
      return 0;
    });

    const pageParam = parseInt(req.query.page as string, 10);
    const limitParam = parseInt(req.query.limit as string, 10);
    const page = !isNaN(pageParam) && pageParam > 0 ? pageParam : 1;
    const limit = !isNaN(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : 25;

    const totalRecords = allStudents.length;
    const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 1;
    const offset = (page - 1) * limit;

    const sliced = allStudents.slice(offset, offset + limit);

    if (req.query.all === "true") {
      res.json(allStudents);
      return;
    }

    res.json({
      students: sliced,
      page,
      limit,
      totalRecords,
      totalPages,
    });
  }
});

app.post("/api/students", async (req, res) => {
  try {
    const studentData = req.body;

    if (
      !studentData?.name ||
      !studentData?.email 
    ) {
      return res.status(400).json({
        error: "Name and email required",
      });
    }
    const { plain: rawPass } = resolvePassword(studentData.passcode, "student");
    const hashedPasscode = (rawPass.startsWith('$2b$') || rawPass.startsWith('$2a$') || rawPass.startsWith('$2y$'))
      ? rawPass
      : hashPassword(rawPass);

    const result = await db.transaction(async (tx) => {
      // Create student
      const [student] = await tx
        .insert(students)
        .values({
          name: studentData.name,
          email: studentData.email,
          phone: studentData.phone,
          admissionNo: studentData.admissionNo,
          cohort: studentData.cohort,
          programme: studentData.programme ?? null,
          department: studentData.department ?? null,
          avatar: studentData.avatar ?? null,
          accountStatus: "Pending Setup",
        })
        .returning();

      return student;
    });

    const uid = studentData.admissionNo || result.id;
    try {
      await upsertUserAuthRecord({
        username: uid,
        email: studentData.email,
        passwordHash: hashedPasscode,
        role: "student",
        roleId: result.id,
        isActive: true,
        mustChangePassword: true,
      });
    } catch (e) {}

    // Sync database cache
    const fullDb = await loadFullDatabaseState();
    saveDatabase(fullDb);

    res.status(201).json(result);
  } catch (error: any) {
    console.error("Registration failed:", error);

    const isUniqueViolation =
      error?.code === "23505" ||
      error?.cause?.code === "23505" ||
      error?.originalError?.code === "23505" ||
      /unique constraint|duplicate key|already exists/i.test(error?.message || "");

    if (isUniqueViolation) {
      return res.status(409).json({
        message: "A student with this email already exists.",
        error: "A student with this email already exists.",
      });
    }

    res.status(500).json({
      error: error.message,
    });
  }
});

// Admin Route: archive a student without removing their academic record
app.patch("/api/students/:id/status", checkRBAC(["admin"]), async (req: any, res) => {
  try {
    const accountStatus = String(req.body?.accountStatus || "").trim();
    if (!accountStatus) return res.status(400).json({ error: "Account status is required" });
    if (accountStatus === "Archived") {
      return res.status(400).json({ error: "Use the archive endpoint so the record remains restorable and audited." });
    }

    const [student] = await db.update(students)
      .set({ accountStatus })
      .where(eq(students.id, req.params.id))
      .returning();
    if (!student) return res.status(404).json({ error: "Student not found" });

    const fullDb = await loadFullDatabaseState();
    saveDatabase(fullDb);
    res.json({ success: true, student });
  } catch (error: any) {
    console.error("Failed to update student status:", error);
    res.status(500).json({ error: error.message || "Failed to update student status" });
  }
});

// Archive registry: the normal delete action is a reversible soft delete.
app.post("/api/archive/:resourceType/:id", checkRBAC(["admin"]), async (req: any, res: any) => {
  const resourceType = req.params.resourceType as ArchivableResource;
  const resourceId = String(req.params.id || "").trim();
  if (!(resourceType in archiveResourceTables) || !resourceId) {
    return res.status(400).json({ success: false, error: "Unsupported archive resource." });
  }
  try {
    const record = await getArchivableRecord(resourceType, resourceId);
    if (!record) return res.status(404).json({ success: false, error: "Record not found." });
    const safeSnapshot = resourceType === "user"
      ? (() => { const { passwordHash, ...safeUser } = record; return safeUser; })()
      : record;
    await db.transaction(async (tx) => {
      await tx.insert(archiveRecords).values({
        resourceType,
        resourceId,
        displayName: archiveDisplayName(resourceType, record),
        snapshot: safeSnapshot,
        archivedBy: req.user?.userId || null,
      });
      await tx.insert(archiveAuditLogs).values({
        resourceType,
        resourceId,
        action: "ARCHIVED",
        performedBy: req.user?.userId || null,
        details: { displayName: archiveDisplayName(resourceType, record) },
      });
      if (resourceType === "student") {
        await tx.update(students).set({ accountStatus: "Archived" }).where(eq(students.id, resourceId));
      }
    });
    const fullDb = await loadFullDatabaseState();
    saveDatabase(fullDb);
    return res.json({ success: true, message: "Record archived. It can be restored later." });
  } catch (error: any) {
    if (error?.code === "23505") return res.status(409).json({ success: false, error: "This record is already archived." });
    console.error("Archive record failed:", error);
    return res.status(500).json({ success: false, error: "Unable to archive the record." });
  }
});

app.get("/api/archive", checkRBAC(["admin"]), async (req: any, res: any) => {
  try {
    const type = String(req.query.type || "").trim();
    const search = String(req.query.search || "").trim().toLowerCase();
    const from = String(req.query.from || "").trim();
    const to = String(req.query.to || "").trim();
    const sort = String(req.query.sort || "archivedAtDesc").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const orderBy = sort === "archivedAtAsc" ? asc(archiveRecords.archivedAt)
      : sort === "nameAsc" ? asc(archiveRecords.displayName)
      : sort === "nameDesc" ? desc(archiveRecords.displayName)
      : desc(archiveRecords.archivedAt);
    let records = await db.select().from(archiveRecords).orderBy(orderBy);
    records = records.filter((record) =>
      (!type || record.resourceType === type) &&
      (!search || `${record.displayName} ${record.resourceId}`.toLowerCase().includes(search)) &&
      (!from || record.archivedAt >= from) && (!to || record.archivedAt <= `${to}T23:59:59.999Z`),
    );
    const totalRecords = records.length;
    return res.json({ records: records.slice((page - 1) * limit, page * limit), page, limit, sort, totalRecords, totalPages: Math.max(1, Math.ceil(totalRecords / limit)) });
  } catch (error) {
    console.error("List archive failed:", error);
    return res.status(500).json({ success: false, error: "Unable to load archived records." });
  }
});

app.post("/api/archive/:resourceType/:id/restore", checkRBAC(["admin"]), async (req: any, res: any) => {
  const resourceType = req.params.resourceType as ArchivableResource;
  const resourceId = String(req.params.id || "").trim();
  if (!(resourceType in archiveResourceTables) || !resourceId) return res.status(400).json({ success: false, error: "Unsupported archive resource." });
  try {
    await db.transaction(async (tx) => {
      const archived = await tx.delete(archiveRecords).where(and(eq(archiveRecords.resourceType, resourceType), eq(archiveRecords.resourceId, resourceId))).returning();
      if (!archived.length) throw Object.assign(new Error("Record is not archived."), { statusCode: 404 });
      if (resourceType === "student") {
        const archivedStatus = typeof (archived[0].snapshot as any)?.accountStatus === "string"
          ? (archived[0].snapshot as any).accountStatus
          : "Active";
        await tx.update(students).set({ accountStatus: archivedStatus === "Archived" ? "Active" : archivedStatus }).where(eq(students.id, resourceId));
      }
      await tx.insert(archiveAuditLogs).values({ resourceType, resourceId, action: "RESTORED", performedBy: req.user?.userId || null });
    });
    const fullDb = await loadFullDatabaseState();
    saveDatabase(fullDb);
    return res.json({ success: true, message: "Record restored." });
  } catch (error: any) {
    return res.status(error?.statusCode || 500).json({ success: false, error: error?.message || "Unable to restore the record." });
  }
});

app.delete("/api/archive/:resourceType/:id/permanent", checkRBAC(["admin"]), async (req: any, res: any) => {
  const resourceType = req.params.resourceType as ArchivableResource;
  const resourceId = String(req.params.id || "").trim();
  if (!(resourceType in archiveResourceTables) || !resourceId) return res.status(400).json({ success: false, error: "Unsupported archive resource." });
  try {
    const archived = await db.select().from(archiveRecords).where(and(eq(archiveRecords.resourceType, resourceType), eq(archiveRecords.resourceId, resourceId))).limit(1);
    if (!archived.length) return res.status(409).json({ success: false, error: "Only archived records may be permanently deleted." });
    const dependencies = await dependencySummary(resourceType, resourceId);
    if (dependencies.length) return res.status(409).json({ success: false, error: "Permanent deletion is blocked by active references.", dependencies });
    await db.transaction(async (tx) => {
      const table = archiveResourceTables[resourceType];
      if (resourceType === "user") await tx.delete(users).where(eq(users.id, Number(resourceId)));
      else await tx.delete(table).where(eq(table.id, resourceId));
      await tx.delete(archiveRecords).where(and(eq(archiveRecords.resourceType, resourceType), eq(archiveRecords.resourceId, resourceId)));
      await tx.insert(archiveAuditLogs).values({ resourceType, resourceId, action: "PERMANENTLY_DELETED", performedBy: req.user?.userId || null });
    });
    return res.json({ success: true, message: "Record permanently deleted." });
  } catch (error) {
    console.error("Permanent archive deletion failed:", error);
    return res.status(500).json({ success: false, error: "Unable to permanently delete the record." });
  }
});

// Admin Route: Hard Delete / Purge User Account and automatically purge all associated relational records
app.delete(["/api/admin/users/:id", "/api/admin/users/[id]", "/api/students/:id"], checkRBAC(["admin"]), async (req: any, res: any) => {
  return res.status(410).json({
    success: false,
    error: "Direct deletion has been retired. Archive the record first; permanent deletion is available only from the Archive module after dependency checks.",
  });

  /* Legacy purge implementation intentionally retained below for historical reference,
     but unreachable so routine delete calls can never physically remove records. */
  try {
    const targetId = req.params.id;
    if (!targetId) {
      return res.status(400).json({ success: false, error: "User ID parameter is required for hard delete." });
    }

    let deletedCount = 0;

    // 1. Delete from PostgreSQL students table if matching ID, admissionNo, or email (cascades enrollments, grades, attendance, invoices, payments, ledger, reviews)
    try {
      const deletedStudents = await db.delete(students)
        .where(or(eq(students.id, targetId), eq(students.admissionNo, targetId), eq(students.email, targetId.toLowerCase())))
        .returning();
      deletedCount += deletedStudents.length;
    } catch (err) {
      console.warn("Notice: PostgreSQL students table purge warning:", err);
    }

    // 2. Delete from PostgreSQL lecturers table if matching ID, designatorCode, or email (cascades publications, research interests, office hours, subjects, reading lists)
    try {
      const deletedLecturers = await db.delete(lecturers)
        .where(or(eq(lecturers.id, targetId), eq(lecturers.designatorCode, targetId), eq(lecturers.email, targetId.toLowerCase())))
        .returning();
      deletedCount += deletedLecturers.length;
    } catch (err) {
      console.warn("Notice: PostgreSQL lecturers table purge warning:", err);
    }

    // 3. Delete from PostgreSQL users table by integer id, username, roleId, or email
    const numId = parseInt(targetId, 10);
    const userWhereClause = !isNaN(numId)
      ? or(eq(users.id, numId), eq(users.username, targetId), eq(users.roleId, targetId), eq(users.email, targetId.toLowerCase()))
      : or(eq(users.username, targetId), eq(users.roleId, targetId), eq(users.email, targetId.toLowerCase()));

    try {
      const deletedUsers = await db.delete(users).where(userWhereClause).returning();
      deletedCount += deletedUsers.length;
    } catch (err) {
      console.warn("Notice: PostgreSQL users table purge warning:", err);
    }

    // 4. Delete associated password reset requests and notifications
    try {
      await db.delete(passwordResetRequests).where(eq(passwordResetRequests.userId, targetId));
    } catch (err) {}
    try {
      await db.delete(notifications).where(eq(notifications.targetUserId, targetId));
    } catch (err) {}

    // Update in-memory JSON database cache
    const fullDb = getDatabase();
    if (fullDb.students) {
      fullDb.students = fullDb.students.filter((s: any) => s.id !== targetId && s.admissionNo !== targetId && s.email?.toLowerCase() !== targetId.toLowerCase());
    }
    if (fullDb.lecturers) {
      fullDb.lecturers = fullDb.lecturers.filter((l: any) => l.id !== targetId && l.designatorCode !== targetId && l.email?.toLowerCase() !== targetId.toLowerCase());
    }
    saveDatabase(fullDb);

    return res.status(200).json({
      success: true,
      message: "User permanently purged",
      purgedUserId: targetId,
      deletedCount
    });
  } catch (error: any) {
    console.error("Purge user error:", error);
    return res.status(500).json({ success: false, error: error.message || "Failed to purge user record." });
  }
});

// Admin Route: Generate temporary activation credentials / password reset
app.post("/api/students/:id/reset-password", checkRBAC(["admin"]), async (req: any, res: any) => {
  const studentId = typeof req.params.id === 'string' ? req.params.id.trim() : '';
  const requestId = crypto.randomUUID();

  try {
    if (!studentId) {
      return res.status(400).json({
        success: false,
        code: 'STUDENT_ID_REQUIRED',
        error: 'Student ID is required.',
      });
    }

    // The student identifier is deliberately supplied only in the route path.
    // Reject payloads so a client cannot accidentally target a different account
    // through a body field that the endpoint would otherwise ignore.
    if (req.body && Object.keys(req.body).length > 0) {
      return res.status(400).json({
        success: false,
        code: 'REQUEST_BODY_NOT_ALLOWED',
        error: 'This endpoint does not accept a request body; provide the student ID in the URL.',
      });
    }

    const { temporaryPasscode } = await resetStudentPassword(studentId);

    return res.status(200).json({
      success: true,
      message: "Student passcode reset successfully.",
      temporaryPasscode
    });
  } catch (error: any) {
    const isExpected = error instanceof PasswordResetError;
    const databaseErrorCode = error?.code || error?.cause?.code;
    const databaseErrorMessage = `${error?.message || ''} ${error?.cause?.message || ''}`.toLowerCase();
    const databaseUnavailable =
      ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', '57P01', '57P02'].includes(databaseErrorCode) ||
      databaseErrorMessage.includes('connection terminated') ||
      databaseErrorMessage.includes('connection timeout') ||
      databaseErrorMessage.includes('timeout expired');
    const status = isExpected ? error.statusCode : databaseUnavailable ? 503 : 500;
    const code = isExpected ? error.code : databaseUnavailable ? 'DATABASE_UNAVAILABLE' : 'PASSWORD_RESET_FAILED';
    const message = isExpected
      ? error.message
      : databaseUnavailable
        ? 'The database is temporarily unavailable. Please try again shortly.'
        : 'Unable to reset the student password. Please contact an administrator.';

    console.error('[password-reset] Request failed', {
      requestId,
      studentId: studentId || undefined,
      administratorId: req.user?.userId,
      code,
      error: error?.message,
      databaseCode: databaseErrorCode,
    });
    return res.status(status).json({ success: false, code, error: message });
  }
});

app.get("/api/student/dashboard-summary", async (req, res) => {
  try {
    const studentId = (req.query.studentId as string) || (req.headers["x-student-id"] as string);
    if (!studentId) {
      return res.status(400).json({ error: "studentId is required" });
    }

    const [studentRow] = await db
      .select()
      .from(students)
      .where(and(eq(students.id, studentId), activeResourceCondition("student", students.id)))
      .limit(1);

    if (!studentRow) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const enrollmentRows = await db
      .select()
      .from(studentEnrollments)
      .where(eq(studentEnrollments.studentId, studentId));

    const gradeRows = await db
      .select()
      .from(grades)
      .where(eq(grades.studentId, studentId));

    const attendanceRows = await db
      .select()
      .from(studentAttendance)
      .where(eq(studentAttendance.studentId, studentId));

    const invoiceRows = await db
      .select()
      .from(invoices)
      .where(eq(invoices.studentId, studentId));

    const courseRows = await db.select().from(courses).where(activeResourceCondition("course", courses.id));
    const activeCourseCount = courseRows.filter((c) => c.active !== false).length;

    const markToGpa = (mark: number): number => {
      if (mark >= 70) return 4.0;
      if (mark >= 60) return 3.0;
      if (mark >= 50) return 2.0;
      if (mark >= 40) return 1.0;
      return 0.0;
    };

    const gpaStanding = (gpa: number): string => {
      if (gpa >= 3.7) return "Excellent";
      if (gpa >= 3.0) return "Good";
      if (gpa >= 2.0) return "Satisfactory";
      if (gpa > 0) return "At Risk";
      return "N/A";
    };

    // GPA from real grades only
    let gpa: number | null = null;
    let gpaLabel = "N/A";
    if (gradeRows.length > 0) {
      const total = gradeRows.reduce((sum, g) => {
        const mark = Number(g.catScore || 0) + Number(g.examScore || 0);
        return sum + markToGpa(mark);
      }, 0);
      gpa = Number((total / gradeRows.length).toFixed(2));
      gpaLabel = gpaStanding(gpa);
    }

    // Cumulative GPA trend ordered by graded_at
    const sortedGrades = [...gradeRows].sort((a, b) =>
      String(a.gradedAt || "").localeCompare(String(b.gradedAt || ""))
    );
    let runningGpaSum = 0;
    const gpaTrend = sortedGrades.map((g, index) => {
      const mark = Number(g.catScore || 0) + Number(g.examScore || 0);
      runningGpaSum += markToGpa(mark);
      const pointGpa = Number((runningGpaSum / (index + 1)).toFixed(2));
      const dateLabel = g.gradedAt
        ? new Date(g.gradedAt).toLocaleDateString("en-GB", { month: "short", year: "2-digit" })
        : g.subjectCode;
      return {
        label: dateLabel,
        semester: dateLabel,
        GPA: pointGpa,
        subjectCode: g.subjectCode,
        gradedAt: g.gradedAt || null,
      };
    });

    // Attendance average only from enrolled units that have DB records
    const enrolledCodes = enrollmentRows.map((e) => e.courseCode);
    const attendanceByCode = new Map(
      attendanceRows.map((a) => [a.subjectCode, Number(a.attendanceRate)])
    );
    const attendanceValues = enrolledCodes
      .map((code) => attendanceByCode.get(code))
      .filter((v): v is number => typeof v === "number" && !Number.isNaN(v));

    const attendanceRate =
      attendanceValues.length > 0
        ? Number(
            (
              attendanceValues.reduce((s, v) => s + v, 0) / attendanceValues.length
            ).toFixed(1)
          )
        : null;

    const outstandingFees = invoiceRows
      .filter((i) => i.status === "unpaid")
      .reduce((sum, i) => sum + Number(i.amount || 0), 0);

    const completedUnits = gradeRows.filter((g) => {
      const mark = Number(g.catScore || 0) + Number(g.examScore || 0);
      return mark >= 40 && enrolledCodes.includes(g.subjectCode);
    }).length;

    // Curriculum size from active courses until a degree_requirements table exists
    const requiredUnits = Math.max(activeCourseCount, completedUnits, 1);
    const degreePercent = Math.min(
      100,
      Math.round((completedUnits / requiredUnits) * 100)
    );

    const gradedCodes = new Set(gradeRows.map((g) => g.subjectCode));
    const deliverables: Array<{
      id: string;
      title: string;
      detail: string;
      priority: "high" | "normal" | "done";
      type: string;
    }> = [];

    if (outstandingFees > 0) {
      deliverables.push({
        id: "fees",
        title: "Settle outstanding tuition fees",
        detail: `KES ${outstandingFees.toLocaleString()} unpaid on your finance ledger.`,
        priority: "high",
        type: "finance",
      });
    }

    const remainingToEnroll = Math.max(0, activeCourseCount - enrolledCodes.length);
    if (remainingToEnroll > 0) {
      deliverables.push({
        id: "enroll",
        title: "Complete unit registration",
        detail: `${remainingToEnroll} curriculum unit${remainingToEnroll === 1 ? "" : "s"} still available to enroll.`,
        priority: "normal",
        type: "enrollment",
      });
    }

    const awaitingGrades = enrolledCodes.filter((code) => !gradedCodes.has(code));
    if (awaitingGrades.length > 0) {
      deliverables.push({
        id: "grades",
        title: "Awaiting published grades",
        detail: `${awaitingGrades.length} enrolled module${awaitingGrades.length === 1 ? "" : "s"} without CAT/exam marks yet.`,
        priority: "normal",
        type: "grades",
      });
    }

    for (const code of enrolledCodes) {
      const rate = attendanceByCode.get(code);
      if (typeof rate === "number" && rate < 75) {
        deliverables.push({
          id: `att-${code}`,
          title: `Attendance below threshold (${code})`,
          detail: `Current rate ${rate}% — exam eligibility requires at least 75%.`,
          priority: "high",
          type: "attendance",
        });
      }
    }

    res.json({
      studentId,
      gpa,
      gpaLabel,
      attendanceRate,
      activeModules: enrolledCodes.length,
      outstandingFees,
      gpaTrend,
      degreeProgress: {
        completed: completedUnits,
        required: requiredUnits,
        percent: degreePercent,
        note:
          "Required units currently equal active courses in the catalogue until a degree_requirements table is added.",
      },
      deliverables,
      // Student timetable can join lecture_schedules once enrollments map to scheduled subjects.
      nextLecture: null,
      scheduleAvailable: false,
    });
  } catch (error: any) {
    console.error("Failed to build student dashboard summary:", error);
    res.status(500).json({ error: error.message || "Failed to load dashboard summary" });
  }
});

/** Resolve hourly rate: lecturer record first, else academic_ranks default when available. */
async function resolveLecturerHourlyRate(lecturerRow: {
  hourlyRate: string | number | null;
}): Promise<{ hourlyRate: number; rateSource: "lecturer" | "academic_rank" | "default" }> {
  const stored = Number(lecturerRow.hourlyRate);
  if (!Number.isNaN(stored) && stored > 0) {
    return { hourlyRate: stored, rateSource: "lecturer" };
  }

  try {
    const ranks = await db.select().from(academicRanks).limit(20);
    if (ranks.length > 0) {
      const fallback = Number(ranks[0].defaultHourlyRate);
      if (!Number.isNaN(fallback) && fallback > 0) {
        return { hourlyRate: fallback, rateSource: "academic_rank" };
      }
    }
  } catch {
    // academic_ranks may not be migrated yet
  }

  return { hourlyRate: 0, rateSource: "default" };
}

function startOfIsoWeek(d: Date): Date {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  if (day !== 1) date.setUTCDate(date.getUTCDate() - (day - 1));
  return date;
}

function formatIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

app.get("/api/lecturer/dashboard-summary", async (req, res) => {
  try {
    const lecturerId =
      (req.query.lecturerId as string) || (req.headers["x-lecturer-id"] as string);
    if (!lecturerId) {
      return res.status(400).json({ error: "lecturerId is required" });
    }

    const [lecturerRow] = await db
      .select()
      .from(lecturers)
      .where(and(eq(lecturers.id, lecturerId), activeResourceCondition("lecturer", lecturers.id)))
      .limit(1);

    if (!lecturerRow) {
      return res.status(404).json({ error: "Lecturer profile not found" });
    }

    const assignedSubjectRows = await db
      .select()
      .from(lecturerSubjects)
      .where(eq(lecturerSubjects.lecturerId, lecturerId));

    const assignedCodes = assignedSubjectRows.map((s) => s.subjectCode);
    const courseRows = await db.select().from(courses).where(activeResourceCondition("course", courses.id));
    const courseByCode = new Map(courseRows.map((c) => [c.code, c]));

    const assignedSubjects = assignedCodes.map((code) => ({
      code,
      title: courseByCode.get(code)?.title || code,
      label: `${code} – ${courseByCode.get(code)?.title || code}`,
    }));

    const sessionRows = await db
      .select()
      .from(teachingSessions)
      .where(eq(teachingSessions.lecturerId, lecturerId))
      .orderBy(desc(teachingSessions.sessionDate), desc(teachingSessions.createdAt));

    const loggedHours = Number(
      sessionRows
        .reduce((sum, s) => sum + Number(s.durationHours || 0), 0)
        .toFixed(2)
    );

    // Keep lecturers.logged_hours aligned with session totals (source of truth = sessions)
    const storedHours = Number(lecturerRow.loggedHours || 0);
    if (Math.abs(storedHours - loggedHours) > 0.001) {
      await db
        .update(lecturers)
        .set({ loggedHours: String(loggedHours) })
        .where(eq(lecturers.id, lecturerId));
    }

    const { hourlyRate, rateSource } = await resolveLecturerHourlyRate(lecturerRow);
    const estimatedPayout = Number((loggedHours * hourlyRate).toFixed(2));

    // Next scheduled class for an assigned subject only
    let nextClass: {
      subjectCode: string;
      subjectTitle: string;
      room: string;
      date: string;
      startTime: string;
      endTime: string;
    } | null = null;

    if (assignedCodes.length > 0) {
      const today = formatIsoDate(new Date());
      const scheduleRows = await db
        .select()
        .from(lectureSchedules)
        .where(
          and(
            eq(lectureSchedules.lecturerId, lecturerId),
            gte(lectureSchedules.sessionDate, today),
            inArray(lectureSchedules.subjectCode, assignedCodes)
          )
        )
        .orderBy(asc(lectureSchedules.sessionDate), asc(lectureSchedules.startTime));

      const nowMinutes = (() => {
        const n = new Date();
        return n.getHours() * 60 + n.getMinutes();
      })();

      const parseTimeToMinutes = (t: string): number => {
        const cleaned = t.trim().toUpperCase();
        const ampm = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
        if (ampm) {
          let h = parseInt(ampm[1], 10);
          const m = parseInt(ampm[2], 10);
          if (ampm[3] === "PM" && h < 12) h += 12;
          if (ampm[3] === "AM" && h === 12) h = 0;
          return h * 60 + m;
        }
        const parts = cleaned.split(":");
        return parseInt(parts[0] || "0", 10) * 60 + parseInt(parts[1] || "0", 10);
      };

      const upcoming = scheduleRows.find((row) => {
        if (row.sessionDate > today) return true;
        return parseTimeToMinutes(row.startTime) > nowMinutes;
      });

      if (upcoming) {
        nextClass = {
          subjectCode: upcoming.subjectCode,
          subjectTitle: courseByCode.get(upcoming.subjectCode)?.title || upcoming.subjectCode,
          room: upcoming.room,
          date: upcoming.sessionDate,
          startTime: upcoming.startTime,
          endTime: upcoming.endTime,
        };
      }
    }

    // Weekly teaching hours (last 4 calendar weeks including current)
    const weeklyHours: Array<{ name: string; hours: number; weekStart: string }> = [];
    const thisWeekStart = startOfIsoWeek(new Date());
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(thisWeekStart);
      weekStart.setUTCDate(weekStart.getUTCDate() - i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
      const startStr = formatIsoDate(weekStart);
      const endStr = formatIsoDate(weekEnd);
      const hours = Number(
        sessionRows
          .filter((s) => s.sessionDate >= startStr && s.sessionDate <= endStr)
          .reduce((sum, s) => sum + Number(s.durationHours || 0), 0)
          .toFixed(2)
      );
      weeklyHours.push({
        name: `Week ${4 - i}`,
        hours,
        weekStart: startStr,
      });
    }

    // Syllabus coverage: completed sessions vs planned topics for assigned subjects
    let plannedTopics = 0;
    let completedSessions = 0;
    let syllabusCoveragePercent: number | null = null;
    let syllabusNote =
      "No planned syllabus topics found for assigned subjects.";

    if (assignedCodes.length > 0) {
      const topicRows = await db
        .select()
        .from(syllabusTopics)
        .where(inArray(syllabusTopics.subjectCode, assignedCodes));
      plannedTopics = topicRows.length;
      completedSessions = sessionRows.filter((s) =>
        assignedCodes.includes(s.subjectCode)
      ).length;

      if (plannedTopics > 0) {
        syllabusCoveragePercent = Math.min(
          100,
          Math.round((completedSessions / plannedTopics) * 100)
        );
        syllabusNote =
          syllabusCoveragePercent >= 50
            ? "Module syllabus coverage is currently meeting standard milestone pacing."
            : "Syllabus coverage is below midpoint — log remaining planned topics.";
      } else {
        syllabusCoveragePercent = null;
        syllabusNote =
          "Add syllabus topics for assigned subjects to track curriculum coverage.";
      }
    } else {
      syllabusNote = "Assign subjects to this lecturer to track syllabus coverage.";
    }

    // Faculty tasks from live data
    const tasks: Array<{
      id: string;
      title: string;
      detail: string;
      priority: "high" | "normal" | "done";
      type: string;
      completed?: boolean;
    }> = [];

    if (assignedCodes.length > 0) {
      const enrollmentRows = await db
        .select()
        .from(studentEnrollments)
        .where(inArray(studentEnrollments.courseCode, assignedCodes));

      const enrolledStudentIds = [...new Set(enrollmentRows.map((e) => e.studentId))];
      const gradeRows =
        enrolledStudentIds.length > 0
          ? await db
              .select()
              .from(grades)
              .where(
                and(
                  inArray(grades.studentId, enrolledStudentIds),
                  inArray(grades.subjectCode, assignedCodes)
                )
              )
          : [];

      const gradeKey = (studentId: string, code: string) => `${studentId}::${code}`;
      const gradeMap = new Map(
        gradeRows.map((g) => [gradeKey(g.studentId, g.subjectCode), g])
      );

      let pendingCat = 0;
      let pendingExam = 0;
      for (const enr of enrollmentRows) {
        const g = gradeMap.get(gradeKey(enr.studentId, enr.courseCode));
        if (!g || Number(g.catScore) <= 0) pendingCat++;
        if (!g || Number(g.examScore) <= 0) pendingExam++;
      }

      if (pendingCat > 0) {
        tasks.push({
          id: "pending-cat",
          title: "Upload CAT Marks",
          detail: `${pendingCat} enrolled student-subject pair${pendingCat === 1 ? "" : "s"} missing CAT scores.`,
          priority: "high",
          type: "grading",
        });
      }

      if (pendingExam > 0) {
        tasks.push({
          id: "pending-exam",
          title: "Pending Exam Grading",
          detail: `${pendingExam} enrolled student-subject pair${pendingExam === 1 ? "" : "s"} without final exam marks.`,
          priority: "high",
          type: "grading",
        });
      }

      const attendanceRows =
        enrolledStudentIds.length > 0
          ? await db
              .select()
              .from(studentAttendance)
              .where(
                and(
                  inArray(studentAttendance.studentId, enrolledStudentIds),
                  inArray(studentAttendance.subjectCode, assignedCodes)
                )
              )
          : [];

      const attKey = (studentId: string, code: string) => `${studentId}::${code}`;
      const attSet = new Set(attendanceRows.map((a) => attKey(a.studentId, a.subjectCode)));
      let missingAttendance = 0;
      for (const enr of enrollmentRows) {
        if (!attSet.has(attKey(enr.studentId, enr.courseCode))) missingAttendance++;
      }

      if (missingAttendance > 0) {
        tasks.push({
          id: "missing-attendance",
          title: "Missing Attendance Submissions",
          detail: `${missingAttendance} enrollment${missingAttendance === 1 ? "" : "s"} have no attendance record yet.`,
          priority: "normal",
          type: "attendance",
        });
      }
    }

    if (nextClass) {
      tasks.push({
        id: "upcoming-class",
        title: `Upcoming Class: ${nextClass.subjectCode}`,
        detail: `${nextClass.subjectTitle} · ${nextClass.date} ${nextClass.startTime}–${nextClass.endTime} · ${nextClass.room}`,
        priority: "normal",
        type: "schedule",
      });
    } else if (assignedCodes.length > 0) {
      tasks.push({
        id: "no-upcoming",
        title: "No upcoming scheduled classes",
        detail: "No future timetable entries for your assigned subjects.",
        priority: "done",
        type: "schedule",
        completed: true,
      });
    }

    if (assignedCodes.length === 0) {
      tasks.push({
        id: "no-subjects",
        title: "No subjects assigned",
        detail: "Ask an administrator to allocate modules under lecturer_subjects.",
        priority: "high",
        type: "assignment",
      });
    }

    const recentSessions = sessionRows.slice(0, 50).map((s) => ({
      id: s.id,
      date: s.sessionDate,
      courseCode: s.subjectCode,
      topic: s.topic,
      hours: Number(s.durationHours),
      time: s.sessionTime,
      status: s.status as "Pending" | "Approved",
    }));

    res.json({
      lecturerId,
      name: lecturerRow.name,
      email: lecturerRow.email,
      designatorCode: lecturerRow.designatorCode,
      assignedSubjectsCount: assignedCodes.length,
      assignedSubjects,
      loggedHours,
      hourlyRate,
      rateSource,
      estimatedPayout,
      nextClass,
      weeklyHours,
      syllabusCoverage: {
        percent: syllabusCoveragePercent,
        completedSessions,
        plannedTopics,
        note: syllabusNote,
      },
      tasks,
      recentSessions,
    });
  } catch (error: any) {
    console.error("Failed to build lecturer dashboard summary:", error);
    res.status(500).json({ error: error.message || "Failed to load lecturer dashboard" });
  }
});

/** Lightweight student directory for lecturer autocomplete — identity fields only. */
app.get(
  "/api/lecturer/students",
  checkRBAC(["lecturer"]),
  async (req: any, res: any) => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      const lecturerId =
        (req.query.lecturerId as string) ||
        (req.headers["x-user-id"] as string) ||
        req.user?.userId;

      if (!lecturerId) {
        return res.status(400).json({ error: "lecturerId is required" });
      }

      const [lecturerRow] = await db
        .select({ id: lecturers.id })
        .from(lecturers)
        .where(and(eq(lecturers.id, lecturerId), activeResourceCondition("lecturer", lecturers.id)))
        .limit(1);

      if (!lecturerRow) {
        return res.status(404).json({ error: "Lecturer profile not found" });
      }

      // Prefer students enrolled in this lecturer's subjects; fall back to all for advisor lookup
      const assigned = await db
        .select({ subjectCode: lecturerSubjects.subjectCode })
        .from(lecturerSubjects)
        .where(eq(lecturerSubjects.lecturerId, lecturerId));
      const taughtCodes = assigned.map((a) => a.subjectCode);

      let studentRows;
      if (taughtCodes.length === 0) {
        return res.json([]);
      }

      const enrolledIds = await db
        .selectDistinct({ studentId: studentEnrollments.studentId })
        .from(studentEnrollments)
        .where(inArray(studentEnrollments.courseCode, taughtCodes));
      const ids = enrolledIds.map((e) => e.studentId);
      if (ids.length === 0) {
        return res.json([]);
      }
      studentRows = await db
        .select({
          id: students.id,
          name: students.name,
          admissionNo: students.admissionNo,
          cohort: students.cohort,
          avatar: students.avatar,
        })
        .from(students)
        .where(and(inArray(students.id, ids), activeResourceCondition("student", students.id)));

      const filtered = q
        ? studentRows.filter(
            (s) =>
              s.admissionNo.toLowerCase().includes(q.toLowerCase()) ||
              s.name.toLowerCase().includes(q.toLowerCase())
          )
        : studentRows;

      res.json(
        filtered.slice(0, 50).map((s) => ({
          id: s.id,
          name: s.name,
          admissionNo: s.admissionNo,
          cohort: s.cohort,
          avatar: s.avatar || null,
        }))
      );
    } catch (error: any) {
      console.error("Failed to list lecturer students:", error);
      res.status(500).json({ error: error.message || "Failed to list students" });
    }
  }
);

/** Full teaching-safe student profile for lecturer Student Lookup. */
app.get(
  "/api/lecturer/student-lookup",
  checkRBAC(["lecturer"]),
  async (req: any, res: any) => {
    try {
      const admissionNoQuery = req.query.admission_no || req.query.admissionNo;
      const studentIdQuery = req.query.studentId || req.query.student_id;
      const lecturerId =
        (req.query.lecturerId as string) ||
        (req.headers["x-user-id"] as string) ||
        req.user?.userId;

      if (!lecturerId) {
        return res.status(400).json({ error: "lecturerId is required" });
      }
      if (
        (!admissionNoQuery || typeof admissionNoQuery !== "string") &&
        (!studentIdQuery || typeof studentIdQuery !== "string")
      ) {
        return res.status(400).json({
          error: "admission_no or studentId query parameter is required",
        });
      }

      const [lecturerRow] = await db
        .select()
        .from(lecturers)
        .where(and(eq(lecturers.id, lecturerId), activeResourceCondition("lecturer", lecturers.id)))
        .limit(1);

      if (!lecturerRow) {
        return res.status(404).json({ error: "Lecturer profile not found" });
      }

      let studentRow;
      if (typeof studentIdQuery === "string" && studentIdQuery.trim()) {
        [studentRow] = await db
          .select()
          .from(students)
          .where(and(eq(students.id, studentIdQuery.trim()), activeResourceCondition("student", students.id)))
          .limit(1);
      } else {
        const admissionNo = String(admissionNoQuery).trim();
        [studentRow] = await db
          .select()
          .from(students)
          .where(and(ilike(students.admissionNo, admissionNo), activeResourceCondition("student", students.id)))
          .limit(1);
      }

      if (!studentRow) {
        return res.status(404).json({ error: "Student not found" });
      }

      const [
        enrollmentRows,
        gradeRows,
        attendanceRows,
        courseRows,
        invoiceRows,
        assignedSubjects,
        officeNotes,
      ] = await Promise.all([
        db
          .select()
          .from(studentEnrollments)
          .where(eq(studentEnrollments.studentId, studentRow.id)),
        db.select().from(grades).where(eq(grades.studentId, studentRow.id)),
        db
          .select()
          .from(studentAttendance)
          .where(eq(studentAttendance.studentId, studentRow.id)),
        db.select().from(courses).where(activeResourceCondition("course", courses.id)),
        db.select().from(invoices).where(eq(invoices.studentId, studentRow.id)),
        db
          .select({ subjectCode: lecturerSubjects.subjectCode })
          .from(lecturerSubjects)
          .where(eq(lecturerSubjects.lecturerId, lecturerId)),
        db
          .select()
          .from(officeHourSlots)
          .where(
            and(
              eq(officeHourSlots.studentId, studentRow.id),
              eq(officeHourSlots.lecturerId, lecturerId)
            )
          ),
      ]);

      const advisorNotes = officeNotes
        .filter((n) => n.studentNotes && n.studentNotes.trim())
        .map((n) => ({
          id: n.id,
          day: n.day,
          timeSlot: n.timeSlot,
          notes: n.studentNotes as string,
          lecturerName: lecturerRow.name,
        }));

      // Prefer a real semester label from exam_papers when available
      const [latestPaper] = await db
        .select({ semester: examPapers.semester })
        .from(examPapers)
        .orderBy(desc(examPapers.id))
        .limit(1);

      const view = buildLecturerStudentLookupView({
        student: studentRow,
        enrollments: enrollmentRows,
        gradeRows,
        attendanceRows,
        courseRows,
        invoiceRows,
        advisorNotes,
        taughtSubjectCodes: assignedSubjects.map((s) => s.subjectCode),
        semesterFromDb: latestPaper?.semester || null,
      });

      res.json(view);
    } catch (error: any) {
      console.error("Failed lecturer student lookup:", error);
      res.status(500).json({ error: error.message || "Failed to look up student" });
    }
  }
);

app.get("/api/lecturer/teaching-sessions", async (req, res) => {
  try {
    const lecturerId =
      (req.query.lecturerId as string) || (req.headers["x-lecturer-id"] as string);
    if (!lecturerId) {
      return res.status(400).json({ error: "lecturerId is required" });
    }

    const rows = await db
      .select()
      .from(teachingSessions)
      .where(eq(teachingSessions.lecturerId, lecturerId))
      .orderBy(desc(teachingSessions.sessionDate), desc(teachingSessions.createdAt));

    res.json(
      rows.map((s) => ({
        id: s.id,
        date: s.sessionDate,
        courseCode: s.subjectCode,
        topic: s.topic,
        hours: Number(s.durationHours),
        time: s.sessionTime,
        status: s.status,
      }))
    );
  } catch (error: any) {
    console.error("Failed to fetch teaching sessions:", error);
    res.status(500).json({ error: error.message || "Failed to fetch teaching sessions" });
  }
});

app.post("/api/lecturer/teaching-sessions", async (req, res) => {
  try {
    const {
      lecturerId,
      subjectCode,
      topic,
      durationHours,
      sessionDate,
      sessionTime,
    } = req.body || {};

    if (!lecturerId || !subjectCode || !topic || durationHours == null) {
      return res.status(400).json({
        error: "lecturerId, subjectCode, topic, and durationHours are required",
      });
    }

    const hrs = Number(durationHours);
    if (Number.isNaN(hrs) || hrs <= 0 || hrs > 12) {
      return res.status(400).json({
        error: "durationHours must be a number between 0.5 and 12",
      });
    }

    const [lecturerRow] = await db
      .select()
      .from(lecturers)
      .where(and(eq(lecturers.id, lecturerId), activeResourceCondition("lecturer", lecturers.id)))
      .limit(1);

    if (!lecturerRow) {
      return res.status(404).json({ error: "Lecturer profile not found" });
    }

    const assignment = await db
      .select()
      .from(lecturerSubjects)
      .where(
        and(
          eq(lecturerSubjects.lecturerId, lecturerId),
          eq(lecturerSubjects.subjectCode, subjectCode)
        )
      )
      .limit(1);

    if (assignment.length === 0) {
      return res.status(400).json({
        error: "Selected subject is not assigned to this lecturer",
      });
    }

    const dateStr =
      typeof sessionDate === "string" && sessionDate
        ? sessionDate
        : formatIsoDate(new Date());
    const timeStr =
      typeof sessionTime === "string" && sessionTime
        ? sessionTime
        : new Date().toTimeString().slice(0, 5);

    const [inserted] = await db
      .insert(teachingSessions)
      .values({
        lecturerId,
        subjectCode,
        topic: String(topic).trim(),
        durationHours: String(hrs),
        sessionDate: dateStr,
        sessionTime: timeStr,
        status: "Pending",
      })
      .returning();

    const allSessions = await db
      .select()
      .from(teachingSessions)
      .where(eq(teachingSessions.lecturerId, lecturerId));

    const totalLoggedHours = Number(
      allSessions
        .reduce((sum, s) => sum + Number(s.durationHours || 0), 0)
        .toFixed(2)
    );

    await db
      .update(lecturers)
      .set({ loggedHours: String(totalLoggedHours) })
      .where(eq(lecturers.id, lecturerId));

    const { hourlyRate } = await resolveLecturerHourlyRate(lecturerRow);
    const estimatedPayout = Number((totalLoggedHours * hourlyRate).toFixed(2));

    // Refresh in-memory / json cache when available
    try {
      const fullDb = await loadFullDatabaseState();
      saveDatabase(fullDb);
    } catch (e) {
      console.warn("Cache refresh after teaching session log failed:", e);
    }

    res.status(201).json({
      session: {
        id: inserted.id,
        date: inserted.sessionDate,
        courseCode: inserted.subjectCode,
        topic: inserted.topic,
        hours: Number(inserted.durationHours),
        time: inserted.sessionTime,
        status: inserted.status,
      },
      loggedHours: totalLoggedHours,
      hourlyRate,
      estimatedPayout,
    });
  } catch (error: any) {
    console.error("Failed to log teaching session:", error);
    res.status(500).json({ error: error.message || "Failed to log teaching session" });
  }
});

function mapAttendanceSessionRow(s: {
  id: string;
  lecturerId: string;
  subjectCode: string;
  sessionDate: string;
  presentStudentIds: string[] | null;
  absentStudentIds: string[] | null;
}) {
  return {
    id: s.id,
    lecturerId: s.lecturerId,
    date: s.sessionDate,
    subjectCode: s.subjectCode,
    presentStudents: Array.isArray(s.presentStudentIds) ? s.presentStudentIds : [],
    absentStudents: Array.isArray(s.absentStudentIds) ? s.absentStudentIds : [],
  };
}

async function recomputeSubjectAttendanceRates(
  subjectCode: string,
  studentIds: string[]
): Promise<Array<{ studentId: string; subjectCode: string; attendanceRate: number }>> {
  if (studentIds.length === 0) return [];

  const sessions = await db
    .select()
    .from(classAttendanceSessions)
    .where(eq(classAttendanceSessions.subjectCode, subjectCode));

  const rates: Array<{ studentId: string; subjectCode: string; attendanceRate: number }> = [];

  for (const studentId of studentIds) {
    const relevant = sessions.filter((s) => {
      const present = Array.isArray(s.presentStudentIds) ? s.presentStudentIds : [];
      const absent = Array.isArray(s.absentStudentIds) ? s.absentStudentIds : [];
      return present.includes(studentId) || absent.includes(studentId);
    });

    if (relevant.length === 0) continue;

    const presentCount = relevant.filter((s) =>
      (Array.isArray(s.presentStudentIds) ? s.presentStudentIds : []).includes(studentId)
    ).length;
    const attendanceRate = Math.round((presentCount / relevant.length) * 100);

    await db
      .insert(studentAttendance)
      .values({
        studentId,
        subjectCode,
        attendanceRate,
      })
      .onConflictDoUpdate({
        target: [studentAttendance.studentId, studentAttendance.subjectCode],
        set: { attendanceRate },
      });

    rates.push({ studentId, subjectCode, attendanceRate });
  }

  return rates;
}

app.get("/api/lecturer/attendance-sessions", async (req, res) => {
  try {
    const lecturerId =
      (req.query.lecturerId as string) || (req.headers["x-lecturer-id"] as string);
    const subjectCode = req.query.subjectCode as string | undefined;

    if (!lecturerId) {
      return res.status(400).json({ error: "lecturerId is required" });
    }

    const rows = subjectCode
      ? await db
          .select()
          .from(classAttendanceSessions)
          .where(
            and(
              eq(classAttendanceSessions.lecturerId, lecturerId),
              eq(classAttendanceSessions.subjectCode, subjectCode)
            )
          )
          .orderBy(desc(classAttendanceSessions.sessionDate))
      : await db
          .select()
          .from(classAttendanceSessions)
          .where(eq(classAttendanceSessions.lecturerId, lecturerId))
          .orderBy(desc(classAttendanceSessions.sessionDate));

    res.json(rows.map(mapAttendanceSessionRow));
  } catch (error: any) {
    console.error("Failed to fetch attendance sessions:", error);
    res.status(500).json({
      error: error.message || "Failed to fetch attendance sessions",
    });
  }
});

app.post("/api/lecturer/attendance-sessions", async (req, res) => {
  try {
    const {
      lecturerId,
      subjectCode,
      sessionDate,
      presentStudentIds,
      absentStudentIds,
    } = req.body || {};

    if (!lecturerId || !subjectCode || !sessionDate) {
      return res.status(400).json({
        error: "lecturerId, subjectCode, and sessionDate are required",
      });
    }

    const present = Array.isArray(presentStudentIds)
      ? presentStudentIds.filter((id: unknown) => typeof id === "string" && id)
      : [];
    const absent = Array.isArray(absentStudentIds)
      ? absentStudentIds.filter((id: unknown) => typeof id === "string" && id)
      : [];

    const [lecturerRow] = await db
      .select()
      .from(lecturers)
      .where(and(eq(lecturers.id, lecturerId), activeResourceCondition("lecturer", lecturers.id)))
      .limit(1);

    if (!lecturerRow) {
      return res.status(404).json({ error: "Lecturer profile not found" });
    }

    const assignment = await db
      .select()
      .from(lecturerSubjects)
      .where(
        and(
          eq(lecturerSubjects.lecturerId, lecturerId),
          eq(lecturerSubjects.subjectCode, subjectCode)
        )
      )
      .limit(1);

    if (assignment.length === 0) {
      return res.status(400).json({
        error: "Selected subject is not assigned to this lecturer",
      });
    }

    const [upserted] = await db
      .insert(classAttendanceSessions)
      .values({
        lecturerId,
        subjectCode,
        sessionDate,
        presentStudentIds: present,
        absentStudentIds: absent,
      })
      .onConflictDoUpdate({
        target: [
          classAttendanceSessions.lecturerId,
          classAttendanceSessions.subjectCode,
          classAttendanceSessions.sessionDate,
        ],
        set: {
          presentStudentIds: present,
          absentStudentIds: absent,
        },
      })
      .returning();

    const enrolled = await db
      .select()
      .from(studentEnrollments)
      .where(eq(studentEnrollments.courseCode, subjectCode));

    const enrolledIds = enrolled.map((e) => e.studentId);
    const touchedIds = [...new Set([...present, ...absent, ...enrolledIds])];
    const rates = await recomputeSubjectAttendanceRates(subjectCode, touchedIds);

    try {
      const fullDb = await loadFullDatabaseState();
      saveDatabase(fullDb);
    } catch (e) {
      console.warn("Cache refresh after attendance session failed:", e);
    }

    res.status(201).json({
      session: mapAttendanceSessionRow(upserted),
      rates,
    });
  } catch (error: any) {
    console.error("Failed to save attendance session:", error);
    res.status(500).json({
      error: error.message || "Failed to save attendance session",
    });
  }
});

app.get("/api/student/registered-units", checkRBAC(["student"]), async (req: any, res) => {
  try {
    const requestedStudentId = (req.query.studentId as string) || (req.headers["x-student-id"] as string);
    const studentId = req.user.userId as string;

    if (requestedStudentId && requestedStudentId !== studentId) {
      return res.status(403).json({ error: "Students can only view their own unit registrations." });
    }

    if (!studentId) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    const [activeStudent] = await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.id, studentId), activeResourceCondition("student", students.id)))
      .limit(1);
    if (!activeStudent) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    // Perform join between studentEnrollments relation and courses table using Drizzle ORM
    const activeEnrollments = await db
      .select({
        studentId: studentEnrollments.studentId,
        courseCode: studentEnrollments.courseCode,
        enrolledAt: studentEnrollments.enrolledAt,
        courseId: courses.id,
        courseTitle: courses.title,
        description: courses.description,
        duration: courses.duration,
        faculty: courses.faculty,
        fees: courses.fees,
        thumbnail: courses.thumbnail,
      })
      .from(studentEnrollments)
      .leftJoin(courses, eq(studentEnrollments.courseCode, courses.code))
      .where(eq(studentEnrollments.studentId, studentId));

    const attendanceLogs = await db
      .select()
      .from(studentAttendance)
      .where(eq(studentAttendance.studentId, studentId));

    // Calculate and aggregate dynamic metrics for each enrolled unit
    const result = activeEnrollments.map((item) => {
      const code = item.courseCode;
      const totalLectures = 16;
      const attRecord = attendanceLogs.find((a) => a.subjectCode === code);
      const attendanceRate = attRecord ? Number(attRecord.attendanceRate) : null;
      const attendedLectures =
        attendanceRate !== null
          ? Math.round((attendanceRate / 100) * totalLectures)
          : null;

      // Assignment submissions are not stored in a dedicated table yet.
      return {
        courseCode: item.courseCode,
        courseTitle: item.courseTitle,
        description: item.description,
        duration: item.duration,
        faculty: item.faculty,
        fees: item.fees,
        thumbnail: item.thumbnail,
        enrolledAt: item.enrolledAt,
        attendedLectures,
        totalLectures,
        lectures:
          attendedLectures !== null
            ? `${attendedLectures}/${totalLectures} lectures`
            : "No attendance recorded",
        attendanceRate,
        submittedAssignments: null,
        totalAssignments: null,
        assignments: "No assignment records",
        assignmentRate: null,
        overallProgress: attendanceRate,
        completionPercentage: attendanceRate,
      };
    });

    res.json(result);
  } catch (error: any) {
    console.error("Failed to fetch registered units:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/student-enrollments", checkRBAC(["student"]), async (req: any, res) => {
  try {
    const { studentId, courseCode } = req.body;

    if (!studentId || !courseCode) {
      return res.status(400).json({
        error: "studentId and courseCode are required",
      });
    }
    if (studentId !== req.user.userId) {
      return res.status(403).json({ error: "Students can only manage their own unit registrations." });
    }

    const [activeStudent, activeCourse] = await Promise.all([
      db.select({ id: students.id }).from(students).where(and(eq(students.id, studentId), activeResourceCondition("student", students.id))).limit(1),
      db.select({ id: courses.id }).from(courses).where(and(eq(courses.code, courseCode), activeResourceCondition("course", courses.id))).limit(1),
    ]);
    if (!activeStudent || !activeCourse) {
      return res.status(404).json({ error: "Active student or course not found." });
    }

    // Insert with onConflictDoNothing to gracefully handle duplicate enrollments
    const [enrollment] = await db
      .insert(studentEnrollments)
      .values({
        studentId,
        courseCode,
      })
      .onConflictDoNothing()
      .returning();

    const responseData = enrollment || {
      studentId,
      courseCode,
      alreadyEnrolled: true,
      message: "Unit module already registered.",
    };

    // Update cache in memory and local file directly to avoid slow db sync locks
    if (cachedDb && cachedDb.students) {
      const student = cachedDb.students.find((s: any) => s.id === studentId);
      if (student) {
        if (!student.enrolledUnits) {
          student.enrolledUnits = [];
        }
        if (!student.enrolledUnits.includes(courseCode)) {
          student.enrolledUnits.push(courseCode);
        }
      }
    }
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(cachedDb, null, 2), "utf-8");
    } catch (e) {
      console.error("Error writing fallback db_store.json", e);
    }

    res.status(201).json(responseData);
  } catch (error: any) {
    if (error.code === '23505' || (error.cause && error.cause.code === '23505')) {
      return res.status(200).json({
        studentId: req.body.studentId,
        courseCode: req.body.courseCode,
        alreadyEnrolled: true,
        message: "Student is already enrolled in this unit module",
      });
    }

    console.error("Failed to register unit:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});

app.delete("/api/student-enrollments", checkRBAC(["student"]), async (req: any, res) => {
  try {
    const studentId = (req.query.studentId as string) || (req.body?.studentId as string);
    const courseCode = (req.query.courseCode as string) || (req.body?.courseCode as string);

    if (!studentId || !courseCode) {
      return res.status(400).json({ error: "studentId and courseCode are required" });
    }
    if (studentId !== req.user.userId) {
      return res.status(403).json({ error: "Students can only manage their own unit registrations." });
    }

    const deadline = cachedDb?.registrationDeadline || "2026-08-15T23:59:59.000Z";
    if (Date.now() > new Date(deadline).getTime()) {
      return res.status(409).json({ error: "The registration deadline has passed. Submit a drop request for administrator approval." });
    }

    const [activeStudent] = await db
      .select({ id: students.id })
      .from(students)
      .where(and(eq(students.id, studentId), activeResourceCondition("student", students.id)))
      .limit(1);
    if (!activeStudent) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    await db
      .delete(studentEnrollments)
      .where(and(eq(studentEnrollments.studentId, studentId), eq(studentEnrollments.courseCode, courseCode)));

    if (cachedDb && cachedDb.students) {
      const student = cachedDb.students.find((s: any) => s.id === studentId);
      if (student && student.enrolledUnits) {
        student.enrolledUnits = student.enrolledUnits.filter((code: string) => code !== courseCode);
      }
    }
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(cachedDb, null, 2), "utf-8");
    } catch (e) {
      console.error("Error writing fallback db_store.json", e);
    }

    res.json({ success: true, message: `Deregistered unit ${courseCode}` });
  } catch (error: any) {
    console.error("Failed to deregister unit:", error);
    res.status(500).json({ error: error.message });
  }
});

// Unit Drop Requests & Registration Deadline Endpoints
app.get("/api/system/registration-deadline", (req, res) => {
  const deadline = cachedDb?.registrationDeadline || "2026-08-15T23:59:59.000Z";
  const isPastDeadline = Date.now() > new Date(deadline).getTime();
  res.json({ deadline, isPastDeadline });
});

app.post("/api/system/registration-deadline", checkRBAC(["admin"]), (req, res) => {
  const { deadline } = req.body;
  if (!deadline) {
    return res.status(400).json({ error: "deadline date string is required" });
  }
  if (!cachedDb) cachedDb = {};
  cachedDb.registrationDeadline = deadline;
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(cachedDb, null, 2), "utf-8");
  } catch (e) {
    console.error("Error updating registration deadline in DB store:", e);
  }
  const isPastDeadline = Date.now() > new Date(deadline).getTime();
  res.json({ success: true, deadline, isPastDeadline });
});

app.get("/api/unit-drop-requests", checkRBAC(["student", "admin"]), (req: any, res) => {
  const requestedStudentId = req.query.studentId as string;
  const studentId = req.user.role === "student" ? req.user.userId : requestedStudentId;
  if (req.user.role === "student" && requestedStudentId && requestedStudentId !== studentId) {
    return res.status(403).json({ error: "Students can only view their own drop requests." });
  }
  if (!cachedDb) cachedDb = {};
  if (!Array.isArray(cachedDb.dropRequests)) {
    cachedDb.dropRequests = [];
  }
  let list = cachedDb.dropRequests;
  if (studentId) {
    list = list.filter((r: any) => r.studentId === studentId);
  }
  res.json(list);
});

app.post("/api/unit-drop-requests", checkRBAC(["student"]), async (req: any, res) => {
  try {
    const { studentId, courseCode, unitName, reason } = req.body;
    if (!studentId || !courseCode) {
      return res.status(400).json({ error: "studentId and courseCode are required" });
    }
    if (studentId !== req.user.userId) {
      return res.status(403).json({ error: "Students can only manage their own unit registrations." });
    }

    const deadline = cachedDb?.registrationDeadline || "2026-08-15T23:59:59.000Z";
    if (Date.now() <= new Date(deadline).getTime()) {
      return res.status(409).json({ error: "Units can be dropped directly while registration is open." });
    }

    const [enrollment] = await db
      .select({ courseCode: studentEnrollments.courseCode })
      .from(studentEnrollments)
      .where(and(eq(studentEnrollments.studentId, studentId), eq(studentEnrollments.courseCode, courseCode)))
      .limit(1);
    if (!enrollment) {
      return res.status(404).json({ error: "Active unit registration not found." });
    }

    if (!cachedDb) cachedDb = {};
    if (!Array.isArray(cachedDb.dropRequests)) {
      cachedDb.dropRequests = [];
    }

    // Validation: Check for duplicate pending drop request
    const existingPending = cachedDb.dropRequests.find(
      (r: any) => r.studentId === studentId && r.courseCode === courseCode && r.status === "Pending Approval"
    );
    if (existingPending) {
      return res.status(400).json({ error: "A drop request for this unit is already pending approval." });
    }

    // Find student details
    const student = cachedDb.students?.find((s: any) => s.id === studentId);

    const newRequest = {
      id: crypto.randomUUID(),
      studentId,
      studentName: student ? student.name : "Student",
      admissionNo: student ? student.admissionNo || "" : "",
      courseCode,
      unitName: unitName || courseCode,
      reason: reason || "Requested unit drop after registration deadline",
      status: "Pending Approval",
      requestedAt: new Date().toISOString(),
    };

    cachedDb.dropRequests.unshift(newRequest);

    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(cachedDb, null, 2), "utf-8");
    } catch (e) {
      console.error("Error saving drop request to db_store.json:", e);
    }

    res.status(201).json({ success: true, dropRequest: newRequest });
  } catch (error: any) {
    console.error("Error creating unit drop request:", error);
    res.status(500).json({ error: error.message || "Failed to submit drop request" });
  }
});

app.post("/api/unit-drop-requests/:id/approve", checkRBAC(["admin"]), async (req: any, res) => {
  try {
    const { id } = req.params;
    if (!cachedDb || !Array.isArray(cachedDb.dropRequests)) {
      return res.status(404).json({ error: "Drop request not found" });
    }

    const request = cachedDb.dropRequests.find((r: any) => r.id === id);
    if (!request) {
      return res.status(404).json({ error: "Drop request not found" });
    }
    if (request.status !== "Pending Approval") {
      return res.status(409).json({ error: "Only pending drop requests can be approved." });
    }

    request.status = "Approved";
    request.processedBy = req.user.userId;
    request.processedAt = new Date().toISOString();

    // Remove registration from database
    await db
      .delete(studentEnrollments)
      .where(and(eq(studentEnrollments.studentId, request.studentId), eq(studentEnrollments.courseCode, request.courseCode)));

    if (cachedDb.students) {
      const student = cachedDb.students.find((s: any) => s.id === request.studentId);
      if (student && student.enrolledUnits) {
        student.enrolledUnits = student.enrolledUnits.filter((code: string) => code !== request.courseCode);
      }
    }

    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(cachedDb, null, 2), "utf-8");
    } catch (e) {
      console.error("Error updating DB store on drop approve:", e);
    }

    res.json({ success: true, message: `Approved drop request for ${request.courseCode}`, dropRequest: request });
  } catch (error: any) {
    console.error("Error approving drop request:", error);
    res.status(500).json({ error: error.message || "Failed to approve drop request" });
  }
});

app.post("/api/unit-drop-requests/:id/reject", checkRBAC(["admin"]), (req: any, res) => {
  try {
    const { id } = req.params;
    if (!cachedDb || !Array.isArray(cachedDb.dropRequests)) {
      return res.status(404).json({ error: "Drop request not found" });
    }

    const request = cachedDb.dropRequests.find((r: any) => r.id === id);
    if (!request) {
      return res.status(404).json({ error: "Drop request not found" });
    }
    if (request.status !== "Pending Approval") {
      return res.status(409).json({ error: "Only pending drop requests can be rejected." });
    }

    request.status = "Rejected";
    request.processedBy = req.user.userId;
    request.processedAt = new Date().toISOString();

    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(cachedDb, null, 2), "utf-8");
    } catch (e) {
      console.error("Error updating DB store on drop reject:", e);
    }

    res.json({ success: true, message: `Rejected drop request for ${request.courseCode}`, dropRequest: request });
  } catch (error: any) {
    console.error("Error rejecting drop request:", error);
    res.status(500).json({ error: error.message || "Failed to reject drop request" });
  }
});

//--payments
app.post("/api/payments", async (req, res) => {
  try {
    const paymentData = req.body;

    if (
      !paymentData?.studentId ||
      !paymentData?.amount ||
      !paymentData?.paymentMethod ||
      !paymentData?.transactionId
    ) {
      return res.status(400).json({
        error: "Missing payment details",
      });
    }
    if (!await activeStudentExists(paymentData.studentId)) {
      return res.status(404).json({ error: "Active student not found" });
    }

    const [payment] = await db
      .insert(payments)
      .values({
        studentId: paymentData.studentId,
        invoiceId: paymentData.invoiceId ?? null,
        amount: String(paymentData.amount),
        paymentMethod: paymentData.paymentMethod,
        transactionId: paymentData.transactionId,
        date: new Date().toISOString().split("T")[0],
        status: "unreconciled",
      })
      .returning();

    // Sync database cache
    const fullDb = await loadFullDatabaseState();
    saveDatabase(fullDb);

    res.status(201).json({
      ...payment,
      amount: Number(payment.amount)
    });
  } catch (error: any) {
    console.error("Failed to create payment:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});
// 7. REST Resource: Books
app.get("/api/books", async (req, res) => {
  try {
    const bookRows = await db.select().from(books).where(activeResourceCondition("book", books.id));
    const result = bookRows.map(b => ({
      id: b.id,
      title: b.title,
      author: b.author,
      isbn: b.isbn,
      publisher: b.publisher ?? "",
      edition: b.edition ?? "",
      purchasePrice: Number(b.purchasePrice),
      rackNumber: b.rackNumber,
      shelfRow: b.shelfRow,
      libraryCode: b.libraryCode,
      type: b.type,
      eUrl_aid: b.eUrl ?? undefined,
      copiesTotal: b.copiesTotal,
      copiesAvailable: b.copiesAvailable,
      category: b.category
    }));
    res.json(result);
  } catch (err: any) {
    console.error("Failed to fetch books:", err);
    res.json(getDatabase().books || []);
  }
});

app.post("/api/books", async (req, res) => {
  const bookData = req.body;
  if (!bookData || !bookData.title || !bookData.author) {
    res.status(400).json({ error: "Book title and author are required" });
    return;
  }

  try {
    const [book] = await db.insert(books).values({
      id: bookData.id || undefined,
      title: bookData.title,
      author: bookData.author,
      isbn: bookData.isbn || `ISBN-${Date.now()}`,
      publisher: bookData.publisher || null,
      edition: bookData.edition || null,
      purchasePrice: String(bookData.purchasePrice || 0),
      rackNumber: bookData.rackNumber || 'N/A',
      shelfRow: bookData.shelfRow || 'N/A',
      libraryCode: bookData.libraryCode || `LIB-${Date.now()}`,
      type: bookData.type || 'Physical Book',
      eUrl: bookData.eUrl_aid || null,
      copiesTotal: Number(bookData.copiesTotal) || 1,
      copiesAvailable: Number(bookData.copiesAvailable) || 1,
      category: bookData.category || 'General'
    }).onConflictDoUpdate({
      target: books.id,
      set: {
        title: bookData.title,
        author: bookData.author,
        isbn: bookData.isbn || undefined,
        publisher: bookData.publisher || null,
        edition: bookData.edition || null,
        purchasePrice: String(bookData.purchasePrice || 0),
        rackNumber: bookData.rackNumber || 'N/A',
        shelfRow: bookData.shelfRow || 'N/A',
        libraryCode: bookData.libraryCode || undefined,
        type: bookData.type || 'Physical Book',
        eUrl: bookData.eUrl_aid || null,
        copiesTotal: Number(bookData.copiesTotal) || 1,
        copiesAvailable: Number(bookData.copiesAvailable) || 1,
        category: bookData.category || 'General'
      }
    }).returning();

    // Sync database cache
    const fullDb = await loadFullDatabaseState();
    saveDatabase(fullDb);

    res.status(201).json({
      ...book,
      purchasePrice: Number(book.purchasePrice),
      eUrl_aid: book.eUrl || undefined
    });
  } catch (err: any) {
    console.error("Failed to create/update book:", err);
    res.status(500).json({ error: err.message });
  }
});

// REST Resource: Exam Papers
app.get("/api/exam-papers", async (req, res) => {
  try {
    const papers = await db.select().from(examPapers);
    const result = papers.map(ep => ({
      id: ep.id,
      title: ep.title,
      subjectCode: ep.subjectCode,
      year: ep.year,
      semester: ep.semester,
      examType: ep.examType,
      downloadUrl_aid: ep.downloadUrl,
      downloadsCount: ep.downloadsCount
    }));
    res.json(result);
  } catch (error) {
    console.error("Failed to fetch exam papers:", error);
    res.status(500).json({
      error: "Failed to fetch exam papers",
    });
  }
});

// 8. REST Resource: Loans
app.get("/api/loans", async (req, res) => {
  try {
    const loanRows = await db.select().from(loans);
    const result = loanRows.map(l => ({
      id: l.id,
      bookId: l.bookId,
      bookTitle: l.bookTitle,
      patronId: l.patronId,
      patronName: l.patronName,
      patronRole: l.patronRole,
      checkoutDate: l.checkoutDate,
      dueDate: l.dueDate,
      returnDate: l.returnDate ?? undefined,
      status: l.status,
      lateFeeAssessed: Number(l.lateFeeAssessed)
    }));
    res.json(result);
  } catch (err: any) {
    console.error("Failed to fetch loans:", err);
    res.json(getDatabase().loans || []);
  }
});

app.post("/api/loans", async (req, res) => {
  const loanData = req.body;
  if (!loanData || !loanData.bookId || !loanData.patronId) {
    res.status(400).json({ error: "Book ID and Patron ID are required" });
    return;
  }

  try {
    const [loan] = await db.insert(loans).values({
      id: loanData.id || undefined,
      bookId: loanData.bookId,
      bookTitle: loanData.bookTitle || 'N/A',
      patronId: loanData.patronId,
      patronName: loanData.patronName || 'N/A',
      patronRole: loanData.patronRole || 'student',
      checkoutDate: loanData.checkoutDate || new Date().toISOString().split('T')[0],
      dueDate: loanData.dueDate || new Date().toISOString().split('T')[0],
      returnDate: loanData.returnDate || null,
      status: loanData.status || 'borrowed',
      lateFeeAssessed: String(loanData.lateFeeAssessed || 0)
    }).onConflictDoUpdate({
      target: loans.id,
      set: {
        bookId: loanData.bookId,
        bookTitle: loanData.bookTitle || 'N/A',
        patronId: loanData.patronId,
        patronName: loanData.patronName || 'N/A',
        patronRole: loanData.patronRole || 'student',
        checkoutDate: loanData.checkoutDate || undefined,
        dueDate: loanData.dueDate || undefined,
        returnDate: loanData.returnDate || null,
        status: loanData.status || 'borrowed',
        lateFeeAssessed: String(loanData.lateFeeAssessed || 0)
      }
    }).returning();

    // Sync database cache
    const fullDb = await loadFullDatabaseState();
    saveDatabase(fullDb);

    res.status(201).json({
      ...loan,
      lateFeeAssessed: Number(loan.lateFeeAssessed)
    });
  } catch (err: any) {
    console.error("Failed to create/update loan:", err);
    res.status(500).json({ error: err.message });
  }
});

// 9. REST Resource: Library Gate Logs
app.get("/api/gate-logs", async (req, res) => {
  try {
    const logs = await db.select().from(libraryGateLogs);
    res.json(logs);
  } catch (err: any) {
    console.error("Failed to fetch gate logs:", err);
    res.json(getDatabase().libraryGateLogs || []);
  }
});

app.post("/api/gate-logs", async (req, res) => {
  const gateLog = req.body;
  if (!gateLog || !gateLog.patronName || !gateLog.gateAction) {
    res.status(400).json({ error: "Patron name and gate action are required" });
    return;
  }

  try {
    const ts = gateLog.timestamp ? new Date(gateLog.timestamp).toISOString() : new Date().toISOString();
    const [log] = await db.insert(libraryGateLogs).values({
      id: gateLog.id || undefined,
      timestamp: ts,
      patronName: gateLog.patronName,
      patronId: gateLog.patronId || '00000000-0000-0000-0000-000000000000',
      role: gateLog.role || 'student',
      authMethod: gateLog.authMethod || 'rfid_tap',
      gateAction: gateLog.gateAction || 'Entry'
    }).returning();

    // Sync database cache
    const fullDb = await loadFullDatabaseState();
    saveDatabase(fullDb);

    res.status(201).json(log);
  } catch (err: any) {
    console.error("Failed to create gate log:", err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// HTTP LISTENER LIFECYCLE (single instance)
// ==========================================

/** Exactly one HTTP server per process. Hot-reload closes this before exit. */
let httpServer: http.Server | null = null;
/** Prevents overlapping startServer() calls in the same process. */
let startupPromise: Promise<void> | null = null;
let isShuttingDown = false;
let shutdownHandlersRegistered = false;

function describePortOccupant(port: number): string {
  try {
    const out = execSync(
      `ss -tlnp "sport = :${port}" 2>/dev/null || lsof -nP -iTCP:${port} -sTCP:LISTEN 2>/dev/null || true`,
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
    ).trim();
    return out || "(unable to identify process)";
  } catch {
    return "(unable to identify process)";
  }
}

function isPortFree(port: number, host = "0.0.0.0"): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = net
      .createServer()
      .once("error", () => resolve(false))
      .once("listening", () => {
        tester.close(() => resolve(true));
      })
      .listen(port, host);
  });
}

/** Wait briefly so a previous watcher process can release the port after SIGTERM. */
async function waitForPortFree(port: number, attempts = 20, delayMs = 150): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    if (await isPortFree(port)) return true;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

async function closeHttpServer(): Promise<void> {
  if (!httpServer) return;
  const server = httpServer;
  httpServer = null;
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
    if (typeof server.closeAllConnections === "function") {
      server.closeAllConnections();
    }
  });
}

function registerShutdownHandlers() {
  if (shutdownHandlersRegistered) return;
  shutdownHandlersRegistered = true;

  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(
      `Received ${signal}; closing HTTP listener and database pool (pid=${process.pid}, port=${PORT})`
    );
    try {
      await closeHttpServer();
      console.log(`HTTP listener closed gracefully (pid=${process.pid})`);
    } catch (err) {
      console.error(`Error while closing HTTP listener:`, err);
    }
    try {
      await closePool();
    } catch (err) {
      console.error(`Error while closing database connection pool:`, err);
    }
    process.exit(0);
  };

  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
  process.once("SIGUSR2", () => void shutdown("SIGUSR2"));
}

async function bindHttpServer(): Promise<"newly-started" | "reused"> {
  let mode: "newly-started" | "reused" = "newly-started";

  if (httpServer?.listening) {
    console.log(
      `Existing in-process listener found — closing before rebind (pid=${process.pid}, port=${PORT})`
    );
    await closeHttpServer();
    mode = "reused";
  }

  const free = await waitForPortFree(PORT);
  if (!free) {
    const occupant = describePortOccupant(PORT);
    console.error(
      `Port ${PORT} is occupied by a stale or external process. Refusing to start a second listener.`
    );
    console.error(`Occupant:\n${occupant}`);
    console.error(
      `Fix: stop that process, then retry. Example: fuser -k ${PORT}/tcp`
    );
    process.exit(1);
  }

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(PORT, "0.0.0.0", () => resolve());
    httpServer = server;
    server.once("error", (err: NodeJS.ErrnoException) => {
      httpServer = null;
      if (err.code === "EADDRINUSE") {
        const occupant = describePortOccupant(PORT);
        console.error(
          `Port ${PORT} became busy during bind (EADDRINUSE). Another process owns the port.`
        );
        console.error(`Occupant:\n${occupant}`);
        console.error(
          `Fix: stop that process, then retry. Example: fuser -k ${PORT}/tcp`
        );
      }
      reject(err);
    });
  });

  return mode;
}

async function startServer() {
  // Idempotent: concurrent callers share one startup chain.
  if (startupPromise) {
    console.log(
      `Startup already in progress — awaiting existing startup (pid=${process.pid}, port=${PORT})`
    );
    return startupPromise;
  }

  startupPromise = (async () => {
    try {
      await runMigrations();
    } catch (migrationErr) {
      console.error("[Startup] Database migrations failed:", migrationErr);
      console.warn("[Startup] Proceeding with database initialization...");
    }
    // Initialize the PostgreSQL database state (or fallback store if offline)
    await initPostgresDB();
    const dbStateForAuth = getDatabase();
    await migrateAuthSchemaAndData(dbStateForAuth);

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `Development mode ready (pid=${process.pid}, port=${PORT})`
      );
    } else {
      // Production Mode: Serve compiled static frontend bundle from frontend workspace
      const distPath = path.resolve(process.cwd(), "../frontend/dist");
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
        app.get("*", (req, res) => {
          res.sendFile(path.join(distPath, "index.html"));
        });
        console.log("Production static build routing loaded from " + distPath);
      } else {
        app.get("/", (req, res) => {
          res.json({ message: "Zenti School Portal Backend API is running." });
        });
        console.log("Production mode: frontend build directory not found, serving API only");
      }
    }

    if (process.env.VERCEL) {
      console.log(`Vercel mode — skipping app.listen (pid=${process.pid})`);
      return;
    }

    registerShutdownHandlers();
    const startMode = await bindHttpServer();
    console.log(
      `${startMode === "reused" ? "Listener reused" : "Newly started"} | pid=${process.pid} | port=${PORT}`
    );
  })();

  try {
    await startupPromise;
  } catch (err) {
    startupPromise = null;
    throw err;
  }
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

export default app;
