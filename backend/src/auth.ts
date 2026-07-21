import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { db } from './db/index.ts';
import { users } from './db/schema.ts';

const BCRYPT_PREFIXES = ['$2b$', '$2a$', '$2y$'];

export function isBcryptHash(value: string): boolean {
  return BCRYPT_PREFIXES.some((prefix) => value.startsWith(prefix));
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(input: string, stored: string): boolean {
  if (!stored) return false;
  if (isBcryptHash(stored)) {
    return bcrypt.compareSync(input, stored);
  }
  return input === stored;
}

export function verifyAndMigratePasscode(
  inputPasscode: string,
  storedHashOrPlain: string,
  updateCallback: (hashed: string) => void,
): boolean {
  if (isBcryptHash(storedHashOrPlain)) {
    return bcrypt.compareSync(inputPasscode, storedHashOrPlain);
  }
  const match = inputPasscode === storedHashOrPlain;
  if (match) {
    updateCallback(hashPassword(inputPasscode));
  }
  return match;
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

export function requiresPasswordChange(profile: {
  mustChangePassword?: boolean;
  accountStatus?: string;
}): boolean {
  return profile.mustChangePassword === true || profile.accountStatus === 'Pending Setup';
}

export async function upsertUserAuthRecord(
  uid: string,
  email: string,
  role: string,
  passwordHash: string,
  mustChangePassword: boolean,
): Promise<void> {
  const existing = await db.select().from(users).where(eq(users.uid, uid)).limit(1);
  if (existing.length > 0) {
    await db
      .update(users)
      .set({ email, role, passwordHash, mustChangePassword })
      .where(eq(users.uid, uid));
    return;
  }
  await db.insert(users).values({ uid, email, role, passwordHash, mustChangePassword });
}

export function sanitizeProfile(profileObj: Record<string, unknown> | null | undefined) {
  if (!profileObj) return profileObj;
  const { passcode: _, passwordHash: __, ...rest } = profileObj;
  return rest;
}

export function issueAuthToken(userId: string, role: string, email: string, jwtSecret: string): string {
  return jwt.sign({ userId, role, email }, jwtSecret, { expiresIn: '24h' });
}
