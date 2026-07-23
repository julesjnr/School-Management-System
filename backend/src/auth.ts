import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { eq, or, sql } from 'drizzle-orm';
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
  if (isBcryptHash(stored)) {
    return bcrypt.compareSync(input, stored);
  }
  return input === stored;
}

export function getDefaultPasswordForRole(role: string): string {
  switch (role) {
    case 'student':
      return process.env.DEFAULT_STUDENT_PASSWORD || 'student123';
    case 'accountant':
      return process.env.DEFAULT_ACCOUNTANT_PASSWORD || 'acc123';
    case 'librarian':
      return process.env.DEFAULT_LIBRARIAN_PASSWORD || 'lib123';
    case 'lecturer':
      return process.env.DEFAULT_LECTURER_PASSWORD || 'staff123';
    case 'admin':
      return process.env.ADMIN_PASSCODE || 'admin123';
    default:
      return crypto.randomBytes(6).toString('hex');
  }
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
 */
export async function findUserByIdentifier(identifier: string, roleHint?: string): Promise<any | null> {
  if (!identifier) return null;
  const cleanId = identifier.trim().toLowerCase();

  try {
    const records = await db.execute(sql`
      SELECT * FROM users 
      WHERE LOWER(username) = ${cleanId}
         OR LOWER(email) = ${cleanId}
         OR (role_id IS NOT NULL AND LOWER(role_id) = ${cleanId})
         OR (uid IS NOT NULL AND LOWER(uid) = ${cleanId})
      LIMIT 5
    `);

    const rows: any[] = records.rows || [];
    if (rows.length === 0) return null;

    if (roleHint && rows.length > 1) {
      const matchedByRole = rows.find((r: any) => r.role === roleHint);
      if (matchedByRole) return matchedByRole;
    }

    return rows[0];
  } catch (err) {
    console.error("Error querying users table by identifier:", err);
    return null;
  }
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

    // 3. Migrate Master Admin User
    const adminPass = process.env.ADMIN_PASSCODE || 'admin123';
    const adminHash = hashPassword(adminPass);
    await upsertUserAuthRecord({
      username: 'admin',
      email: 'admin@zenti.edu',
      passwordHash: adminHash,
      role: 'admin',
      roleId: 'admin',
      isActive: true,
      mustChangePassword: false,
    });

    // 4. Migrate Students from Database / Memory Store
    let studentList: any[] = [];
    try {
      studentList = await db.select().from(students);
    } catch (e) {
      studentList = (inMemoryDb && inMemoryDb.students) || [];
    }

    for (const st of studentList) {
      const rawPass = st.passcode || 'student123';
      const passHash = isBcryptHash(rawPass) ? rawPass : hashPassword(rawPass);
      const mustChange = st.mustChangePassword !== false;
      const username = st.admissionNo || st.id;
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
      let defaultPin = 'staff123';
      if (lec.isAccountant) {
        role = 'accountant';
        defaultPin = 'acc123';
      } else if (lec.isLibrarian || lec.id === 'l3') {
        role = 'librarian';
        defaultPin = 'lib123';
      }

      const rawPass = lec.passcode || defaultPin;
      const passHash = isBcryptHash(rawPass) ? rawPass : hashPassword(rawPass);
      const mustChange = lec.mustChangePassword !== false;
      const username = lec.designatorCode || lec.id;
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
    return { success: false, error: "Invalid login credentials. User account not found." };
  }

  // Check if active
  if (user.is_active === false) {
    return { success: false, error: "Account has been deactivated. Please contact System Administrator." };
  }

  // Verify password using bcrypt
  const isMatch = verifyPassword(passcode, user.password_hash);
  if (!isMatch) {
    return { success: false, error: "Invalid password key." };
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
