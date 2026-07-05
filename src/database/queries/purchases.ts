import Database from 'better-sqlite3';
import { generateId } from './utils';

function mapPurchase(r: any) {
  return { ...r, items: JSON.parse(r.itemsJson || '[]'), itemsJson: undefined };
}

export function getAllPurchases(db: Database.Database) {
  return (db.prepare('SELECT * FROM purchases ORDER BY date DESC').all() as any[]).map(mapPurchase);
}

export function getPurchaseById(db: Database.Database, id: string) {
  const r = db.prepare('SELECT * FROM purchases WHERE id = ?').get(id) as any;
  if (!r) return null;
  return mapPurchase(r);
}

export function createPurchase(db: Database.Database, data: {
  number: string;
  date: string;
  supplierId: string;
  status: string;
  items: { itemId: string; quantity: number; unitPrice: number; total: number }[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  type: string;
}) {
  const id = generateId('pur');
  db.prepare(`
    INSERT INTO purchases (id, number, date, supplierId, status, subtotal, taxAmount, totalAmount, type, itemsJson)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.number, data.date, data.supplierId, data.status, data.subtotal, data.taxAmount, data.totalAmount, data.type, JSON.stringify(data.items));

  return getPurchaseById(db, id);
}

export function updatePurchaseStatus(db: Database.Database, id: string, status: string) {
  const existing = db.prepare('SELECT * FROM purchases WHERE id = ?').get(id) as any;
  if (!existing) throw new Error('Purchase not found');
  db.prepare('UPDATE purchases SET status = ? WHERE id = ?').run(status, id);
  return getPurchaseById(db, id);
}

export function deletePurchase(db: Database.Database, id: string) {
  const existing = db.prepare('SELECT * FROM purchases WHERE id = ?').get(id) as any;
  if (!existing) throw new Error('Purchase not found');
  db.prepare('DELETE FROM purchases WHERE id = ?').run(id);
}

export function getPurchasesCount(db: Database.Database): number {
  const r = db.prepare('SELECT COUNT(*) as cnt FROM purchases').get() as any;
  return r.cnt;
}

export function getPendingPRsCount(db: Database.Database): number {
  const r = db.prepare("SELECT COUNT(*) as cnt FROM purchases WHERE type = 'REQUEST' AND status = 'REQUESTED'").get() as any;
  return r.cnt;
}
