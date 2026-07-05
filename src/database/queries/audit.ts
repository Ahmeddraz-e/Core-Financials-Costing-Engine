import Database from 'better-sqlite3';
import { generateId } from './utils';

export function getAllLogs(db: Database.Database) {
  return db.prepare('SELECT * FROM audit_logs ORDER BY rowid DESC').all() as any[];
}

export function createLog(db: Database.Database, data: {
  user: string;
  actionAr: string;
  actionEn: string;
  details: string;
  ipAddress?: string;
}) {
  const id = generateId('log');
  const timestamp = new Date().toISOString();
  db.prepare(
    'INSERT INTO audit_logs (id, timestamp, user, actionAr, actionEn, details, ipAddress) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, timestamp, data.user, data.actionAr, data.actionEn, data.details, data.ipAddress || '127.0.0.1');
}

export function clearLogs(db: Database.Database) {
  db.prepare('DELETE FROM audit_logs').run();
}
