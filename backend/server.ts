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
} from "./src/db/schema.ts";
import { eq, notInArray, and, desc } from "drizzle-orm";
import { supabase } from "./src/db/supabaseClient.ts";

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
const PORT = 3000;

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
    passcode: l.passcode ?? "",
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

    return {
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      admissionNo: s.admissionNo,
      cohort: s.cohort,
      avatar: s.avatar ?? undefined,
      passcode: s.passcode ?? undefined,
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
    const tx = db;
    // await db.transaction(async (tx) => {
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
          passcode: l.passcode || "lecturer123"
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
          passcode: s.passcode || "student123"
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
    // });
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

// Helper to initialize database state from PostgreSQL
async function initPostgresDB() {
  try {
    if (!process.env.SQL_HOST || !process.env.SQL_PASSWORD || !process.env.SQL_USER || !process.env.SQL_DB_NAME) {
      throw new Error("Missing database environment variables (SQL_HOST, SQL_PASSWORD, SQL_USER, or SQL_DB_NAME). Please configure your local .env file.");
    }
        const existing = await db.select().from(systemState).where(eq(systemState.id, 1));
    if (existing.length > 0) {
      cachedDb = await loadFullDatabaseState();
      console.log("Successfully loaded database state from PostgreSQL!");
      
      // Self-healing: If Postgres tables are empty but db_store.json contains mock data, bootstrap relational tables
      if ((!cachedDb.students || cachedDb.students.length === 0) && fs.existsSync(DB_FILE)) {
        console.log("[DB TUNER] PostgreSQL relational tables are empty. Bootstrapping/seeding from db_store.json...");
        try {
          const content = fs.readFileSync(DB_FILE, "utf-8");
          const localDb = JSON.parse(content);
          cachedDb = { ...localDb };
          performDatabaseSync(cachedDb).catch(err => {
            console.error("[DB TUNER] Failed to run self-healing bootstrap sync:", err);
          });
        } catch (e) {
          console.error("[DB TUNER] Failed to read db_store.json for seeding:", e);
        }
      }
    } else {
      // Bootstrap from db_store.json or initialState
      let dbState: any = null;
      if (fs.existsSync(DB_FILE)) {
        try {
          const content = fs.readFileSync(DB_FILE, "utf-8");
          dbState = JSON.parse(content);
        } catch (e) {
          console.error("Error reading db_store.json", e);
        }
      }
      if (!dbState) {
        dbState = {
          courses: initialCourses,
          lecturers: initialLecturers,
          students: initialStudents,
          expenses: initialExpenses,
          inventory: initialInventory,
          requisitions: initialRequisitions,
          news: initialNews,
          testimonies: initialTestimonies,
          reviews: initialReviews,
          books: initialBooks,
          loans: initialLoans,
          reservations: initialReservations,
          readingLists: initialReadingLists,
          bookReviews: initialBookReviews,
          bookRequests: initialBookRequests,
          examPapers: initialExamPapers,
          teacherResources: initialTeacherResources,
          libraryGateLogs: initialLibraryGateLogs,
          notifications: initialNotifications,
          passwordResetRequests: []
        };
      }
      
      dbState = sanitizeStateIds(dbState);
      cachedDb = dbState;
      await db.insert(systemState).values({
        id: 1,
        data: dbState,
      });
      await saveFullDatabaseState(dbState);
      console.log("Successfully bootstrapped database state to PostgreSQL!");
    }
  } catch (err) {
    console.error("Failed to initialize PostgreSQL DB state, falling back to JSON file:", err);
    // Fallback: load from JSON file synchronously
    if (fs.existsSync(DB_FILE)) {
      try {
        cachedDb = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      } catch (e) {
        cachedDb = {};
      }
    } else {
      cachedDb = {};
    }
  }
}

// Helper to retrieve database state
function getDatabase() {
  if (cachedDb) {
    return cachedDb;
  }
  // Fallback if not initialized yet
  if (fs.existsSync(DB_FILE)) {
    try {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      cachedDb = JSON.parse(content);
      return cachedDb;
    } catch (e) {
      console.error("Error reading db_store.json", e);
    }
  }
  return {};
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
  
  // Persist asynchronously to Postgres systemState table
  db.insert(systemState)
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
    })
    .then(() => {
      console.log("Successfully persisted updated state to PostgreSQL system_state.");
    })
    .catch((err) => {
      console.error("Failed to persist updated state to PostgreSQL system_state:", err);
    });

  // Persist asynchronously to all relational database tables
  saveFullDatabaseState(dbState)
    .then(() => {
      console.log("Successfully persisted updated state to PostgreSQL relational tables.");
    })
    .catch((err) => {
      console.error("Failed to persist updated state to PostgreSQL relational tables:", err);
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
  "/api/data"
];

// Mount JWT Protection Middleware globally across all /api routes except public endpoints
app.use("/api", (req: any, res: any, next: any) => {
  if (req.method === "OPTIONS") {
    return next();
  }
  
  const pathWithoutQuery = req.path.split('?')[0];
  const fullPath = req.baseUrl + pathWithoutQuery;
  const relativePath = '/api' + pathWithoutQuery;
  
  const isPublic = publicAPIPaths.includes(fullPath) || publicAPIPaths.includes(relativePath);
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
      return res.json({
        success: false,
        status: "unconfigured",
        message: "Supabase connection is not configured.",
        lecturers: getDatabase().lecturers || []
      });
    }

    const { data, error } = await supabase.from('lecturers').select('*');
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

// Unified Login Endpoint - Single endpoint that handles authorization for all roles (Admin, Student, Staff)
app.post("/api/auth/login", (req, res) => {
  const { role, userId, passcode } = req.body;
  if (!role || !userId) {
    res.status(400).json({ success: false, error: "Missing required role or userId parameter." });
    return;
  }

  // Input validation
  if (typeof role !== 'string' || typeof userId !== 'string' || typeof passcode !== 'string') {
    res.status(400).json({ success: false, error: "Invalid parameter types." });
    return;
  }

  const db = getDatabase();

  // Helper to verify passcode and upgrade to bcrypt dynamically on success
  const verifyAndMigratePasscode = (inputPasscode: string, storedHashOrPlain: string, updateCallback: (hashed: string) => void) => {
    const isBcrypt = storedHashOrPlain.startsWith('$2b$') || storedHashOrPlain.startsWith('$2a$') || storedHashOrPlain.startsWith('$2y$');
    if (isBcrypt) {
      return bcrypt.compareSync(inputPasscode, storedHashOrPlain);
    } else {
      const match = inputPasscode === storedHashOrPlain;
      if (match) {
        const hashed = bcrypt.hashSync(inputPasscode, 10);
        updateCallback(hashed);
      }
      return match;
    }
  };

  if (role === "admin") {
    if (userId !== "admin" && userId.toLowerCase() !== "admin@zenti.edu") {
      res.status(401).json({ success: false, error: "Invalid administrative username identification." });
      return;
    }
    const adminPin = process.env.ADMIN_PASSCODE || "admin123";
    const isMatch = verifyAndMigratePasscode(passcode, adminPin, () => {});
    
    if (isMatch) {
      const token = jwt.sign(
        { userId: "admin", role: "admin", email: "admin@zenti.edu" },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      res.json({
        success: true,
        role: "admin",
        userId: "admin",
        token: token,
        profile: { name: "System Administrator", email: "admin@zenti.edu" }
      });
    } else {
      res.status(401).json({ success: false, error: "Invalid master administrative passcode security pin." });
    }
    return;
  }

  if (role === "accountant") {
    const accountantLecturer = (db.lecturers || []).find((l: any) => 
      (l.id === userId || 
       l.designatorCode?.toLowerCase() === userId.toLowerCase() || 
       l.email?.toLowerCase() === userId.toLowerCase()) && 
      l.isAccountant
    );
    if (!accountantLecturer) {
      res.status(401).json({ success: false, error: "Selected identity is not a registered Accountant." });
      return;
    }
    const expectedPin = accountantLecturer.passcode || "acc123";
    const isMatch = verifyAndMigratePasscode(passcode, expectedPin, (hashed) => {
      accountantLecturer.passcode = hashed;
      saveDatabase(db);
    });

    if (isMatch) {
      const token = jwt.sign(
        { userId: accountantLecturer.id, role: "accountant", email: accountantLecturer.email },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      res.json({
        success: true,
        role: "accountant",
        userId: accountantLecturer.id,
        token: token,
        profile: accountantLecturer
      });
    } else {
      res.status(401).json({ success: false, error: "Invalid Accountant security authorization key." });
    }
    return;
  }

  if (role === "librarian") {
    const librarianLecturer = (db.lecturers || []).find((l: any) => 
      (l.id === userId || 
       l.designatorCode?.toLowerCase() === userId.toLowerCase() || 
       l.email?.toLowerCase() === userId.toLowerCase()) && 
      (l.isLibrarian || l.id === "l3")
    );
    if (!librarianLecturer) {
      res.status(401).json({ success: false, error: "Selected identity is not a registered Archivist Librarian." });
      return;
    }
    const expectedPin = librarianLecturer.passcode || "lib123";
    const isMatch = verifyAndMigratePasscode(passcode, expectedPin, (hashed) => {
      librarianLecturer.passcode = hashed;
      saveDatabase(db);
    });

    if (isMatch) {
      const token = jwt.sign(
        { userId: librarianLecturer.id, role: "librarian", email: librarianLecturer.email },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      res.json({
        success: true,
        role: "librarian",
        userId: librarianLecturer.id,
        token: token,
        profile: librarianLecturer
      });
    } else {
      res.status(401).json({ success: false, error: "Invalid Librarian security clearance key." });
    }
    return;
  }

  if (role === "student") {
    const studentRecord = (db.students || []).find((s: any) => 
      s.id === userId || 
      s.admissionNo?.toLowerCase() === userId.toLowerCase() || 
      s.email?.toLowerCase() === userId.toLowerCase()
    );
    if (!studentRecord) {
      res.status(401).json({ success: false, error: "Selected student profile does not exist in student registry." });
      return;
    }
    const expectedPin = studentRecord.passcode || "student123";
    const isMatch = verifyAndMigratePasscode(passcode, expectedPin, (hashed) => {
      studentRecord.passcode = hashed;
      saveDatabase(db);
    });

    if (isMatch) {
      const token = jwt.sign(
        { userId: studentRecord.id, role: "student", email: studentRecord.email },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      res.json({
        success: true,
        role: "student",
        userId: studentRecord.id,
        token: token,
        profile: studentRecord
      });
    } else {
      res.status(401).json({ success: false, error: "Invalid student passcode credential." });
    }
    return;
  }

  if (role === "lecturer") {
    const lecturerRecord = (db.lecturers || []).find((l: any) => 
      (l.id === userId || 
       l.designatorCode?.toLowerCase() === userId.toLowerCase() || 
       l.email?.toLowerCase() === userId.toLowerCase()) && 
      !l.isAccountant && !l.isLibrarian
    );
    if (!lecturerRecord) {
      res.status(401).json({ success: false, error: "Selected faculty profile does not exist in instructor registry." });
      return;
    }
    const expectedPin = lecturerRecord.passcode || "staff123";
    const isMatch = verifyAndMigratePasscode(passcode, expectedPin, (hashed) => {
      lecturerRecord.passcode = hashed;
      saveDatabase(db);
    });

    if (isMatch) {
      const token = jwt.sign(
        { userId: lecturerRecord.id, role: "lecturer", email: lecturerRecord.email },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
      res.json({
        success: true,
        role: "lecturer",
        userId: lecturerRecord.id,
        token: token,
        profile: lecturerRecord
      });
    } else {
      res.status(401).json({ success: false, error: "Invalid lecturer/instructor passcode credential." });
    }
    return;
  }

  res.status(400).json({ success: false, error: "Requested user role context is invalid or unsupported." });
});

// Passcode Update Endpoint - Allows active profile holders to change their access passcode/password
app.post("/api/auth/change-passcode", (req, res) => {
  const { role, userId, currentPasscode, newPasscode } = req.body;
  if (!role || !userId || !currentPasscode || !newPasscode) {
    res.status(400).json({ success: false, error: "Missing required parameters for passcode update." });
    return;
  }

  if (typeof role !== 'string' || typeof userId !== 'string' || typeof currentPasscode !== 'string' || typeof newPasscode !== 'string') {
    res.status(400).json({ success: false, error: "Invalid parameter types." });
    return;
  }

  if (newPasscode.length < 6) {
    res.status(400).json({ success: false, error: "New passcode must be at least 6 characters." });
    return;
  }

  const db = getDatabase();

  const verifyPasscode = (inputPasscode: string, storedHashOrPlain: string) => {
    const isBcrypt = storedHashOrPlain.startsWith('$2b$') || storedHashOrPlain.startsWith('$2a$') || storedHashOrPlain.startsWith('$2y$');
    if (isBcrypt) {
      return bcrypt.compareSync(inputPasscode, storedHashOrPlain);
    }
    return inputPasscode === storedHashOrPlain;
  };

  if (role === "student") {
    const studentIdx = (db.students || []).findIndex((s: any) => s.id === userId);
    if (studentIdx === -1) {
      res.status(404).json({ success: false, error: "Student profile not found." });
      return;
    }
    const student = db.students[studentIdx];
    const expected = student.passcode || "student123";
    if (!verifyPasscode(currentPasscode, expected)) {
      res.status(401).json({ success: false, error: "Incorrect current passcode." });
      return;
    }
    db.students[studentIdx].passcode = bcrypt.hashSync(newPasscode, 10);
    saveDatabase(db);
    res.json({ success: true, message: "Passcode updated successfully." });
    return;
  }

  if (["lecturer", "accountant", "librarian"].includes(role)) {
    const lecturerIdx = (db.lecturers || []).findIndex((l: any) => l.id === userId);
    if (lecturerIdx === -1) {
      res.status(404).json({ success: false, error: "Staff/Faculty identity not found." });
      return;
    }
    const lecturer = db.lecturers[lecturerIdx];
    let expected = lecturer.passcode;
    if (!expected) {
      if (lecturer.isAccountant) expected = "acc123";
      else if (lecturer.isLibrarian || lecturer.id === "l3") expected = "lib123";
      else expected = "staff123";
    }
    if (!verifyPasscode(currentPasscode, expected)) {
      res.status(401).json({ success: false, error: "Incorrect current passcode." });
      return;
    }
    db.lecturers[lecturerIdx].passcode = bcrypt.hashSync(newPasscode, 10);
    saveDatabase(db);
    res.json({ success: true, message: "Passcode updated successfully." });
    return;
  }

  res.status(400).json({ success: false, error: "Unsupported or invalid role context." });
});

// Admin Route: Protected Administrative System Statistics
app.get("/api/admin/system-stats", checkRBAC(["admin", "accountant", "librarian"]), (req, res) => {
  const db = getDatabase();
  res.json({
    systemOnline: true,
    dbStoreSize: fs.existsSync(DB_FILE) ? fs.statSync(DB_FILE).size : 0,
    metrics: {
      totalCourses: (db.courses || []).length,
      totalStudents: (db.students || []).length,
      totalLecturers: (db.lecturers || []).length,
      totalBooks: (db.books || []).length,
    },
    environment: process.env.NODE_ENV || "development",
    lastBackup: new Date().toISOString()
  });
});

// ==========================================
// PASSWORD RESET REQUEST ENDPOINTS
// ==========================================

// Submit a password reset request
app.post("/api/auth/reset-request", (req, res) => {
  const { email, reason } = req.body;
  if (!email) {
    res.status(400).json({ success: false, error: "Email is required." });
    return;
  }

  const db = getDatabase();
  const searchEmail = email.trim().toLowerCase();

  let foundUser: any = null;
  let detectedRole: 'student' | 'lecturer' | 'accountant' | 'librarian' = 'student';

  // Check Lecturers & Staff
  const matchLec = (db.lecturers || []).find((l: any) => l.email.toLowerCase() === searchEmail);
  if (matchLec) {
    foundUser = matchLec;
    if (matchLec.isAccountant) {
      detectedRole = 'accountant';
    } else if (matchLec.isLibrarian || matchLec.id === 'l3') {
      detectedRole = 'librarian';
    } else {
      detectedRole = 'lecturer';
    }
  } else {
    // Check Students
    const matchStud = (db.students || []).find((s: any) => s.email.toLowerCase() === searchEmail);
    if (matchStud) {
      foundUser = matchStud;
      detectedRole = 'student';
    }
  }

  if (!foundUser) {
    res.status(404).json({ success: false, error: `No account registered with "${email}" could be located.` });
    return;
  }

  // Prevent multiple pending requests for the same user
  const existingPending = (db.passwordResetRequests || []).find(
    (r: any) => r.email.toLowerCase() === searchEmail && r.status === 'pending'
  );
  if (existingPending) {
    res.status(400).json({ 
      success: false, 
      error: "You already have a pending reset request under review by the Administrator." 
    });
    return;
  }

  const newRequest = {
    id: `req-${Date.now()}`,
    userId: foundUser.id,
    name: foundUser.name,
    email: foundUser.email,
    role: detectedRole,
    date: new Date().toLocaleString(),
    reason: reason || "Forgotten password",
    status: 'pending'
  };

  db.passwordResetRequests = [newRequest, ...(db.passwordResetRequests || [])];
  saveDatabase(db);

  res.status(201).json({ success: true, message: "Reset request submitted to the Administrator.", request: newRequest });
});

// Check status of password reset requests for a given email
app.get("/api/auth/reset-requests", (req, res) => {
  const { email } = req.query;
  if (!email) {
    res.status(400).json({ success: false, error: "Missing email parameter" });
    return;
  }
  const db = getDatabase();
  const list = (db.passwordResetRequests || []).filter(
    (r: any) => r.email.toLowerCase() === (email as string).trim().toLowerCase()
  );
  res.json({ success: true, requests: list });
});

// Admin Route: Get all password reset requests
app.get("/api/admin/reset-requests", checkRBAC(["admin"]), (req, res) => {
  const db = getDatabase();
  res.json({ success: true, requests: db.passwordResetRequests || [] });
});

// Admin Route: Take action on a password reset request
app.post("/api/admin/reset-requests/:id/action", checkRBAC(["admin"]), (req, res) => {
  const { id } = req.params;
  const { action, feedback, passcode } = req.body; // action: 'approve' | 'reject', passcode: custom passcode set by admin
  if (!action || !["approve", "reject"].includes(action)) {
    res.status(400).json({ success: false, error: "Invalid action. Must be 'approve' or 'reject'." });
    return;
  }

  const db = getDatabase();
  const reqIdx = (db.passwordResetRequests || []).findIndex((r: any) => r.id === id);
  if (reqIdx === -1) {
    res.status(404).json({ success: false, error: "Password reset request not found." });
    return;
  }

  const resetReq = db.passwordResetRequests[reqIdx];
  if (resetReq.status !== 'pending') {
    res.status(400).json({ success: false, error: "Request has already been processed." });
    return;
  }

  if (action === "approve") {
    const finalPasscode = passcode || Math.floor(1000 + Math.random() * 9000).toString();
    
    // Update the corresponding user's passcode in the database
    let userFound = false;
    if (resetReq.role === "student") {
      const studentIdx = (db.students || []).findIndex((s: any) => s.id === resetReq.userId);
      if (studentIdx !== -1) {
        db.students[studentIdx].passcode = finalPasscode;
        userFound = true;
      }
    } else {
      // lecturer, accountant, librarian
      const lecturerIdx = (db.lecturers || []).findIndex((l: any) => l.id === resetReq.userId);
      if (lecturerIdx !== -1) {
        db.lecturers[lecturerIdx].passcode = finalPasscode;
        userFound = true;
      }
    }

    if (!userFound) {
      res.status(404).json({ success: false, error: "Corresponding user account not found in database." });
      return;
    }

    db.passwordResetRequests[reqIdx].status = 'resolved';
    db.passwordResetRequests[reqIdx].temporaryPasscode = finalPasscode;
    db.passwordResetRequests[reqIdx].adminFeedback = feedback || "Approved and passcode updated.";
  } else {
    db.passwordResetRequests[reqIdx].status = 'rejected';
    db.passwordResetRequests[reqIdx].adminFeedback = feedback || "Request declined by Administrator.";
  }

  saveDatabase(db);
  res.json({ success: true, request: db.passwordResetRequests[reqIdx] });
});

// 2. Fetch Full Database State
app.get("/api/data", async (req, res) => {
  try {
    const dbState = await loadFullDatabaseState();
    res.json(dbState);
  } catch (error) {
    console.error("Failed to load full database state:", error);
    res.json(getDatabase());
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
    const lecturerRows = await db.select().from(lecturers);

    const subjectRows = await db.select().from(lecturerSubjects);
    const publicationRows = await db.select().from(lecturerPublications);
    const researchRows = await db.select().from(lecturerResearchInterests);
    const officeRows = await db.select().from(officeHourSlots);

    const result = lecturerRows.map((lecturer) => ({
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
    }));

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
        passcode: lecturerData.passcode ?? "lecturer123",
      })
      .returning();

    // Sync database cache
    const fullDb = await loadFullDatabaseState();
    saveDatabase(fullDb);

    res.status(201).json(lecturer);
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
    // Dynamic fallback to local JSON file database
    const dbVal = getDatabase();
    const mockTx = dbVal.transactions || [];
    const sorted = [...mockTx]
      .sort((a: any, b: any) => new Date(b.created_at || b.createdAt || 0).getTime() - new Date(a.created_at || a.createdAt || 0).getTime())
      .slice(0, 5);
    res.json(sorted);
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
        return res.json(cachedStudent);
      }
      return res.status(404).json({ error: `Student with admission number ${admissionNo} not found.` });
    }

    res.json(student);
  } catch (err: any) {
    console.error("Error searching student by admission_no:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 6. REST Resource: Students
app.get("/api/students", async (req, res) => {
  try {
    const fullDb = await loadFullDatabaseState();
    res.json(fullDb.students || []);
  } catch (err: any) {
    console.error("Failed to fetch students:", err);
    res.json(getDatabase().students || []);
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
          passcode: studentData.passcode ?? "student123",
        })
        .returning();

      return student;
      
    });

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

app.post("/api/student-enrollments", async (req, res) => {
  try {
    const { studentId, courseCode } = req.body;

    if (!studentId || !courseCode) {
      return res.status(400).json({
        error: "studentId and courseCode are required",
      });
    }

    const [enrollment] = await db
      .insert(studentEnrollments)
      .values({
        studentId,
        courseCode,
      })
      .returning();

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

    res.status(201).json(enrollment);
  } catch (error: any) {
    console.error("Failed to register unit:", error);

    res.status(500).json({
      error: error.message,
    });
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
  // Initialize the PostgreSQL database state
  await initPostgresDB();

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
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running on port ${PORT}`);
    });
  }
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});

export default app;
