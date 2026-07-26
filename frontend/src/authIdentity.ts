/**
 * Login identity helpers.
 *
 * A login identifier is what the backend `users` table calls `username` - an admission
 * number, a staff designator code, or an email address. It is NEVER a profile UUID
 * (`students.id` / `lecturers.id`, i.e. `users.role_id`). The backend still resolves a
 * UUID for internal lookups, so storing one silently "works" while making the login box
 * unusable for a human. Everything the client persists therefore goes through here.
 */

export const REMEMBERED_LOGIN_KEY = 'zenti_remembered_login';
export const PENDING_PASSWORD_CHANGE_KEY = 'zenti_pending_password_change';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isDatabaseUuid(value: string | null | undefined): boolean {
  return !!value && UUID_PATTERN.test(value.trim());
}

/** Returns the value only if it is usable as a human login identifier, else ''. */
export function asLoginIdentifier(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed || isDatabaseUuid(trimmed)) return '';
  return trimmed;
}

/** Picks the first candidate that is a real login identifier (username / code / email). */
export function pickLoginIdentifier(...candidates: (string | null | undefined)[]): string {
  for (const candidate of candidates) {
    const identifier = asLoginIdentifier(candidate);
    if (identifier) return identifier;
  }
  return '';
}

export interface RememberedLogin {
  identifier: string;
  role: string;
}

export function getRememberedLogin(): RememberedLogin | null {
  const raw = localStorage.getItem(REMEMBERED_LOGIN_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const identifier = asLoginIdentifier(parsed?.identifier);
    // Drop anything legacy or UUID-shaped rather than prefilling it again.
    if (!identifier) {
      localStorage.removeItem(REMEMBERED_LOGIN_KEY);
      return null;
    }
    return { identifier, role: parsed?.role || 'student' };
  } catch {
    localStorage.removeItem(REMEMBERED_LOGIN_KEY);
    return null;
  }
}

export function rememberLogin(identifier: string | null | undefined, role: string | null | undefined): void {
  const clean = asLoginIdentifier(identifier);
  if (!clean) {
    forgetRememberedLogin();
    return;
  }
  localStorage.setItem(REMEMBERED_LOGIN_KEY, JSON.stringify({ identifier: clean, role: role || 'student' }));
}

export function forgetRememberedLogin(): void {
  localStorage.removeItem(REMEMBERED_LOGIN_KEY);
}

export interface PendingPasswordChange {
  /** Identifier used to authenticate the change-password call. */
  identifier: string;
  /** Profile UUID, used only for post-login profile routing - never for authentication. */
  userId: string;
  role: string;
  email: string;
}

export function setPendingPasswordChange(pending: PendingPasswordChange): void {
  localStorage.setItem(PENDING_PASSWORD_CHANGE_KEY, JSON.stringify(pending));
}

export function getPendingPasswordChange(): PendingPasswordChange | null {
  const raw = localStorage.getItem(PENDING_PASSWORD_CHANGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return {
      // Tolerate records written before `identifier` existed by falling back to email.
      identifier: pickLoginIdentifier(parsed?.identifier, parsed?.username, parsed?.email),
      userId: parsed?.userId || '',
      role: parsed?.role || 'student',
      email: parsed?.email || ''
    };
  } catch {
    localStorage.removeItem(PENDING_PASSWORD_CHANGE_KEY);
    return null;
  }
}

export function clearPendingPasswordChange(): void {
  localStorage.removeItem(PENDING_PASSWORD_CHANGE_KEY);
}
