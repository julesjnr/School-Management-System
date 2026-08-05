import dotenv from 'dotenv';
dotenv.config({ override: true });
import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { createCorsMiddleware } from "./src/cors.ts";
import { db } from "./src/db/index.ts";
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
} from "./src/db/schema.ts";
import { eq, notInArray, and, or, desc, asc, count, ilike, inArray, sql } from "drizzle-orm";
import { supabase } from "./src/db/supabaseClient.ts";
import {
  hashPassword,
  verifyPassword,
  resolvePassword,
  upsertUserAuthRecord,
  sanitizeProfile,
  issueAuthToken,
  migrateAuthSchemaAndData,
  authenticateUser,
  changeUserPassword,
  adminResetUserPassword,
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
const PORT = Number(process.env.PORT) || 3000;

// Set up larger limit for full state synchronizations
app.use(express.json({ limit: "20mb" }));

// JWT Secret Key configuration (loads from environment, fallback to secure random on the fly)
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

// CORS must be enabled on the API layer that serves database routes.
app.use(createCorsMiddleware());

const DB_FILE = path.join(process.cwd(), "db_store.json");

// Local cache for Postgres DB state to support synchronous access inside existing API controllers
let cachedDb: any = null;

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

  // 1. Courses
  const courseRows = await db.select().from(courses);
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
  const lecturerRows = await db.select().from(lecturers);
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
  const studentRows = await db.select().from(students);
  const enrollmentRows = await db.select().from(studentEnrollments);
  const gradeRows = await db.select().from(grades);
  const invoiceRows = await db.select().from(invoices);
  const paymentRows = await db.select().from(payments);
  const attendanceRows = await db.select().from(studentAttendance);

  const oldStudents = dbState.students || [];

  dbState.students = studentRows.map(s => {
    const enrolledUnits = enrollmentRows.filter(e => e.studentId === s.id).map(e => e.courseCode);
    
    const studentGrades: Record<string, { cat: number; exam: number }> = {};
    gradeRows.filter(g => g.studentId === s.id).forEach(g => {
      studentGrades[g.subjectCode] = {
        cat: g.catScore ? Number(g.catScore) : 0,
        exam: g.examScore ? Number(g.examScore) : 0
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
    const accountStatus = cachedStatus || "Active";

    return {
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      admissionNo: s.admissionNo,
      cohort: s.cohort,
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
  const bookRows = await db.select().from(books);
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
  const loanRows = await db.select().from(loans);
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
  const reservationRows = await db.select().from(reservations);
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
  const readingListRows = await db.select().from(readingLists);
  const readingListBookRows = await db.select().from(readingListBooks);
  dbState.readingLists = readingListRows.map(rl => ({
    id: rl.id,
    subjectCode: rl.subjectCode,
    lecturerId: rl.lecturerId,
    notes: rl.notes ?? "",
    bookIds: readingListBookRows.filter(b => b.readingListId === rl.id).map(b => b.bookId)
  }));

  // 13. Book Reviews
  const bookReviewRows = await db.select().from(bookReviews);
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

async function performDatabaseSync(dbState: any): Promise<void> {
  isSavingFullState = true;
  lastSaveTime = Date.now();

  try {
    // Full-state sync touches many tables. Keep it on one pooled connection and
    // roll it back as a unit if the database connection is interrupted.
    await db.transaction(async (tx) => {
    // 1. Courses
    if (dbState.courses) {
      const ids = dbState.courses.map((c: any) => c.id).filter(Boolean);
      if (ids.length > 0) {
        await tx.delete(courses).where(notInArray(courses.id, ids));
      } else {
        await tx.delete(courses);
      }
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
      const ids = dbState.lecturers.map((l: any) => l.id).filter(Boolean);
      if (ids.length > 0) {
        await tx.delete(lecturers).where(notInArray(lecturers.id, ids));
      } else {
        await tx.delete(lecturers);
      }

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
      const ids = dbState.students.map((s: any) => s.id).filter(Boolean);
      if (ids.length > 0) {
        await tx.delete(students).where(notInArray(students.id, ids));
      } else {
        await tx.delete(students);
      }

      for (const s of dbState.students) {
        const studentVal = {
          id: s.id,
          name: s.name,
          email: s.email,
          phone: s.phone,
          admissionNo: s.admissionNo,
          cohort: s.cohort,
          avatar: s.avatar || null,
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
      const ids = dbState.books.map((b: any) => b.id).filter(Boolean);
      if (ids.length > 0) {
        await tx.delete(books).where(notInArray(books.id, ids));
      } else {
        await tx.delete(books);
      }
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

    });
    syncFailureCount = 0; // Reset on successful write
  } catch (err: any) {
    syncFailureCount++;
    const backoffDelay = Math.min(30000 * Math.pow(2, syncFailureCount - 1), 300000);
    isSyncPausedUntil = Date.now() + backoffDelay;
    console.error(`[DB TUNER] Relational database synchronization failed (${syncFailureCount} consecutive failures). Pausing database writes for ${backoffDelay / 1000} seconds. Error:`, err);
    throw err;
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
    if (!process.env.SQL_HOST || !process.env.SQL_PASSWORD || !process.env.SQL_USER || !process.env.SQL_DB_NAME) {
      throw new Error("Missing database environment variables (SQL_HOST, SQL_PASSWORD, SQL_USER, or SQL_DB_NAME). Please configure your local .env file.");
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

// Helper to hash plain-text passcodes in memory before writing to DB
function hashPasscodesInState(dbState: any) {
  if (!dbState) return;
  if (Array.isArray(dbState.students)) {
    for (const s of dbState.students) {
      if (s.passcode && typeof s.passcode === 'string' && !s.passcode.startsWith('$2b$') && !s.passcode.startsWith('$2a$') && !s.passcode.startsWith('$2y$')) {
        s.passcode = bcrypt.hashSync(s.passcode, 10);
      }
    }
  }
  if (Array.isArray(dbState.lecturers)) {
    for (const l of dbState.lecturers) {
      if (l.passcode && typeof l.passcode === 'string' && !l.passcode.startsWith('$2b$') && !l.passcode.startsWith('$2a$') && !l.passcode.startsWith('$2y$')) {
        l.passcode = bcrypt.hashSync(l.passcode, 10);
      }
    }
  }
}

// Helper to save database state
function saveDatabase(dbState: any) {
  hashPasscodesInState(dbState);
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
    // Only trust the verified role propagated from the JWT token header
    const userRole = req.headers["x-user-role"];
    
    // Explicitly block students from administrative routes and restrict write access
    if (userRole === "student" && (req.path.startsWith("/api/admin") || req.path.startsWith("/admin"))) {
      return res.status(403).json({
        success: false,
        error: "Access Denied: Students are technically blocked from accessing administrative routes.",
        code: "RBAC_STUDENT_RESTRICTED",
        allowedRoles
      });
    }

    // Default permission checks
    if (req.path.startsWith("/api/admin")) {
      if (!userRole) {
        return res.status(403).json({
          success: false,
          error: "Access Denied: Unauthenticated access to administrative routes is strictly forbidden.",
          code: "RBAC_UNAUTHENTICATED"
        });
      }
      if (!allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          error: `Access Denied: Users with role '${userRole}' are not permitted to access this administrative route.`,
          code: "RBAC_FORBIDDEN_ROLE"
        });
      }
    }

    next();
  };
}

// JWT Verification Middleware
function authenticateJWT(req: any, res: any, next: any) {
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
  "/api/auth/reset-request",
  "/api/auth/reset-requests",
  "/api/data",
  "/api/student/registered-units",
  "/api/student-enrollments",
  "/api/students",
  "/api/public/consultations",
  "/api/public/applications"
];

// Mount JWT Protection Middleware globally across all /api routes except public endpoints
app.use("/api", (req: any, res: any, next: any) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  
  const pathWithoutQuery = req.path.split('?')[0];
  const fullPath = req.baseUrl + pathWithoutQuery;
  const relativePath = '/api' + pathWithoutQuery;
  
  const isPublic = 
    publicAPIPaths.includes(fullPath) || 
    publicAPIPaths.includes(relativePath) ||
    (relativePath === "/api/courses" && req.method === "GET") ||
    (req.method === "GET" && /^\/api\/courses\/[^/]+\/gallery$/.test(relativePath));
  if (isPublic) {
    return next();
  }
  
  authenticateJWT(req, res, next);
});

const ADMIN_ROLES = ["admin", "super_admin", "admissions_officer"];
const APPLICATION_DOCUMENT_TYPES = new Set(["passport_photo", "national_id", "kcse_certificate", "academic_certificate", "recommendation_letter"]);
const APPLICATION_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function cleanText(value: unknown, max = 5000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function requireAdminRole(req: any, res: any): boolean {
  if (!ADMIN_ROLES.includes(req.user?.role)) {
    res.status(403).json({ error: "Admissions administrator access is required." });
    return false;
  }
  return true;
}

async function writeAdminAudit(req: any, action: string, resourceType: string, resourceId: string, details: Record<string, unknown> = {}) {
  try {
    await db.execute(sql`INSERT INTO admin_audit_logs (actor_id, actor_role, action, resource_type, resource_id, details)
      VALUES (${req.user?.userId || null}, ${req.user?.role || null}, ${action}, ${resourceType}, ${resourceId}, ${JSON.stringify(details)}::jsonb)`);
  } catch (error: any) {
    console.error("[audit] failed to write audit event", { action, resourceType, resourceId, error: error?.message });
  }
}

async function recordRoleMismatchLoginAttempt(req: any, identifier: string, attemptedPortal: string, actualRole: string) {
  const ipAddress = String(req.headers['x-forwarded-for'] || req.ip || req.connection?.remoteAddress || '').split(',')[0].trim();
  try {
    await db.execute(sql`INSERT INTO admin_audit_logs (actor_id, actor_role, action, resource_type, resource_id, details)
      VALUES (${null}, ${null}, 'login.role_mismatch', 'auth', ${identifier || null}, ${JSON.stringify({
        attemptedPortal,
        actualRole,
        ipAddress,
        timestamp: new Date().toISOString(),
      })}::jsonb)`);
  } catch (error: any) {
    console.error("[auth] failed to record role mismatch login attempt", { identifier, attemptedPortal, actualRole, error: error?.message });
  }
}

async function queueEmail(eventKey: string, recipient: string, subject: string, body: string) {
  try {
    await db.execute(sql`INSERT INTO email_outbox (event_key, recipient, subject, body)
      VALUES (${eventKey}, ${recipient}, ${subject}, ${body}) ON CONFLICT (event_key) DO NOTHING`);
  } catch (error: any) {
    // An outbox failure must be visible but must not roll back the user request.
    console.error("[email-outbox] unable to queue notification", { eventKey, recipient, error: error?.message });
  }
}

async function generateAdmissionNumber(): Promise<string> {
  let admissionNo: string;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    admissionNo = `ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const exists = await db.execute(sql`SELECT 1 FROM students WHERE admission_no=${admissionNo} LIMIT 1`);
    if (!exists.rows.length) return admissionNo;
  }
  return `ADM-${new Date().getFullYear()}-${Date.now()}`;
}

async function createStudentFromApplication(application: any) {
  if (!application || !application.email || !application.fullName) return null;

  const existing = await db.execute(sql`SELECT * FROM students WHERE LOWER(email) = LOWER(${application.email}) OR admission_no = ${application.admissionNo}`);
  if (existing.rows.length) {
    return existing.rows[0];
  }

  const admissionNo = application.admissionNo || await generateAdmissionNumber();
  const programmeResult = await db.execute(sql`SELECT title FROM courses WHERE id=${application.approvedCourseId || application.firstChoiceCourseId} LIMIT 1`);
  const programme = programmeResult.rows[0]?.title || null;
  const cohort = application.preferredIntake || `Intake ${new Date().getFullYear()}`;

  const studentResult = await db.execute(sql`INSERT INTO students (name,email,phone,admission_no,cohort,programme,department,avatar,account_status,created_at,updated_at)
    VALUES (${cleanText(application.fullName,255)}, ${cleanText(application.email,255).toLowerCase()}, ${cleanText(application.phone,50)}, ${admissionNo}, ${cleanText(cohort,100)}, ${cleanText(programme,255)}, ${cleanText(application.nationality,255)}, ${null}, 'Active', NOW(), NOW()) RETURNING *`);

  const student = studentResult.rows[0];
  if (!student) return null;

  const defaultPassword = resolvePassword(undefined, 'student').plain;
  try {
    await upsertUserAuthRecord({
      username: admissionNo,
      email: application.email.toLowerCase(),
      passwordHash: hashPassword(defaultPassword),
      role: 'student',
      roleId: String(student.id),
      isActive: true,
      mustChangePassword: true,
    });
  } catch (err: any) {
    console.warn("Failed to create associated auth record for admitted student:", err?.message || err);
  }

  return { ...student, defaultPassword };
}

async function queueAdmissionLetter(application: any, student?: any) {
  if (!application || !application.email) return;
  const admissionNo = application.admissionNo || student?.admissionNo || '';
  const loginUrl = `${process.env.APP_BASE_URL || 'https://portal.zenti.local'}/login?portal=student`;
  const body = `Dear ${application.fullName},\n\n` +
    `Congratulations! Your application ${application.application_no} has been approved.\n` +
    `Your admission number is ${admissionNo}.\n` +
    `Please visit ${loginUrl} to log in and complete your student onboarding.\n\n` +
    `If you are logging in for the first time, use your admission number as the username. You will be prompted to change your password on first sign in.\n\n` +
    `Best regards,\nZenti Admissions Team`;
  await queueEmail(`application:${application.id}:admission_letter`, application.email, `Admission Offer: ${application.application_no}`, body);
}

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
        is_active: l.isActive !== false,
        passcode: l.passcode || "lecturer123"
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
        avatar: s.avatar || "",
        passcode: s.passcode || "student123"
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
      expectedRole: role,
      jwtSecret: JWT_SECRET,
      getProfileFn: getProfileForUser
    });

    if (!result.success) {
      if (result.roleMismatch) {
        await recordRoleMismatchLoginAttempt(req, inputIdentifier, role, result.actualRole || 'unknown');
        res.status(403).json({ success: false, error: "Invalid credentials for this portal." });
        return;
      }
      res.status(401).json({ success: false, error: result.error || "Authentication failed." });
      return;
    }

    if (result.status === "REQUIRES_PASSWORD_CHANGE") {
      res.json({
        success: true,
        status: "REQUIRES_PASSWORD_CHANGE",
        userId: result.userId,
        role: result.role,
        email: result.email,
        message: result.message
      });
      return;
    }

    res.json({
      success: true,
      role: result.role,
      userId: result.userId,
      token: result.token,
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
      res.status(401).json({ success: false, error: result.error });
      return;
    }

    res.json(result);
  } catch (err: any) {
    console.error("Password change endpoint error:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to update password." });
  }
});

// Protected Administrative System Statistics Route
app.get("/api/admin/system-stats", checkRBAC(["admin", "accountant", "librarian"]), async (req, res) => {
  try {
    const [cCount, sCount, lCount, bCount] = await Promise.all([
      db.select({ value: count() }).from(courses),
      db.select({ value: count() }).from(students),
      db.select({ value: count() }).from(lecturers),
      db.select({ value: count() }).from(books),
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
    const courseRows = await db.select().from(courses);
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
  if (!requireAdminRole(req, res)) return;
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

// Production course lifecycle APIs. Existing course creation remains available
// for backwards compatibility; these endpoints enforce admissions-admin access.
app.patch("/api/admin/courses/:id", async (req: any, res: any) => {
  if (!requireAdminRole(req, res)) return;
  const id = req.params.id;
  const body = req.body || {};
  const title = cleanText(body.title, 255);
  const code = cleanText(body.code, 30).toUpperCase();
  const duration = cleanText(body.duration, 50);
  const faculty = cleanText(body.faculty, 100);
  if (!title || !code || !duration || !faculty || !Number.isFinite(Number(body.fees)) || Number(body.fees) < 0) {
    return res.status(400).json({ error: "Title, code, faculty, duration, and a non-negative tuition fee are required." });
  }
  try {
    const result = await db.execute(sql`UPDATE courses SET title=${title}, code=${code}, faculty=${faculty}, duration=${duration},
      fees=${Number(body.fees)}, department=${cleanText(body.department, 255) || null}, intake=${cleanText(body.intake, 100) || null},
      study_mode=${cleanText(body.studyMode, 50) || null}, application_fee=${Math.max(0, Number(body.applicationFee) || 0)},
      entry_requirements=${cleanText(body.entryRequirements) || null}, description=${cleanText(body.description) || null},
      course_content=${cleanText(body.courseContent) || null}, course_highlights=${cleanText(body.courseHighlights) || null}, updated_at=NOW()
      WHERE id=${id} AND archived_at IS NULL RETURNING *`);
    const course = result.rows[0];
    if (!course) return res.status(404).json({ error: "Active course not found." });
    await writeAdminAudit(req, "course.updated", "course", id, { code });
    res.json(course);
  } catch (error: any) { res.status(409).json({ error: error?.message || "Unable to update course." }); }
});

app.post("/api/admin/courses/:id/:action", async (req: any, res: any) => {
  if (!requireAdminRole(req, res)) return;
  const { id, action } = req.params;
  if (!["archive", "restore", "activate", "deactivate", "duplicate"].includes(action)) return res.status(400).json({ error: "Unsupported course action." });
  try {
    if (action === "duplicate") {
      const source = await db.execute(sql`SELECT * FROM courses WHERE id=${id}`);
      const row: any = source.rows[0];
      if (!row) return res.status(404).json({ error: "Course not found." });
      const copyCode = `${row.code}-COPY-${Date.now().toString().slice(-5)}`;
      const result = await db.execute(sql`INSERT INTO courses (code,title,description,duration,fees,thumbnail,faculty,active,department,intake,study_mode,application_fee,entry_requirements,course_content,course_highlights)
        VALUES (${copyCode}, ${`${row.title} (Copy)`}, ${row.description}, ${row.duration}, ${row.fees}, ${row.thumbnail}, ${row.faculty}, false,
        ${row.department}, ${row.intake}, ${row.study_mode}, ${row.application_fee}, ${row.entry_requirements}, ${row.course_content}, ${row.course_highlights}) RETURNING *`);
      await writeAdminAudit(req, "course.duplicated", "course", id, { duplicateId: result.rows[0]?.id });
      return res.status(201).json(result.rows[0]);
    }
    const result = action === "archive"
      ? await db.execute(sql`UPDATE courses SET archived_at=NOW(), archived_by=${req.user.userId}, active=false, updated_at=NOW() WHERE id=${id} RETURNING *`)
      : action === "restore"
        ? await db.execute(sql`UPDATE courses SET archived_at=NULL, archived_by=NULL, updated_at=NOW() WHERE id=${id} RETURNING *`)
        : await db.execute(sql`UPDATE courses SET active=${action === "activate"}, updated_at=NOW() WHERE id=${id} AND archived_at IS NULL RETURNING *`);
    if (!result.rows[0]) return res.status(404).json({ error: "Course not found." });
    await writeAdminAudit(req, `course.${action}d`, "course", id);
    res.json(result.rows[0]);
  } catch (error: any) { res.status(500).json({ error: error?.message || "Course action failed." }); }
});

app.delete("/api/admin/courses/:id", async (req: any, res: any) => {
  if (!requireAdminRole(req, res)) return;
  try {
    const usage = await db.execute(sql`SELECT COUNT(*)::int AS count FROM student_enrollments WHERE course_code=(SELECT code FROM courses WHERE id=${req.params.id})`);
    if (Number(usage.rows[0]?.count || 0) > 0) return res.status(409).json({ error: "Course has enrolment history; archive it instead of deleting it." });
    const result = await db.execute(sql`DELETE FROM courses WHERE id=${req.params.id} RETURNING id`);
    if (!result.rows[0]) return res.status(404).json({ error: "Course not found." });
    await writeAdminAudit(req, "course.deleted", "course", req.params.id);
    res.status(204).end();
  } catch (error: any) { res.status(500).json({ error: error?.message || "Unable to delete course." }); }
});

app.get("/api/courses/:id/gallery", async (req, res) => {
  try { const result = await db.execute(sql`SELECT * FROM course_gallery_images WHERE course_id=${req.params.id} AND is_public=true ORDER BY is_featured DESC, display_order ASC`); res.json(result.rows); }
  catch { res.status(500).json({ error: "Unable to load course gallery." }); }
});

app.put("/api/admin/courses/:id/gallery", async (req: any, res: any) => {
  if (!requireAdminRole(req, res)) return;
  const images = Array.isArray(req.body?.images) ? req.body.images : [];
  if (images.length > 30 || !images.every((image: any) => cleanText(image?.imageUrl, 2000) && cleanText(image?.caption, 500).length <= 500)) return res.status(400).json({ error: "Provide up to 30 valid gallery images and captions." });
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`DELETE FROM course_gallery_images WHERE course_id=${req.params.id}`);
      for (let index = 0; index < images.length; index++) {
        const image = images[index];
        await tx.execute(sql`INSERT INTO course_gallery_images (course_id,image_url,caption,display_order,is_featured,is_public) VALUES (${req.params.id},${cleanText(image.imageUrl,2000)},${cleanText(image.caption,500) || null},${index},${Boolean(image.isFeatured)},${image.isPublic !== false})`);
      }
    });
    await writeAdminAudit(req, "course.gallery.updated", "course", req.params.id, { imageCount: images.length });
    res.status(204).end();
  } catch (error: any) { res.status(500).json({ error: error?.message || "Unable to save gallery." }); }
});

app.post("/api/courses/:id/reviews", async (req: any, res: any) => {
  if (req.user?.role !== "student") return res.status(403).json({ error: "Only enrolled students may submit a review." });
  const rating = Number(req.body?.rating), comment = cleanText(req.body?.comment, 400);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length < 10) return res.status(400).json({ error: "Provide a 1–5 star rating and a review of at least 10 characters." });
  try {
    const enrolled = await db.execute(sql`SELECT 1 FROM student_enrollments e JOIN courses c ON c.code=e.course_code WHERE e.student_id=${req.user.userId} AND c.id=${req.params.id}`);
    if (!enrolled.rows[0]) return res.status(403).json({ error: "You must be enrolled in this course to review it." });
    const identity = await db.execute(sql`SELECT name FROM students WHERE id=${req.user.userId}`);
    const result = await db.execute(sql`INSERT INTO course_reviews (course_id,student_id,student_name,rating,comment,status) VALUES (${req.params.id},${req.user.userId},${identity.rows[0]?.name || "Student"},${rating},${comment},'pending') RETURNING *`);
    res.status(201).json(result.rows[0]);
  } catch (error: any) { res.status(409).json({ error: error?.message || "You already submitted a review for this course." }); }
});

app.patch("/api/admin/reviews/:id", async (req: any, res: any) => {
  if (!requireAdminRole(req, res)) return;
  const status = cleanText(req.body?.status, 20).toLowerCase();
  if (!['approved', 'rejected', 'pending'].includes(status)) return res.status(400).json({ error: "Invalid review status." });
  try {
    const result = await db.execute(sql`UPDATE course_reviews SET status=${status}, featured=${Boolean(req.body?.featured)}, reviewed_by=${req.user.userId}, reviewed_at=NOW(), updated_at=NOW() WHERE id=${req.params.id} RETURNING *`);
    if (!result.rows[0]) return res.status(404).json({ error: "Review not found." });
    await writeAdminAudit(req, `course_review.${status}`, "course_review", req.params.id);
    res.json(result.rows[0]);
  } catch { res.status(500).json({ error: "Unable to moderate review." }); }
});

app.post("/api/public/consultations", async (req, res) => {
  const body = req.body || {};
  const fullName = cleanText(body.fullName, 255), email = cleanText(body.email, 255).toLowerCase(), phone = cleanText(body.phone, 50);
  const type = cleanText(body.consultationType, 30), preferredDate = cleanText(body.preferredDate, 20), preferredTime = cleanText(body.preferredTime, 50), message = cleanText(body.message);
  if (!fullName || !/^\S+@\S+\.\S+$/.test(email) || !phone || !["physical", "phone", "online"].includes(type) || !/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) || !preferredTime || !message) {
    return res.status(400).json({ error: "Provide valid name, email, phone, consultation type, preferred date/time, and message." });
  }
  try {
    const requestNo = `CON-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const result = await db.execute(sql`INSERT INTO consultations (request_no,full_name,email,phone,course_id,course_name,consultation_type,preferred_date,preferred_time,message)
      VALUES (${requestNo},${fullName},${email},${phone},${cleanText(body.courseId, 50) || null},${cleanText(body.courseName, 255) || null},${type},${preferredDate},${preferredTime},${message}) RETURNING *`);
    const consultation: any = result.rows[0];
    await db.execute(sql`INSERT INTO consultation_messages (consultation_id,direction,sender_name,sender_email,body)
      VALUES (${consultation.id},'student',${fullName},${email},${message})`);
    await queueEmail(`consultation:${consultation.id}:confirmation`, email, `Consultation request ${requestNo} received`, "We received your consultation request and will contact you shortly.");
    res.status(201).json({ requestNo, status: "pending", message: "Your consultation request was received." });
  } catch (error: any) { res.status(500).json({ error: "Unable to submit consultation request." }); }
});

app.get("/api/admin/consultations", async (req: any, res: any) => {
  if (!requireAdminRole(req, res)) return;
  try { const result = await db.execute(sql`SELECT * FROM consultations WHERE deleted_at IS NULL ORDER BY created_at DESC`); res.json(result.rows); }
  catch (error: any) { res.status(500).json({ error: "Unable to load consultations." }); }
});

app.patch("/api/admin/consultations/:id", async (req: any, res: any) => {
  if (!requireAdminRole(req, res)) return;
  const status = cleanText(req.body?.status, 30).toLowerCase();
  const reply = cleanText(req.body?.reply);
  if (status && !["pending", "contacted", "scheduled", "completed", "cancelled"].includes(status)) return res.status(400).json({ error: "Invalid consultation status." });
  try {
    const found = await db.execute(sql`UPDATE consultations SET status=COALESCE(${status || null},status), scheduled_at=CASE WHEN ${status}='scheduled' THEN NOW() ELSE scheduled_at END, updated_at=NOW() WHERE id=${req.params.id} AND deleted_at IS NULL RETURNING *`);
    const consultation: any = found.rows[0]; if (!consultation) return res.status(404).json({ error: "Consultation not found." });
    if (reply) {
      const messageId = `<consultation-${consultation.id}-${crypto.randomUUID()}@zenti.local>`;
      await db.execute(sql`INSERT INTO consultation_messages (consultation_id,direction,sender_name,sender_email,body,message_id) VALUES (${consultation.id},'admin','Admissions',NULL,${reply},${messageId})`);
      await queueEmail(`consultation:${consultation.id}:reply:${messageId}`, consultation.email, `Re: Consultation ${consultation.request_no}`, reply);
    }
    await writeAdminAudit(req, "consultation.updated", "consultation", consultation.id, { status, replied: Boolean(reply) });
    res.json(consultation);
  } catch (error: any) { res.status(500).json({ error: "Unable to update consultation." }); }
});

app.get("/api/admin/consultations/:id/messages", async (req: any, res: any) => {
  if (!requireAdminRole(req, res)) return;
  try { const result = await db.execute(sql`SELECT * FROM consultation_messages WHERE consultation_id=${req.params.id} ORDER BY created_at ASC`); res.json(result.rows); }
  catch { res.status(500).json({ error: "Unable to load consultation conversation." }); }
});

app.post("/api/public/applications", async (req, res) => {
  const body = req.body || {};
  const required = ["fullName", "nationalId", "dateOfBirth", "gender", "nationality", "phone", "email", "postalAddress", "previousSchool", "highestQualification", "kcseGrade", "firstChoiceCourseId", "preferredIntake"];
  if (required.some((key) => !cleanText(body[key], 500)) || !/^\S+@\S+\.\S+$/.test(cleanText(body.email, 255))) {
    return res.status(400).json({ error: "Complete all required application fields with valid values." });
  }
  const documents = Array.isArray(body.documents) ? body.documents : [];
  const requiredDocuments = new Set(["passport_photo", "national_id", "kcse_certificate"]);
  if (!documents.every((doc: any) => APPLICATION_DOCUMENT_TYPES.has(doc?.documentType) && APPLICATION_MIME_TYPES.has(doc?.mimeType) && Number(doc?.sizeBytes) > 0 && Number(doc?.sizeBytes) <= MAX_UPLOAD_BYTES && /^[a-zA-Z0-9._ -]{1,255}$/.test(doc?.fileName || "") && cleanText(doc?.fileUrl, 2000))) {
    return res.status(400).json({ error: "Documents must be PDF, JPG, or PNG, below 10 MB, with safe filenames." });
  }
  if (![...requiredDocuments].every((type) => documents.some((doc: any) => doc.documentType === type))) return res.status(400).json({ error: "Passport photo, national ID, and KCSE certificate are required." });
  try {
    const applicationNo = `APP-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const submissionYear = new Date().getFullYear();
    const result = await db.execute(sql`INSERT INTO applications (application_no,full_name,national_id,date_of_birth,gender,nationality,phone,email,postal_address,previous_school,highest_qualification,mean_grade,graduation_year,first_choice_course_id,second_choice_course_id,preferred_intake)
      VALUES (${applicationNo},${cleanText(body.fullName,255)},${cleanText(body.nationalId,100)},${cleanText(body.dateOfBirth,20)},${cleanText(body.gender,30)},${cleanText(body.nationality,100)},${cleanText(body.phone,50)},${cleanText(body.email,255).toLowerCase()},${cleanText(body.postalAddress)},${cleanText(body.previousSchool,255)},${cleanText(body.highestQualification,255)},${cleanText(body.kcseGrade,50)},${submissionYear},${cleanText(body.firstChoiceCourseId,50)},${cleanText(body.secondChoiceCourseId,50) || null},${cleanText(body.preferredIntake,100)}) RETURNING id`);
    const applicationId = result.rows[0]?.id;
    for (const doc of documents) await db.execute(sql`INSERT INTO application_documents (application_id,document_type,file_name,mime_type,file_url,size_bytes) VALUES (${applicationId},${doc.documentType},${doc.fileName},${doc.mimeType},${doc.fileUrl},${Number(doc.sizeBytes)})`);
    await queueEmail(`application:${applicationId}:received`, cleanText(body.email,255).toLowerCase(), `Application ${applicationNo} received`, "Your application has been received and is under review.");
    res.status(201).json({ applicationNo, status: "submitted" });
  } catch (error: any) { res.status(409).json({ error: error?.message || "Unable to submit application." }); }
});

app.get("/api/admin/applications", async (req: any, res: any) => {
  if (!requireAdminRole(req, res)) return;
  try { const result = await db.execute(sql`SELECT * FROM applications ORDER BY created_at DESC`); res.json(result.rows); }
  catch { res.status(500).json({ error: "Unable to load applications." }); }
});

app.patch("/api/admin/applications/:id", async (req: any, res: any) => {
  if (!requireAdminRole(req, res)) return;
  const status = cleanText(req.body?.status, 40).toLowerCase();
  if (!["under_review", "additional_documents_requested", "approved", "rejected", "waitlisted"].includes(status)) return res.status(400).json({ error: "Invalid application action." });
  try {
    const result = await db.execute(sql`UPDATE applications SET status=${status}, internal_notes=COALESCE(${cleanText(req.body?.internalNote) || null},internal_notes), decided_at=CASE WHEN ${status} IN ('approved','rejected','waitlisted') THEN NOW() ELSE decided_at END, decided_by=${req.user.userId}, updated_at=NOW() WHERE id=${req.params.id} RETURNING *`);
    const application: any = result.rows[0];
    if (!application) return res.status(404).json({ error: "Application not found." });

    if (status === 'approved') {
      if (!application.admission_no) {
        application.admission_no = await generateAdmissionNumber();
        await db.execute(sql`UPDATE applications SET admission_no=${application.admission_no}, approved_course_id=${application.approved_course_id ?? application.first_choice_course_id}, updated_at=NOW() WHERE id=${application.id}`);
      }
      const admittedStudent = await createStudentFromApplication(application);
      await queueAdmissionLetter(application, admittedStudent);
    } else {
      await queueEmail(`application:${application.id}:${status}`, application.email, `Application ${application.application_no}: ${status.replaceAll('_', ' ')}`, `Your application status has been updated to ${status.replaceAll('_', ' ')}. Please sign in or contact Admissions for details.`);
    }

    await writeAdminAudit(req, `application.${status}`, "application", application.id, { status, applicationNo: application.application_no, admissionNo: application.admission_no });
    res.json(application);
  } catch (error: any) {
    console.error("Application status update failed:", error);
    res.status(500).json({ error: error?.message || "Unable to update application." }); }
});

  // REST Resource: Invoices
app.get("/api/invoices", async (req, res) => {
  try {
    const result = await db.select().from(invoices);
    res.json(result);
  } catch (error: any) {
    console.error("Failed to fetch invoices:", error);
    res.status(500).json({ error: error.message });
  }
});
app.post("/api/invoices", async (req, res) => {
  try {
    const invoiceData = req.body;

    if (!invoiceData?.studentId || !invoiceData?.amount) {
      return res.status(400).json({
        error: "Student ID and amount are required",
      });
    }

    const [invoice] = await db
      .insert(invoices)
      .values({
        studentId: invoiceData.studentId,
        invoiceNo: invoiceData.invoiceNo,
        description: invoiceData.description,
        amount: invoiceData.amount,
        date: invoiceData.date,
        status: invoiceData.status ?? "unpaid",
      })
      .returning();

    res.status(201).json(invoice);
  } catch (error: any) {
    console.error("Failed to create invoice:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/student-attendance", async (req, res) => {
  try {
    const attendanceData = req.body;

    if (
      !attendanceData?.studentId ||
      !attendanceData?.subjectCode ||
      attendanceData?.attendanceRate === undefined
    ) {
      return res.status(400).json({
        error: "Student ID, subject code and attendance rate are required",
      });
    }

    const [attendance] = await db
      .insert(studentAttendance)
      .values({
        studentId: attendanceData.studentId,
        subjectCode: attendanceData.subjectCode,
        attendanceRate: attendanceData.attendanceRate,
      })
      .onConflictDoUpdate({
        target: [
          studentAttendance.studentId,
          studentAttendance.subjectCode,
        ],
        set: {
          attendanceRate: attendanceData.attendanceRate,
        },
      })
      .returning();

    res.status(201).json(attendance);
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
      .from(lecturers);

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
app.get("/api/students/search", async (req, res) => {
  try {
    const admissionNoQuery = req.query.admission_no || req.query.admissionNo;
    if (!admissionNoQuery || typeof admissionNoQuery !== "string") {
      return res.status(400).json({ error: "admission_no query parameter is required" });
    }

    const admissionNo = admissionNoQuery.trim();

    // Query fully constructed students list (with all nested details like grades, ledger, etc.)
    const fullDb = await loadFullDatabaseState();
    const student = (fullDb.students || []).find(
      (s: any) => s.admissionNo?.toLowerCase() === admissionNo.toLowerCase()
    );

    if (!student) {
      // Fallback: check local database cache
      const cachedStudents = getDatabase().students || [];
      const cachedStudent = cachedStudents.find(
        (s: any) => s.admissionNo?.toLowerCase() === admissionNo.toLowerCase()
      );

      if (cachedStudent) {
        const { passcode, ...studentWithoutPasscode } = cachedStudent;
        return res.json(studentWithoutPasscode);
      }
      return res.status(404).json({ error: `Student with admission number ${admissionNo} not found.` });
    }

    const { passcode, ...studentWithoutPasscode } = student;
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
    const allStudents = await db.select().from(students);
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
  const creditAmount = Number(amount);

  if (!studentId || !discountTypology || !Number.isFinite(creditAmount) || creditAmount <= 0) {
    return res.status(400).json({ error: "Missing required grant fields or credit value must be greater than zero" });
  }

  const creditNo = `CRD-${Math.floor(100000 + Math.random() * 900000)}`;
  const dateStr = new Date().toISOString().substring(0, 10);
  const formattedDesc = `[${discountTypology} Approved] ${description || "Waiver allocation"}`;

  try {
    // Keep the ledger credit and its negative paid invoice in sync.
    const ledgerEntry = await db.transaction(async (tx) => {
      const [createdLedgerEntry] = await tx.insert(studentLedger).values({
        studentId,
        entryType: 'CREDIT',
        voteHead: discountTypology,
        amount: String(creditAmount),
        description: formattedDesc,
      }).returning();

      await tx.insert(invoices).values({
        studentId,
        invoiceNo: creditNo,
        description: formattedDesc,
        amount: String(-creditAmount),
        date: dateStr,
        status: "paid",
      });

      return createdLedgerEntry;
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
        amount: creditAmount,
        description: formattedDesc,
        createdAt: new Date().toISOString(),
      };

      const newInvoice = {
        id: `inv-${Date.now()}`,
        studentId,
        invoiceNo: creditNo,
        description: formattedDesc,
        amount: -creditAmount,
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
    const unpaidInvoices = await db.select().from(invoices).where(eq(invoices.status, "unpaid"));
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

// 5. Payment reconciliation review queue and single-payment approval.
// A student-initiated payment remains unreconciled until an accountant approves it.
app.get("/api/finance/payments", async (_req, res) => {
  try {
    const paymentRows = await db.select().from(payments).orderBy(desc(payments.date));
    res.json(paymentRows.map((payment) => ({
      ...payment,
      amount: Number(payment.amount),
    })));
  } catch (error: any) {
    const requestId = crypto.randomUUID();
    console.error(`[${requestId}] Failed to fetch finance payments`, {
      message: error?.message,
      code: error?.cause?.code || error?.code,
    });
    res.status(500).json({
      error: "Unable to load payments for reconciliation.",
      code: "PAYMENTS_FETCH_FAILED",
      requestId,
    });
  }
});

app.patch("/api/finance/payments/:paymentId/reconcile", async (req, res) => {
  const { paymentId } = req.params;

  if (!paymentId) {
    return res.status(400).json({
      error: "A payment ID is required.",
      code: "PAYMENT_ID_REQUIRED",
    });
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Lock the payment so duplicate clicks cannot create duplicate ledger credits.
      await tx.execute(sql`SELECT id FROM payments WHERE id = ${paymentId} FOR UPDATE`);
      const [payment] = await tx.select().from(payments).where(eq(payments.id, paymentId));

      if (!payment) {
        return { kind: "not_found" as const };
      }

      if (payment.status === "reconciled") {
        return { kind: "already_reconciled" as const, payment };
      }

      if (!payment.invoiceId) {
        return { kind: "invoice_required" as const };
      }

      await tx.execute(sql`SELECT id FROM invoices WHERE id = ${payment.invoiceId} FOR UPDATE`);
      const [invoice] = await tx.select().from(invoices).where(eq(invoices.id, payment.invoiceId));

      if (!invoice) {
        return { kind: "invoice_not_found" as const };
      }

      if (invoice.studentId !== payment.studentId) {
        return { kind: "student_mismatch" as const };
      }

      if (Math.abs(Number(invoice.amount) - Number(payment.amount)) > 0.004) {
        return { kind: "amount_mismatch" as const, invoiceAmount: Number(invoice.amount) };
      }

      if (invoice.status === "paid") {
        return { kind: "invoice_already_paid" as const };
      }

      const [reconciledPayment] = await tx
        .update(payments)
        .set({ status: "reconciled" })
        .where(eq(payments.id, payment.id))
        .returning();

      await tx.update(invoices).set({ status: "paid" }).where(eq(invoices.id, invoice.id));
      await tx.insert(studentLedger).values({
        studentId: payment.studentId,
        entryType: "CREDIT",
        voteHead: "Tuition",
        amount: String(payment.amount),
        description: `Payment reconciled: ${payment.transactionId}`,
      });

      return { kind: "reconciled" as const, payment: reconciledPayment, invoiceId: invoice.id };
    });

    if (result.kind === "not_found") {
      return res.status(404).json({ error: "Payment not found.", code: "PAYMENT_NOT_FOUND" });
    }
    if (result.kind === "invoice_required") {
      return res.status(422).json({ error: "This payment has no linked invoice to reconcile.", code: "PAYMENT_INVOICE_REQUIRED" });
    }
    if (result.kind === "invoice_not_found") {
      return res.status(422).json({ error: "The invoice linked to this payment no longer exists.", code: "PAYMENT_INVOICE_NOT_FOUND" });
    }
    if (result.kind === "student_mismatch") {
      return res.status(422).json({ error: "The payment and linked invoice belong to different students.", code: "PAYMENT_INVOICE_STUDENT_MISMATCH" });
    }
    if (result.kind === "amount_mismatch") {
      return res.status(422).json({
        error: `Payment amount does not match the invoice amount (KES ${result.invoiceAmount.toLocaleString()}).`,
        code: "PAYMENT_INVOICE_AMOUNT_MISMATCH",
      });
    }
    if (result.kind === "invoice_already_paid") {
      return res.status(409).json({ error: "The linked invoice is already paid.", code: "INVOICE_ALREADY_PAID" });
    }

    res.status(200).json({
      success: true,
      alreadyReconciled: result.kind === "already_reconciled",
      message: result.kind === "already_reconciled" ? "Payment was already reconciled." : "Payment reconciled successfully.",
      payment: { ...result.payment, amount: Number(result.payment.amount) },
      invoiceId: result.kind === "reconciled" ? result.invoiceId : result.payment.invoiceId,
    });
  } catch (error: any) {
    const requestId = crypto.randomUUID();
    console.error(`[${requestId}] Payment reconciliation failed`, {
      paymentId,
      message: error?.message,
      code: error?.cause?.code || error?.code,
      constraint: error?.cause?.constraint,
      detail: error?.cause?.detail,
    });
    res.status(500).json({
      error: "Payment reconciliation could not be completed. Please try again.",
      code: "PAYMENT_RECONCILIATION_FAILED",
      requestId,
    });
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
    const conditions = [];

    if (searchParam) {
      const searchPattern = `%${searchParam}%`;
      conditions.push(
        or(
          ilike(students.name, searchPattern),
          ilike(students.admissionNo, searchPattern),
          ilike(students.email, searchPattern),
          ilike(students.cohort, searchPattern)
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
          s.cohort?.toLowerCase().includes(searchParam)
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
    
    const rawPass = studentData.passcode || "student123";
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

    res.status(500).json({
      error: error.message,
    });
  }
});

// Admin Route: Hard Delete / Purge User Account and automatically purge all associated relational records
app.delete(["/api/admin/users/:id", "/api/admin/users/[id]", "/api/students/:id"], checkRBAC(["admin"]), async (req: any, res: any) => {
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
app.post("/api/students/:id/reset-password", async (req, res) => {
  try {
    const studentId = req.params.id;
    if (!studentId) {
      return res.status(400).json({ error: "Student ID required" });
    }

    const dbVal = getDatabase();
    const studentIdx = (dbVal.students || []).findIndex((s: any) => s.id === studentId);
    if (studentIdx === -1) {
      return res.status(404).json({ error: "Student not found" });
    }

    // Generate a temporary, single-use activation credential passcode
    const temporaryPasscode = "ZENTI-" + Math.floor(100000 + Math.random() * 900000).toString();

    // Update in memory cache and flag as pending setup
    dbVal.students[studentIdx].passcode = temporaryPasscode;
    dbVal.students[studentIdx].accountStatus = "Pending Setup";

    // Save database (hashes passcode automatically and writes to PG / fallback)
    saveDatabase(dbVal);

    res.status(200).json({
      success: true,
      message: "Student passcode reset successfully.",
      temporaryPasscode
    });
  } catch (error: any) {
    console.error("Password reset failed:", error);
    res.status(500).json({
      error: error.message,
    });
  }
});

/**
 * Load the student portal in independently-failable modules.  This deliberately
 * does not use loadFullDatabaseState(): one unrelated table (for example the
 * library) must never prevent a student from seeing their profile or fees.
 */
app.get("/api/student/dashboard", async (req: any, res: any) => {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const userId = req.user?.userId;
  const role = req.user?.role;
  const queryTimeoutMs = Math.max(500, Number(process.env.STUDENT_DASHBOARD_QUERY_TIMEOUT_MS) || 4000);

  if (role !== "student" || !userId) {
    console.warn("[student-dashboard] forbidden request", { requestId, role, userId });
    return res.status(403).json({
      error: "Only an authenticated student may load this dashboard.",
      requestId,
    });
  }

  const failures: Array<{ module: string; message: string }> = [];
  const loadModule = async <T>(module: string, fallback: T, query: () => Promise<T>): Promise<T> => {
    const moduleStartedAt = Date.now();
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    try {
      const timeout = new Promise<never>((_resolve, reject) => {
        timeoutHandle = setTimeout(() => {
          const timeoutError: any = new Error(`Database query exceeded ${queryTimeoutMs}ms`);
          timeoutError.code = "DASHBOARD_QUERY_TIMEOUT";
          reject(timeoutError);
        }, queryTimeoutMs);
      });
      const value = await Promise.race([query(), timeout]);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      console.info("[student-dashboard] module loaded", {
        requestId,
        module,
        durationMs: Date.now() - moduleStartedAt,
      });
      return value;
    } catch (error: any) {
      if (timeoutHandle) clearTimeout(timeoutHandle);
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ module, message });
      console.error("[student-dashboard] module failed", {
        requestId,
        module,
        durationMs: Date.now() - moduleStartedAt,
        error: message,
        code: error?.code,
      });
      return fallback;
    }
  };

  // initPostgresDB loads this fallback on a database outage. It is used only to
  // keep the already-authenticated student's portal readable during a transient
  // database failure; every fallback use is surfaced in failedModules/logs.
  const snapshot = getDatabase();
  const snapshotStudent = (snapshot?.students || []).find((student: any) => student?.id === userId) || null;
  const profilePromise = loadModule("student-profile", snapshotStudent, async () => {
    const [row] = await db.select().from(students).where(eq(students.id, userId)).limit(1);
    return row || null;
  });

  // All module queries are keyed by the authenticated profile ID, so they can
  // run while the profile lookup is reconnecting instead of adding its latency
  // in front of every dashboard query.
  const modulesPromise = Promise.all([
    loadModule("enrolled-units", (snapshotStudent?.enrolledUnits || []).map((courseCode: string) => ({ courseCode })), () => db.select().from(studentEnrollments).where(eq(studentEnrollments.studentId, userId))),
    loadModule("attendance", Object.entries(snapshotStudent?.attendance || {}).map(([subjectCode, attendanceRate]) => ({ subjectCode, attendanceRate })), () => db.select().from(studentAttendance).where(eq(studentAttendance.studentId, userId))),
    loadModule("results", Object.entries(snapshotStudent?.grades || {}).map(([subjectCode, grade]: [string, any]) => ({ subjectCode, catScore: grade?.cat, examScore: grade?.exam })), () => db.select().from(grades).where(eq(grades.studentId, userId))),
    loadModule("finance-invoices", snapshotStudent?.ledger || [], () => db.select().from(invoices).where(eq(invoices.studentId, userId))),
    loadModule("finance-payments", snapshotStudent?.payments || [], () => db.select().from(payments).where(eq(payments.studentId, userId))),
    loadModule("courses", snapshot?.courses || [], () => db.select().from(courses).where(eq(courses.active, true))),
    loadModule("semester", snapshot?.examPapers || [], () => db.select().from(examPapers)),
    loadModule("timetable-and-announcements", snapshot || {}, async () => {
      const [row] = await db.select().from(systemState).where(eq(systemState.id, 1)).limit(1);
      return (row?.data as Record<string, unknown>) || {};
    }),
  ]);

  const profile = await profilePromise;

  if (!profile) {
    const profileFailure = failures.find((failure) => failure.module === "student-profile");
    if (profileFailure) {
      console.error("[student-dashboard] profile query unavailable", { requestId, userId, error: profileFailure.message });
      return res.status(503).json({
        error: "The student profile service is temporarily unavailable.",
        requestId,
        failedModules: failures,
      });
    }
    console.warn("[student-dashboard] profile missing", { requestId, userId });
    return res.status(404).json({ error: "Student profile was not found.", requestId });
  }

  const [enrollmentRows, attendanceRows, gradeRows, invoiceRows, paymentRows, courseRows, examPaperRows, state] = await modulesPromise;

  const enrolledUnits = enrollmentRows.map((row: any) => row?.courseCode).filter((code: unknown): code is string => typeof code === "string");
  const attendance: Record<string, number> = {};
  attendanceRows.forEach((row: any) => {
    if (typeof row?.subjectCode === "string") attendance[row.subjectCode] = Number(row.attendanceRate) || 0;
  });
  const gradesByUnit: Record<string, { cat: number; exam: number }> = {};
  gradeRows.forEach((row: any) => {
    if (typeof row?.subjectCode === "string") {
      gradesByUnit[row.subjectCode] = { cat: Number(row.catScore) || 0, exam: Number(row.examScore) || 0 };
    }
  });

  const dashboardStudent = {
    id: profile.id,
    name: profile.name || "Student",
    email: profile.email || "",
    phone: profile.phone || "",
    admissionNo: profile.admissionNo || "Not recorded",
    cohort: profile.cohort || "Not recorded",
    programme: profile.programme || undefined,
    department: profile.department || undefined,
    avatar: profile.avatar || undefined,
    accountStatus: profile.accountStatus || "Active",
    createdAt: profile.createdAt || undefined,
    enrolledUnits,
    attendance,
    grades: gradesByUnit,
    ledger: invoiceRows.map((row: any) => ({
      id: row.id, invoiceNo: row.invoiceNo, description: row.description || "", amount: Number(row.amount) || 0,
      date: row.date || null, status: row.status || "unpaid",
    })),
    payments: paymentRows.map((row: any) => ({
      id: row.id, studentId: row.studentId, invoiceId: row.invoiceId || "", amount: Number(row.amount) || 0,
      paymentMethod: row.paymentMethod || "M-Pesa", transactionId: row.transactionId || "", date: row.date || null,
      status: row.status || "unreconciled",
    })),
  };

  const timetable = Array.isArray(state.timetable) ? state.timetable : [];
  const announcements = Array.isArray(state.news) ? state.news : [];
  // A cached profile is sufficient to render a degraded dashboard. Non-2xx is
  // reserved for the earlier no-profile/failed-profile cases, because clients
  // correctly discard a response marked as an HTTP error.
  const status = 200;
  console.info("[student-dashboard] response", {
    requestId,
    studentId: profile.id,
    status,
    partial: failures.length > 0,
    failedModules: failures.map((failure) => failure.module),
    durationMs: Date.now() - startedAt,
  });
  return res.status(status).json({
    requestId,
    partial: failures.length > 0,
    failedModules: failures,
    student: dashboardStudent,
    courses: courseRows.map((row: any) => ({ ...row, fees: Number(row.fees) || 0, description: row.description || "", thumbnail: row.thumbnail || "" })),
    attendance,
    finance: { invoices: dashboardStudent.ledger, payments: dashboardStudent.payments },
    semester: examPaperRows.filter((row: any) => enrolledUnits.includes(row.subjectCode)),
    timetable,
    announcements,
  });
});

app.get("/api/student/registered-units", async (req, res) => {
  try {
    let studentId = (req.query.studentId as string) || (req.headers["x-student-id"] as string);

    if (!studentId) {
      const [cateStudent] = await db
        .select()
        .from(students)
        .where(eq(students.name, "Cate Wanjiru"))
        .limit(1);

      if (cateStudent) {
        studentId = cateStudent.id;
      } else {
        const [firstStudent] = await db.select().from(students).limit(1);
        if (firstStudent) {
          studentId = firstStudent.id;
        }
      }
    }

    if (!studentId) {
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
      .innerJoin(courses, eq(studentEnrollments.courseCode, courses.code))
      .where(eq(studentEnrollments.studentId, studentId));

    const attendanceLogs = await db
      .select()
      .from(studentAttendance)
      .where(eq(studentAttendance.studentId, studentId));

    // Calculate and aggregate dynamic metrics for each enrolled unit
    const result = activeEnrollments.map((item) => {
      const code = item.courseCode;

      let hash = 0;
      for (let i = 0; i < code.length; i++) {
        hash = code.charCodeAt(i) + ((hash << 5) - hash);
      }
      const absHash = Math.abs(hash);

      const totalLectures = 16;
      const attRecord = attendanceLogs.find((a) => a.subjectCode === code);
      let attendedLectures = attRecord
        ? Math.round((attRecord.attendanceRate / 100) * totalLectures)
        : 12 + (absHash % 5);
      const attendanceRate = Math.round((attendedLectures / totalLectures) * 100);

      const totalAssignments = 5;
      const submittedAssignments = 3 + (Math.abs(hash >> 2) % 3);
      const assignmentRate = Math.round((submittedAssignments / totalAssignments) * 100);

      const overallProgress = Math.round((attendanceRate + assignmentRate) / 2);

      return {
        courseCode: item.courseCode,
        courseTitle: item.courseTitle,
        description: item.description,
        duration: item.duration,
        faculty: item.faculty,
        fees: item.fees,
        thumbnail: item.thumbnail,
        enrolledAt: item.enrolledAt,
        // Aggregated dynamic metrics
        attendedLectures,
        totalLectures,
        lectures: `${attendedLectures}/${totalLectures} lectures`,
        attendanceRate,
        submittedAssignments,
        totalAssignments,
        assignments: `${submittedAssignments}/${totalAssignments} assignments`,
        assignmentRate,
        overallProgress,
        completionPercentage: overallProgress,
      };
    });

    res.json(result);
  } catch (error: any) {
    console.error("Failed to fetch registered units:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/student-enrollments", async (req, res) => {
  try {
    const { studentId, courseCode } = req.body;

    if (!studentId || !courseCode) {
      return res.status(400).json({
        error: "studentId and courseCode are required",
      });
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

app.delete("/api/student-enrollments", async (req, res) => {
  try {
    const studentId = (req.query.studentId as string) || (req.body?.studentId as string);
    const courseCode = (req.query.courseCode as string) || (req.body?.courseCode as string);

    if (!studentId || !courseCode) {
      return res.status(400).json({ error: "studentId and courseCode are required" });
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
    const bookRows = await db.select().from(books);
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
// VITE CLIENT INTEGRATION MIDDLEWARE
// ==========================================

async function startServer() {
  // Initialize the PostgreSQL database state (or fallback store if offline)
  try {
    await runMigrations();
  } catch (error: any) {
    // Preserve the existing offline-development fallback; production must never
    // start against an unmigrated database.
    console.error("Database migrations failed:", error?.message || error);
    if (process.env.NODE_ENV === "production") throw error;
  }
  await initPostgresDB();
  const dbStateForAuth = getDatabase();
  await migrateAuthSchemaAndData(dbStateForAuth);

  if (process.env.NODE_ENV !== "production") {
    console.log("Backend API server running in development mode (port " + PORT + ")");
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

  if (!process.env.VERCEL) {
    const serverInstance = app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
    });
    serverInstance.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${PORT} is already in use by another process (EADDRINUSE).`);
      } else {
        console.error("Server listener error:", err);
      }
    });
  }
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});

export default app;
