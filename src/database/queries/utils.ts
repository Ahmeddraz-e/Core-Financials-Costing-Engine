import crypto from 'crypto';

/**
 * Generate a unique ID for database records
 */
export function generateId(prefix?: string): string {
  const id = crypto.randomUUID();
  return prefix ? `${prefix}-${id.substring(0, 8)}` : id.substring(0, 8);
}

/**
 * Hash a password using scrypt (Node.js built-in, no external deps)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash
 */
export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const computed = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computed, 'hex'));
}

/**
 * Generate a secure random token for sessions
 */
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
