import Database from 'better-sqlite3';
import { generateId } from './utils';

// ═══════════════════════════════════════
// TREASURIES
// ═══════════════════════════════════════

export function getAllTreasuries(db: Database.Database) {
  return db.prepare('SELECT * FROM treasuries').all() as any[];
}

export function getTreasuryById(db: Database.Database, id: string) {
  return db.prepare('SELECT * FROM treasuries WHERE id = ?').get(id) as any || null;
}

export function createTreasury(db: Database.Database, data: { nameAr: string; nameEn: string; balance?: number }) {
  const id = generateId('cb');
  db.prepare('INSERT INTO treasuries (id, nameAr, nameEn, balance) VALUES (?, ?, ?, ?)').run(id, data.nameAr, data.nameEn, data.balance || 0);
  return getTreasuryById(db, id);
}

export function updateTreasury(db: Database.Database, id: string, data: { nameAr?: string; nameEn?: string; balance?: number }) {
  const existing = getTreasuryById(db, id);
  if (!existing) throw new Error('Treasury not found');

  if (data.nameAr !== undefined) db.prepare('UPDATE treasuries SET nameAr = ? WHERE id = ?').run(data.nameAr, id);
  if (data.nameEn !== undefined) db.prepare('UPDATE treasuries SET nameEn = ? WHERE id = ?').run(data.nameEn, id);
  if (data.balance !== undefined) db.prepare('UPDATE treasuries SET balance = ? WHERE id = ?').run(data.balance, id);

  return getTreasuryById(db, id);
}

export function adjustTreasuryBalance(db: Database.Database, id: string, delta: number) {
  db.prepare('UPDATE treasuries SET balance = balance + ? WHERE id = ?').run(delta, id);
}

export function deleteTreasury(db: Database.Database, id: string) {
  const existing = getTreasuryById(db, id);
  if (!existing) throw new Error('Treasury not found');
  db.prepare('DELETE FROM treasuries WHERE id = ?').run(id);
}

// ═══════════════════════════════════════
// BANK ACCOUNTS
// ═══════════════════════════════════════

export function getAllBankAccounts(db: Database.Database) {
  return db.prepare('SELECT * FROM bank_accounts').all() as any[];
}

export function getBankAccountById(db: Database.Database, id: string) {
  return db.prepare('SELECT * FROM bank_accounts WHERE id = ?').get(id) as any || null;
}

export function createBankAccount(db: Database.Database, data: { accountNumber: string; bankNameAr: string; bankNameEn: string; balance?: number }) {
  const id = generateId('ba');
  db.prepare('INSERT INTO bank_accounts (id, accountNumber, bankNameAr, bankNameEn, balance) VALUES (?, ?, ?, ?, ?)').run(id, data.accountNumber, data.bankNameAr, data.bankNameEn, data.balance || 0);
  return getBankAccountById(db, id);
}

export function updateBankAccount(db: Database.Database, id: string, data: { bankNameAr?: string; bankNameEn?: string; balance?: number }) {
  const existing = getBankAccountById(db, id);
  if (!existing) throw new Error('Bank account not found');

  if (data.bankNameAr !== undefined) db.prepare('UPDATE bank_accounts SET bankNameAr = ? WHERE id = ?').run(data.bankNameAr, id);
  if (data.bankNameEn !== undefined) db.prepare('UPDATE bank_accounts SET bankNameEn = ? WHERE id = ?').run(data.bankNameEn, id);
  if (data.balance !== undefined) db.prepare('UPDATE bank_accounts SET balance = ? WHERE id = ?').run(data.balance, id);

  return getBankAccountById(db, id);
}

export function deleteBankAccount(db: Database.Database, id: string) {
  const existing = getBankAccountById(db, id);
  if (!existing) throw new Error('Bank account not found');
  db.prepare('DELETE FROM bank_accounts WHERE id = ?').run(id);
}

// ═══════════════════════════════════════
// CHEQUES
// ═══════════════════════════════════════

export function getAllCheques(db: Database.Database) {
  return db.prepare('SELECT * FROM cheques ORDER BY dueDate DESC').all() as any[];
}

export function getChequeById(db: Database.Database, id: string) {
  return db.prepare('SELECT * FROM cheques WHERE id = ?').get(id) as any || null;
}

export function createCheque(db: Database.Database, data: {
  chequeNumber: string; bankName: string; amount: number; type: string;
  dueDate: string; status: string; partyName: string;
}) {
  const id = generateId('chq');
  db.prepare(
    'INSERT INTO cheques (id, chequeNumber, bankName, amount, type, dueDate, status, partyName) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, data.chequeNumber, data.bankName, data.amount, data.type, data.dueDate, data.status, data.partyName);
  return getChequeById(db, id);
}

export function updateChequeStatus(db: Database.Database, id: string, status: string) {
  const existing = getChequeById(db, id);
  if (!existing) throw new Error('Cheque not found');
  db.prepare('UPDATE cheques SET status = ? WHERE id = ?').run(status, id);
  return getChequeById(db, id);
}

export function deleteCheque(db: Database.Database, id: string) {
  const existing = getChequeById(db, id);
  if (!existing) throw new Error('Cheque not found');
  db.prepare('DELETE FROM cheques WHERE id = ?').run(id);
}

export function getBouncedChequesCount(db: Database.Database): number {
  const r = db.prepare("SELECT COUNT(*) as cnt FROM cheques WHERE status = 'BOUNCED'").get() as any;
  return r.cnt;
}

// ═══════════════════════════════════════
// MONEY TRANSACTIONS
// ═══════════════════════════════════════

export function getAllMoneyTransactions(db: Database.Database) {
  return db.prepare('SELECT * FROM money_transactions ORDER BY date DESC').all() as any[];
}

export function getMoneyTransactionById(db: Database.Database, id: string) {
  return db.prepare('SELECT * FROM money_transactions WHERE id = ?').get(id) as any || null;
}

export function createMoneyTransaction(db: Database.Database, data: {
  number: string; date: string; type: string; amount: number;
  sourceType: string; sourceId: string; destType: string; destId: string;
  description: string;
}) {
  const id = generateId('mtx');
  db.prepare(
    'INSERT INTO money_transactions (id, number, date, type, amount, sourceType, sourceId, destType, destId, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, data.number, data.date, data.type, data.amount, data.sourceType, data.sourceId, data.destType, data.destId, data.description);
  return getMoneyTransactionById(db, id);
}

export function deleteMoneyTransaction(db: Database.Database, id: string) {
  const existing = getMoneyTransactionById(db, id);
  if (!existing) throw new Error('Transaction not found');
  db.prepare('DELETE FROM money_transactions WHERE id = ?').run(id);
}
