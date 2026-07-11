import 'dotenv/config';
import express from "express";
import path from "path";
import fs from "fs";
import { db } from "./src/db/index.ts";
import {
  systemState,
  students,
  studentEnrollments,
  payments,
  invoices,
  studentAttendance,
  examPapers,
  lecturers,
  courses,
  lecturerSubjects,
  lecturerPublications,
  lecturerResearchInterests,
  officeHourSlots,
} from "./src/db/schema.ts";
import { eq } from "drizzle-orm";
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

// Enable CORS for frontend API calls
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-user-role");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

const DB_FILE = path.join(process.cwd(), "db_store.json");

// Local cache for Postgres DB state to support synchronous access inside existing API controllers
let cachedDb: any = null;

// Helper to initialize database state from PostgreSQL
async function initPostgresDB() {
  try {
    if (!process.env.SQL_HOST || !process.env.SQL_PASSWORD || !process.env.SQL_USER || !process.env.SQL_DB_NAME) {
      throw new Error("Missing database environment variables (SQL_HOST, SQL_PASSWORD, SQL_USER, or SQL_DB_NAME). Please configure your local .env file.");
    }
    const existing = await db.select().from(systemState).where(eq(systemState.id, 1));
    if (existing.length > 0) {
      cachedDb = existing[0].data;
      console.log("Successfully loaded database state from PostgreSQL!");
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
      
      cachedDb = dbState;
      await db.insert(systemState).values({
        id: 1,
        data: dbState,
      });
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

// Helper to save database state
function saveDatabase(dbState: any) {
  cachedDb = dbState;
  
  // Persist asynchronously to Postgres
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
      console.log("Successfully persisted updated state to PostgreSQL.");
    })
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
    const userRole = req.headers["x-user-role"] || req.query.userRole;
    
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

  const db = getDatabase();

  if (role === "admin") {
    if (userId !== "admin") {
      res.status(401).json({ success: false, error: "Invalid administrative username identification." });
      return;
    }
    const adminPin = "admin123"; // Admin generated credentials
    if (passcode === adminPin) {
      res.json({
        success: true,
        role: "admin",
        userId: "admin",
        token: "session-token-admin-master-777",
        profile: { name: "System Administrator", email: "admin@zenti.edu" }
      });
    } else {
      res.status(401).json({ success: false, error: "Invalid master administrative passcode security pin." });
    }
    return;
  }

  if (role === "accountant") {
    const accountantLecturer = (db.lecturers || []).find((l: any) => l.id === userId && l.isAccountant);
    if (!accountantLecturer) {
      res.status(401).json({ success: false, error: "Selected identity is not a registered Accountant." });
      return;
    }
    const expectedPin = accountantLecturer.passcode || "acc123";
    if (passcode === expectedPin) {
      res.json({
        success: true,
        role: "accountant",
        userId,
        token: `session-token-accountant-${userId}`,
        profile: accountantLecturer
      });
    } else {
      res.status(401).json({ success: false, error: "Invalid Accountant security authorization key." });
    }
    return;
  }

  if (role === "librarian") {
    const librarianLecturer = (db.lecturers || []).find((l: any) => l.id === userId && (l.isLibrarian || l.id === "l3"));
    if (!librarianLecturer) {
      res.status(401).json({ success: false, error: "Selected identity is not a registered Archivist Librarian." });
      return;
    }
    const expectedPin = librarianLecturer.passcode || "lib123";
    if (passcode === expectedPin) {
      res.json({
        success: true,
        role: "librarian",
        userId,
        token: `session-token-librarian-${userId}`,
        profile: librarianLecturer
      });
    } else {
      res.status(401).json({ success: false, error: "Invalid Librarian security clearance key." });
    }
    return;
  }

  if (role === "student") {
    const studentRecord = (db.students || []).find((s: any) => s.id === userId);
    if (!studentRecord) {
      res.status(401).json({ success: false, error: "Selected student profile does not exist in student registry." });
      return;
    }
    const expectedPin = studentRecord.passcode || "student123";
    if (passcode === expectedPin) {
      res.json({
        success: true,
        role: "student",
        userId,
        token: `session-token-student-${userId}`,
        profile: studentRecord
      });
    } else {
      res.status(401).json({ success: false, error: "Invalid student passcode credential." });
    }
    return;
  }

  if (role === "lecturer") {
    const lecturerRecord = (db.lecturers || []).find((l: any) => l.id === userId && !l.isAccountant && !l.isLibrarian);
    if (!lecturerRecord) {
      res.status(401).json({ success: false, error: "Selected faculty profile does not exist in instructor registry." });
      return;
    }
    const expectedPin = lecturerRecord.passcode || "staff123";
    if (passcode === expectedPin) {
      res.json({
        success: true,
        role: "lecturer",
        userId,
        token: `session-token-lecturer-${userId}`,
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

  const db = getDatabase();

  if (role === "student") {
    const studentIdx = (db.students || []).findIndex((s: any) => s.id === userId);
    if (studentIdx === -1) {
      res.status(404).json({ success: false, error: "Student profile not found." });
      return;
    }
    const student = db.students[studentIdx];
    const expected = student.passcode || "student123";
    if (currentPasscode !== expected) {
      res.status(401).json({ success: false, error: "Incorrect current passcode." });
      return;
    }
    db.students[studentIdx].passcode = newPasscode;
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
    if (currentPasscode !== expected) {
      res.status(401).json({ success: false, error: "Incorrect current passcode." });
      return;
    }
    db.lecturers[lecturerIdx].passcode = newPasscode;
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
app.get("/api/data", (req, res) => {
  const db = getDatabase();
  res.json(db);
});

// 3. Sync/Save Entire Database State (Used by Frontend State-Sync Engine)
app.post("/api/data", (req, res) => {
  const incomingData = req.body;
  if (!incomingData || typeof incomingData !== "object") {
    res.status(400).json({ error: "Invalid data payload" });
    return;
  }

  const db = getDatabase();
  // Merge keys dynamically to ensure schema resilience
  const updatedDb = { ...db, ...incomingData };
  const success = saveDatabase(updatedDb);

  if (success) {
    res.json({ success: true, message: "Database synchronized successfully" });
  } else {
    res.status(500).json({ error: "Failed to persist database synchronization" });
  }
});

// 4. REST Resource: Courses
app.get("/api/courses", (req, res) => {
  const db = getDatabase();
  res.json(db.courses || []);
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
        faculty: courseData.faculty,
        active: courseData.active ?? true,
      })
      .returning();

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

    res.status(201).json(lecturer);
  } catch (error: any) {
    console.error("Failed to create lecturer:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});
   
// 6. REST Resource: Students
app.get("/api/students", (req, res) => {
  const db = getDatabase();
  res.json(db.students || []);
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
        amount: paymentData.amount,
        paymentMethod: paymentData.paymentMethod,
        transactionId: paymentData.transactionId,
        date: new Date().toISOString().split("T")[0],
        status: "unreconciled",
      })
      .returning();

    res.status(201).json(payment);
  } catch (error: any) {
    console.error("Failed to create payment:", error);

    res.status(500).json({
      error: error.message,
    });
  }
});
// 7. REST Resource: Books
app.get("/api/books", (req, res) => {
  const db = getDatabase();
  res.json(db.books || []);
});

app.post("/api/books", (req, res) => {
  const bookData = req.body;
  if (!bookData || !bookData.title || !bookData.author) {
    res.status(400).json({ error: "Book title and author are required" });
    return;
  }

  const db = getDatabase();
  const id = bookData.id || `book-${Date.now()}`;
  const existingIdx = (db.books || []).findIndex((b: any) => b.id === id);

  const bookRecord = {
    ...bookData,
    id
  };

  if (existingIdx >= 0) {
    db.books[existingIdx] = bookRecord;
  } else {
    db.books = [...(db.books || []), bookRecord];
  }

  saveDatabase(db);
  res.status(201).json(bookRecord);
});

// REST Resource: Exam Papers
app.get("/api/exam-papers", async (req, res) => {
  try {
    const papers = await db.select().from(examPapers);
    res.json(papers);
  } catch (error) {
    console.error("Failed to fetch exam papers:", error);
    res.status(500).json({
      error: "Failed to fetch exam papers",
    });
  }
});

// 8. REST Resource: Loans
app.get("/api/loans", (req, res) => {
  const db = getDatabase();
  res.json(db.loans || []);
});

app.post("/api/loans", (req, res) => {
  const loanData = req.body;
  if (!loanData || !loanData.bookId || !loanData.patronId) {
    res.status(400).json({ error: "Book ID and Patron ID are required" });
    return;
  }

  const db = getDatabase();
  const id = loanData.id || `loan-${Date.now()}`;
  const existingIdx = (db.loans || []).findIndex((l: any) => l.id === id);

  const loanRecord = {
    ...loanData,
    id
  };

  if (existingIdx >= 0) {
    db.loans[existingIdx] = loanRecord;
  } else {
    db.loans = [...(db.loans || []), loanRecord];
  }

  saveDatabase(db);
  res.status(201).json(loanRecord);
});

// 9. REST Resource: Library Gate Logs
app.get("/api/gate-logs", (req, res) => {
  const db = getDatabase();
  res.json(db.libraryGateLogs || []);
});

app.post("/api/gate-logs", (req, res) => {
  const gateLog = req.body;
  if (!gateLog || !gateLog.patronName || !gateLog.gateAction) {
    res.status(400).json({ error: "Patron name and gate action are required" });
    return;
  }

  const db = getDatabase();
  const newLog = {
    ...gateLog,
    id: gateLog.id || `log-${Date.now()}`,
    timestamp: gateLog.timestamp || new Date().toLocaleString()
  };

  db.libraryGateLogs = [newLog, ...(db.libraryGateLogs || [])];
  saveDatabase(db);
  res.status(201).json(newLog);
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
