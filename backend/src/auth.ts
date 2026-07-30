import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { and, eq, or, sql } from 'drizzle-orm';
import { db } from './db/index.ts';
import { users, students, lecturers } from './db/schema.ts';

const BCRYPT_PREFIXES = ['$2b$', '$2a$', '$2y$'];

export function isBcryptHash(value: string): boolean {
  if (!value) return false;
  return BCRYPT_PREFIXES.some((prefix) => value.startsWith(prefix));
}

export function hashPassword(plain: string): string {
  if (!plain) return '';
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(input: string, stored: string): boolean {
  if (!stored || !input) return false;
  // Only accept bcrypt hashes stored in PostgreSQL — no plaintext fallback auth.
  if (!isBcryptHash(stored)) {
    return false;
  }
  return bcrypt.compareSync(input, stored);
}

/** An expected, safe-to-return failure from an administrator password reset. */
export class PasswordResetError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PasswordResetError';
  }
}

export function getDefaultPasswordForRole(role: string): string {
  const envKeyByRole: Record<string, string | undefined> = {
    student: process.env.DEFAULT_STUDENT_PASSWORD,
    accountant: process.env.DEFAULT_ACCOUNTANT_PASSWORD,
    librarian: process.env.DEFAULT_LIBRARIAN_PASSWORD,
    lecturer: process.env.DEFAULT_LECTURER_PASSWORD,
    admin: process.env.ADMIN_PASSCODE || process.env.DEFAULT_ADMIN_PASSWORD,
  };
  const fromEnv = envKeyByRole[role];
  if (fromEnv && fromEnv.trim()) {
    return fromEnv.trim();
  }
  // Never fall back to well-known demo passwords — generate a one-time secret.
  return crypto.randomBytes(12).toString('base64url');
}

export function resolvePassword(rawPassword: string | undefined, role: string): {
  plain: string;
  wasGenerated: boolean;
} {
  if (rawPassword && rawPassword.trim()) {
    return { plain: rawPassword.trim(), wasGenerated: false };
  }
  return { plain: getDefaultPasswordForRole(role), wasGenerated: true };
}

export function sanitizeProfile(profileObj: Record<string, unknown> | null | undefined) {
  if (!profileObj) return profileObj;
  const { passcode: _, passwordHash: __, mustChangePassword: ___, ...rest } = profileObj;
  return rest;
}

export function issueAuthToken(userId: string, role: string, email: string, jwtSecret: string, roleId?: string): string {
  return jwt.sign({ userId, role, email, roleId: roleId || userId }, jwtSecret, { expiresIn: '24h' });
}

export interface UserAuthRecord {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  role: string;
  roleId: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Finds a user record in the `users` table using admission number, staff code, username, or email.
 *
 * The `role_id` / `uid` columns are matched as an internal fallback only (admin password
 * resets and reset-requests look users up by profile id). Clients must always authenticate
 * with a username / admission number / staff code / email - never a profile UUID.
 */
export async function findUserByIdentifier(identifier: string, roleHint?: string): Promise<any | null> {
  if (!identifier) return null;
  const cleanId = identifier.trim().toLowerCase();

  const records = await db.execute(sql`
    SELECT * FROM users
    WHERE (LOWER(username) = ${cleanId}
       OR LOWER(email) = ${cleanId}
       OR (role_id IS NOT NULL AND LOWER(role_id) = ${cleanId})
       OR (uid IS NOT NULL AND LOWER(uid) = ${cleanId}))
      AND NOT EXISTS (
        SELECT 1 FROM archive_records ar
        WHERE (ar.resource_type = 'user' AND ar.resource_id = users.id::text)
           OR (ar.resource_type = 'student' AND users.role = 'student' AND ar.resource_id = users.role_id)
           OR (ar.resource_type = 'lecturer' AND users.role IN ('lecturer', 'accountant', 'librarian') AND ar.resource_id = users.role_id)
      )
    LIMIT 5
  `);

  const rows: any[] = records.rows || [];
  if (rows.length === 0) return null;

  if (roleHint && rows.length > 1) {
    const matchedByRole = rows.find((r: any) => r.role === roleHint);
    if (matchedByRole) return matchedByRole;
  }

  return rows[0];
}

/**
 * Upsert a user auth record into the `users` table.
 */
export async function upsertUserAuthRecord(params: {
  uid?: string;
  username: string;
  email: string;
  passwordHash: string;
  role: string;
  roleId?: string | null;
  isActive?: boolean;
  mustChangePassword?: boolean;
}): Promise<any> {
  const uid = (params.uid || params.username).trim();
  const username = params.username.trim();
  const email = params.email.trim().toLowerCase();
  const role = params.role.trim();
  const roleId = params.roleId || null;
  const isActive = params.isActive !== false;
  const mustChangePassword = params.mustChangePassword !== false;
  const passwordHash = isBcryptHash(params.passwordHash) ? params.passwordHash : hashPassword(params.passwordHash);

  try {
    const existing = await db.execute(sql`
      SELECT id FROM users 
      WHERE LOWER(uid) = LOWER(${uid})
         OR LOWER(username) = LOWER(${username})
         OR LOWER(email) = LOWER(${email})
         OR (role_id IS NOT NULL AND LOWER(role_id) = LOWER(${roleId}))
      LIMIT 1
    `);

    if (existing.rows.length > 0) {
      const userId = existing.rows[0].id;
      const res = await db.execute(sql`
        UPDATE users
        SET uid = ${uid},
            username = ${username},
            email = ${email},
            password_hash = ${passwordHash},
            role = ${role},
            role_id = ${roleId},
            is_active = ${isActive},
            must_change_password = ${mustChangePassword},
            updated_at = NOW()
        WHERE id = ${userId}
        RETURNING *
      `);
      return res.rows[0];
    } else {
      const res = await db.execute(sql`
        INSERT INTO users (uid, username, email, password_hash, role, role_id, is_active, must_change_password, created_at, updated_at)
        VALUES (${uid}, ${username}, ${email}, ${passwordHash}, ${role}, ${roleId}, ${isActive}, ${mustChangePassword}, NOW(), NOW())
        RETURNING *
      `);
      return res.rows[0];
    }
  } catch (err) {
    console.error("Error upserting user auth record:", err);
    throw err;
  }
}

/**
 * Database Migration Function:
 * 1. Ensures `users` table columns match the production-grade specification.
 * 2. Removes obsolete authentication columns (passcode, must_change_password) from profile tables (`students`, `lecturers`).
 * 3. Migrates existing default accounts and role profiles into `users`.
 */
export async function migrateAuthSchemaAndData(inMemoryDb?: any): Promise<void> {
  try {
    console.log("Beginning authentication system database migration...");

    // 1. Create or ensure users table structure in PostgreSQL
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        uid VARCHAR(255) UNIQUE,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'student',
        role_id VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        must_change_password BOOLEAN DEFAULT TRUE NOT NULL,
        last_login TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `);

    // Ensure columns exist on users table in case table existed previously with different schema
    await db.execute(sql`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS uid VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id VARCHAR(255);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    `);

    // 2. Drop obsolete auth columns from profile tables if present
    await db.execute(sql`
      DO $$ 
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'passcode') THEN
          ALTER TABLE students DROP COLUMN passcode;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'must_change_password') THEN
          ALTER TABLE students DROP COLUMN must_change_password;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lecturers' AND column_name = 'passcode') THEN
          ALTER TABLE lecturers DROP COLUMN passcode;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lecturers' AND column_name = 'must_change_password') THEN
          ALTER TABLE lecturers DROP COLUMN must_change_password;
        END IF;
      END $$;
    `);

    // 3. Migrate Master Admin User (skip if already migrated, to avoid overwriting a changed password)
    const existingAdmin = await findUserByIdentifier('admin');
    if (!existingAdmin) {
      const adminPass = getDefaultPasswordForRole('admin');
      const adminHash = hashPassword(adminPass);
      await upsertUserAuthRecord({
        username: 'admin',
        email: 'admin@zenti.edu',
        passwordHash: adminHash,
        role: 'admin',
        roleId: 'admin',
        isActive: true,
        mustChangePassword: !process.env.ADMIN_PASSCODE && !process.env.DEFAULT_ADMIN_PASSWORD,
      });
      if (!process.env.ADMIN_PASSCODE && !process.env.DEFAULT_ADMIN_PASSWORD) {
        console.warn(
          '[auth] Admin account created with a generated password. Set ADMIN_PASSCODE (or DEFAULT_ADMIN_PASSWORD) and reset the admin user, or complete first-login password change.'
        );
      }
    }

    // 4. Migrate Students from Database / Memory Store
    let studentList: any[] = [];
    try {
      studentList = await db.select().from(students);
    } catch (e) {
      studentList = (inMemoryDb && inMemoryDb.students) || [];
    }

    for (const st of studentList) {
      const username = st.admissionNo || st.id;
      // Skip students that already have a users record; re-migrating would overwrite
      // any password they've since set via the change-password flow.
      const existingStudentUser = await findUserByIdentifier(username) || (st.email ? await findUserByIdentifier(st.email) : null);
      if (existingStudentUser) continue;

      const { plain: rawPass } = resolvePassword(st.passcode, 'student');
      const passHash = isBcryptHash(rawPass) ? rawPass : hashPassword(rawPass);
      const mustChange = st.mustChangePassword !== false;
      await upsertUserAuthRecord({
        username,
        email: st.email,
        passwordHash: passHash,
        role: 'student',
        roleId: st.id,
        isActive: st.accountStatus !== 'Disabled',
        mustChangePassword: mustChange,
      });
    }

    // 5. Migrate Lecturers, Librarians, Accountants from Database / Memory Store
    let lecturerList: any[] = [];
    try {
      lecturerList = await db.select().from(lecturers);
    } catch (e) {
      lecturerList = (inMemoryDb && inMemoryDb.lecturers) || [];
    }

    for (const lec of lecturerList) {
      let role = 'lecturer';
      if (lec.isAccountant) {
        role = 'accountant';
      } else if (lec.isLibrarian || lec.id === 'l3') {
        role = 'librarian';
      }

      const username = lec.designatorCode || lec.id;
      // Skip staff that already have a users record; re-migrating would overwrite
      // any password they've since set via the change-password flow.
      const existingStaffUser = await findUserByIdentifier(username) || (lec.email ? await findUserByIdentifier(lec.email) : null);
      if (existingStaffUser) continue;

      const { plain: rawPass } = resolvePassword(lec.passcode, role);
      const passHash = isBcryptHash(rawPass) ? rawPass : hashPassword(rawPass);
      const mustChange = lec.mustChangePassword !== false;
      await upsertUserAuthRecord({
        username,
        email: lec.email,
        passwordHash: passHash,
        role,
        roleId: lec.id,
        isActive: lec.isActive !== false,
        mustChangePassword: mustChange,
      });
    }

    console.log("Authentication system database migration completed successfully!");
  } catch (err) {
    console.error("Failed to run auth system database migration:", err);
  }
}

/**
 * Authenticates users exclusively through the `users` table.
 */
export async function authenticateUser(params: {
  identifier: string;
  passcode: string;
  roleHint?: string;
  jwtSecret: string;
  getProfileFn?: (role: string, roleId: string | null, email: string) => Promise<any>;
}): Promise<{
  success: boolean;
  status?: string;
  role?: string;
  userId?: string;
  username?: string;
  email?: string;
  token?: string;
  profile?: any;
  message?: string;
  error?: string;
}> {
  const { identifier, passcode, roleHint, jwtSecret, getProfileFn } = params;

  if (!identifier || !passcode) {
    return { success: false, error: "Missing required identity or password." };
  }

  const user = await findUserByIdentifier(identifier, roleHint);

  if (!user) {
    return { success: false, error: "Invalid username or password." };
  }

  // Check if active
  if (user.is_active === false) {
    return { success: false, error: "Account has been deactivated. Please contact System Administrator." };
  }

  // Verify password using bcrypt against PostgreSQL users.password_hash
  const isMatch = verifyPassword(passcode, user.password_hash);
  if (!isMatch) {
    return { success: false, error: "Invalid username or password." };
  }

  // Update last_login timestamp
  try {
    await db.execute(sql`
      UPDATE users SET last_login = NOW() WHERE id = ${user.id}
    `);
  } catch (e) {}

  const profileId = user.role_id || user.username || String(user.id);
  const userRole = user.role;

  // Check if password change is required on first login
  if (user.must_change_password === true) {
    return {
      success: true,
      status: "REQUIRES_PASSWORD_CHANGE",
      userId: profileId,
      // The identifier the client must keep using to sign in / change the password.
      username: user.username,
      role: userRole,
      email: user.email,
      message: "Password change is required on first login."
    };
  }

  // Generate JWT token
  const token = issueAuthToken(profileId, userRole, user.email, jwtSecret, user.role_id);

  // Load user profile if profile loader function is provided
  let profileObj: any = null;
  if (getProfileFn) {
    profileObj = await getProfileFn(userRole, user.role_id, user.email);
  }

  return {
    success: true,
    role: userRole,
    userId: profileId,
    username: user.username,
    email: user.email,
    token,
    profile: sanitizeProfile(profileObj)
  };
}

/**
 * Changes user password and updates must_change_password to false in the `users` table.
 */
export async function changeUserPassword(params: {
  identifier: string;
  roleHint?: string;
  currentPasscode: string;
  newPasscode: string;
  jwtSecret: string;
  getProfileFn?: (role: string, roleId: string | null, email: string) => Promise<any>;
}): Promise<{
  success: boolean;
  message?: string;
  token?: string;
  role?: string;
  userId?: string;
  username?: string;
  email?: string;
  profile?: any;
  error?: string;
}> {
  const { identifier, roleHint, currentPasscode, newPasscode, jwtSecret, getProfileFn } = params;

  if (!identifier || !currentPasscode || !newPasscode) {
    return { success: false, error: "Missing required parameters for password update." };
  }

  if (typeof newPasscode !== 'string' || newPasscode.length < 6) {
    return { success: false, error: "New password must be at least 6 characters long." };
  }

  const user = await findUserByIdentifier(identifier, roleHint);
  if (!user) {
    return { success: false, error: "User account not found." };
  }

  const isMatch = verifyPassword(currentPasscode, user.password_hash);
  if (!isMatch) {
    return { success: false, error: "Incorrect current password." };
  }

  const newHash = hashPassword(newPasscode);

  await db.execute(sql`
    UPDATE users
    SET password_hash = ${newHash},
        must_change_password = FALSE,
        updated_at = NOW()
    WHERE id = ${user.id}
  `);

  const profileId = user.role_id || user.username || String(user.id);
  const userRole = user.role;
  const token = issueAuthToken(profileId, userRole, user.email, jwtSecret, user.role_id);

  let profileObj: any = null;
  if (getProfileFn) {
    profileObj = await getProfileFn(userRole, user.role_id, user.email);
  }

  return {
    success: true,
    message: "Password updated successfully.",
    token,
    role: userRole,
    userId: profileId,
    // Echo back the canonical login identifier so the client can remember it.
    username: user.username,
    email: user.email,
    profile: sanitizeProfile(profileObj)
  };
}

/**
 * Resets a user's password (e.g. by admin approval) and sets must_change_password to true.
 */
export async function adminResetUserPassword(
  identifier: string,
  customNewPassword?: string
): Promise<{ success: boolean; temporaryPasscode: string; error?: string }> {
  const user = await findUserByIdentifier(identifier);
  if (!user) {
    return { success: false, temporaryPasscode: '', error: "User account not found." };
  }

  const tempPass = customNewPassword || Math.floor(100000 + Math.random() * 900000).toString();
  const hashed = hashPassword(tempPass);

  await db.execute(sql`
    UPDATE users
    SET password_hash = ${hashed},
        must_change_password = TRUE,
        updated_at = NOW()
    WHERE id = ${user.id}
  `);

  return { success: true, temporaryPasscode: tempPass };
}

/**
 * Resets a student credential against the relational source of truth.
 *
 * Student profile status and the matching authentication record are updated in one
 * transaction, so a response is only successful when the generated credential can
 * actually be used to sign in.
 */
export async function resetStudentPassword(
  studentId: string,
): Promise<{ temporaryPasscode: string }> {
  if (!studentId || !studentId.trim()) {
    throw new PasswordResetError(400, 'STUDENT_ID_REQUIRED', 'Student ID is required.');
  }

  const normalizedStudentId = studentId.trim();

  return db.transaction(async (tx) => {
    const studentRows = await tx
      .select({
        id: students.id,
        admissionNo: students.admissionNo,
        email: students.email,
      })
      .from(students)
      .where(and(
        eq(students.id, normalizedStudentId),
        sql`NOT EXISTS (
          SELECT 1 FROM archive_records
          WHERE resource_type = 'student' AND resource_id = ${students.id}::text
        )`,
      ))
      .limit(2);

    if (studentRows.length === 0) {
      throw new PasswordResetError(404, 'STUDENT_NOT_FOUND', 'Student record was not found.');
    }
    if (studentRows.length > 1) {
      throw new PasswordResetError(409, 'DUPLICATE_STUDENT_RECORDS', 'Multiple student records match this ID.');
    }

    const student = studentRows[0];
    const accountResult = await tx.execute(sql`
      SELECT id
      FROM users
      WHERE role = 'student'
        AND (
          role_id = ${student.id}
          OR uid = ${student.admissionNo}
          OR LOWER(username) = LOWER(${student.admissionNo})
          OR LOWER(email) = LOWER(${student.email})
        )
      LIMIT 2
    `);
    const accounts: Array<{ id: number }> = accountResult.rows as Array<{ id: number }>;

    if (accounts.length === 0) {
      throw new PasswordResetError(
        404,
        'AUTH_ACCOUNT_NOT_FOUND',
        'This student has no linked authentication account. Create or repair the account before resetting its password.',
      );
    }
    if (accounts.length > 1) {
      throw new PasswordResetError(
        409,
        'DUPLICATE_AUTH_ACCOUNTS',
        'Multiple authentication accounts match this student. Resolve the duplicate accounts before resetting the password.',
      );
    }

    const temporaryPasscode = `ZENTI-${crypto.randomInt(100000, 1000000)}`;
    const passwordHash = hashPassword(temporaryPasscode);
    const updatedAccounts = await tx
      .update(users)
      .set({
        passwordHash,
        mustChangePassword: true,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(users.id, accounts[0].id))
      .returning({ id: users.id });

    if (updatedAccounts.length !== 1) {
      throw new PasswordResetError(500, 'AUTH_ACCOUNT_UPDATE_FAILED', 'The authentication account could not be updated.');
    }

    await tx
      .update(students)
      .set({ accountStatus: 'Pending Setup' })
      .where(eq(students.id, student.id));

    return { temporaryPasscode };
  });
}
