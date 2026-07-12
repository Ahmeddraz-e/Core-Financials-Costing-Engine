import Database from 'better-sqlite3';
import { generateId } from './utils';

export function getAllAccounts(db: Database.Database) {
  return (db.prepare('SELECT * FROM accounts ORDER BY code').all() as any[]).map(r => ({
    ...r, isSystem: !!r.isSystem, parentCode: r.parentCode || null
  }));
}

export function getAccountById(db: Database.Database, id: string) {
  const r = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as any;
  if (!r) return null;
  return { ...r, isSystem: !!r.isSystem, parentCode: r.parentCode || null };
}

export function getAccountByCode(db: Database.Database, code: string) {
  const r = db.prepare('SELECT * FROM accounts WHERE code = ?').get(code) as any;
  if (!r) return null;
  return { ...r, isSystem: !!r.isSystem, parentCode: r.parentCode || null };
}

export function createAccount(db: Database.Database, data: { code: string; nameAr: string; nameEn: string; type: string; parentCode?: string | null }) {
  const existing = db.prepare('SELECT id FROM accounts WHERE code = ?').get(data.code);
  if (existing) throw new Error('Account code already exists');

  const id = generateId('acc');
  db.prepare(
    'INSERT INTO accounts (id, code, nameAr, nameEn, type, parentCode, balance, isSystem) VALUES (?, ?, ?, ?, ?, ?, 0, 0)'
  ).run(id, data.code, data.nameAr, data.nameEn, data.type, data.parentCode || null);

  return getAccountById(db, id);
}

export function updateAccount(db: Database.Database, id: string, data: { nameAr?: string; nameEn?: string; type?: string; parentCode?: string | null; balance?: number }) {
  const existing = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as any;
  if (!existing) throw new Error('Account not found');

  db.prepare(`
    UPDATE accounts SET
      nameAr = COALESCE(?, nameAr),
      nameEn = COALESCE(?, nameEn),
      type = COALESCE(?, type),
      parentCode = COALESCE(?, parentCode),
      balance = COALESCE(?, balance)
    WHERE id = ?
  `).run(data.nameAr ?? null, data.nameEn ?? null, data.type ?? null, data.parentCode ?? existing.parentCode, data.balance ?? null, id);

  return getAccountById(db, id);
}

export function updateAccountBalance(db: Database.Database, id: string, delta: number) {
  db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(delta, id);
}

export function deleteAccount(db: Database.Database, id: string) {
  const account = db.prepare('SELECT * FROM accounts WHERE id = ?').get(id) as any;
  if (!account) throw new Error('Account not found');

  const linked = db.prepare('SELECT COUNT(*) as cnt FROM journal_lines WHERE accountId = ?').get(id) as any;
  if (linked.cnt > 0) throw new Error('Cannot delete account with journal entries');

  db.prepare('DELETE FROM accounts WHERE id = ?').run(id);
}

export function getAccountBalancesByType(db: Database.Database) {
  return db.prepare('SELECT type, SUM(balance) as total FROM accounts GROUP BY type').all() as any[];
}
