import Database from 'better-sqlite3';
import { generateId, hashPassword, verifyPassword, generateToken } from './utils';

export interface UserRecord {
  id: string;
  username: string;
  role: string;
  permissions: string | null;
  nameAr: string;
  nameEn: string;
  active: number;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface SessionRecord {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  username: string;
  role: string;
  permissions: string | null;
  nameAr: string;
  nameEn: string;
}

export function getUserByUsername(db: Database.Database, username: string): (UserRecord & { passwordHash: string }) | undefined {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
}

export function getUserById(db: Database.Database, id: string): UserRecord | undefined {
  return db.prepare('SELECT id, username, role, permissions, nameAr, nameEn, active, createdAt, lastLoginAt FROM users WHERE id = ?').get(id) as any;
}

export function getAllUsers(db: Database.Database): UserRecord[] {
  return db.prepare('SELECT id, username, role, permissions, nameAr, nameEn, active, createdAt, lastLoginAt FROM users ORDER BY createdAt DESC').all() as any[];
}

export function createUser(db: Database.Database, data: { username: string; password: string; role: string; nameAr: string; nameEn: string; permissions?: string | null }): UserRecord {
  const existing = getUserByUsername(db, data.username);
  if (existing) throw new Error('Username already exists');

  const id = generateId('user');
  const passwordHash = hashPassword(data.password);

  // Migration safety: add column if not exists
  try { db.prepare('ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT NULL').run(); } catch { /* already exists */ }

  db.prepare(
    'INSERT INTO users (id, username, passwordHash, role, permissions, nameAr, nameEn) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, data.username, passwordHash, data.role, data.permissions ?? null, data.nameAr, data.nameEn);

  return getUserById(db, id)!;
}

export function updateUser(db: Database.Database, id: string, data: { nameAr?: string; nameEn?: string; role?: string; active?: boolean; password?: string; permissions?: string | null }): UserRecord {
  const user = getUserById(db, id);
  if (!user) throw new Error('User not found');

  if (data.nameAr !== undefined) db.prepare('UPDATE users SET nameAr = ? WHERE id = ?').run(data.nameAr, id);
  if (data.nameEn !== undefined) db.prepare('UPDATE users SET nameEn = ? WHERE id = ?').run(data.nameEn, id);
  if (data.role !== undefined) db.prepare('UPDATE users SET role = ? WHERE id = ?').run(data.role, id);
  if (data.active !== undefined) db.prepare('UPDATE users SET active = ? WHERE id = ?').run(data.active ? 1 : 0, id);
  if (data.permissions !== undefined) db.prepare('UPDATE users SET permissions = ? WHERE id = ?').run(data.permissions, id);
  if (data.password) {
    const passwordHash = hashPassword(data.password);
    db.prepare('UPDATE users SET passwordHash = ? WHERE id = ?').run(passwordHash, id);
  }

  return getUserById(db, id)!;
}

export function deleteUser(db: Database.Database, id: string): void {
  const user = getUserById(db, id);
  if (!user) throw new Error('User not found');
  if (user.role === 'admin') throw new Error('Cannot delete admin user');
  db.prepare('DELETE FROM users WHERE id = ?').run(id);
}

export function authenticateUser(db: Database.Database, username: string, password: string): { user: UserRecord; token: string; expiresAt: string } {
  const user = getUserByUsername(db, username);
  if (!user) throw new Error('Invalid username or password');
  if (!user.active) throw new Error('Account is disabled');
  if (!verifyPassword(password, user.passwordHash)) throw new Error('Invalid username or password');

  // Update last login
  db.prepare("UPDATE users SET lastLoginAt = datetime('now') WHERE id = ?").run(user.id);

  // Clean up expired sessions
  db.prepare("DELETE FROM sessions WHERE expiresAt < datetime('now')").run();

  // Create new session (24 hours)
  const sessionId = generateId('sess');
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  db.prepare(
    'INSERT INTO sessions (id, userId, token, expiresAt) VALUES (?, ?, ?, ?)'
  ).run(sessionId, user.id, token, expiresAt);

  return {
    user: { id: user.id, username: user.username, role: user.role, permissions: user.permissions, nameAr: user.nameAr, nameEn: user.nameEn, active: user.active, createdAt: user.createdAt, lastLoginAt: new Date().toISOString() },
    token,
    expiresAt
  };
}

export function validateSession(db: Database.Database, token: string): SessionRecord | undefined {
  return db.prepare(`
    SELECT s.id, s.userId, s.token, s.expiresAt, u.username, u.role, u.permissions, u.nameAr, u.nameEn
    FROM sessions s JOIN users u ON s.userId = u.id
    WHERE s.token = ? AND s.expiresAt > datetime('now') AND u.active = 1
  `).get(token) as any;
}

export function deleteSession(db: Database.Database, token: string): void {
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

export function deleteAllUserSessions(db: Database.Database, userId: string): void {
  db.prepare('DELETE FROM sessions WHERE userId = ?').run(userId);
}

