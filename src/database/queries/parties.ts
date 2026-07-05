import Database from 'better-sqlite3';
import { generateId } from './utils';

// ═══════════ SUPPLIERS ═══════════

export function getAllSuppliers(db: Database.Database) {
  return db.prepare('SELECT * FROM suppliers ORDER BY code').all() as any[];
}

export function getSupplierById(db: Database.Database, id: string) {
  return db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id) as any || null;
}

export function createSupplier(db: Database.Database, data: { code: string; nameAr: string; nameEn: string; phone: string }) {
  const id = generateId('sup');
  db.prepare('INSERT INTO suppliers (id, code, nameAr, nameEn, phone, balance) VALUES (?, ?, ?, ?, ?, 0)').run(id, data.code, data.nameAr, data.nameEn, data.phone);
  return getSupplierById(db, id);
}

export function updateSupplier(db: Database.Database, id: string, data: Partial<{ nameAr: string; nameEn: string; phone: string; balance: number }>) {
  const existing = getSupplierById(db, id);
  if (!existing) throw new Error('Supplier not found');

  if (data.nameAr !== undefined) db.prepare('UPDATE suppliers SET nameAr = ? WHERE id = ?').run(data.nameAr, id);
  if (data.nameEn !== undefined) db.prepare('UPDATE suppliers SET nameEn = ? WHERE id = ?').run(data.nameEn, id);
  if (data.phone !== undefined) db.prepare('UPDATE suppliers SET phone = ? WHERE id = ?').run(data.phone, id);
  if (data.balance !== undefined) db.prepare('UPDATE suppliers SET balance = ? WHERE id = ?').run(data.balance, id);

  return getSupplierById(db, id);
}

export function deleteSupplier(db: Database.Database, id: string) {
  const existing = getSupplierById(db, id);
  if (!existing) throw new Error('Supplier not found');

  const linked = db.prepare('SELECT COUNT(*) as cnt FROM purchases WHERE supplierId = ?').get(id) as any;
  if (linked.cnt > 0) throw new Error('Cannot delete supplier with purchase records');

  db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
}

// ═══════════ CUSTOMERS ═══════════

export function getAllCustomers(db: Database.Database) {
  return db.prepare('SELECT * FROM customers ORDER BY code').all() as any[];
}

export function getCustomerById(db: Database.Database, id: string) {
  return db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any || null;
}

export function createCustomer(db: Database.Database, data: { code: string; nameAr: string; nameEn: string; phone: string }) {
  const id = generateId('cust');
  db.prepare('INSERT INTO customers (id, code, nameAr, nameEn, phone, balance) VALUES (?, ?, ?, ?, ?, 0)').run(id, data.code, data.nameAr, data.nameEn, data.phone);
  return getCustomerById(db, id);
}

export function updateCustomer(db: Database.Database, id: string, data: Partial<{ nameAr: string; nameEn: string; phone: string; balance: number }>) {
  const existing = getCustomerById(db, id);
  if (!existing) throw new Error('Customer not found');

  if (data.nameAr !== undefined) db.prepare('UPDATE customers SET nameAr = ? WHERE id = ?').run(data.nameAr, id);
  if (data.nameEn !== undefined) db.prepare('UPDATE customers SET nameEn = ? WHERE id = ?').run(data.nameEn, id);
  if (data.phone !== undefined) db.prepare('UPDATE customers SET phone = ? WHERE id = ?').run(data.phone, id);
  if (data.balance !== undefined) db.prepare('UPDATE customers SET balance = ? WHERE id = ?').run(data.balance, id);

  return getCustomerById(db, id);
}

export function deleteCustomer(db: Database.Database, id: string) {
  const existing = getCustomerById(db, id);
  if (!existing) throw new Error('Customer not found');
  db.prepare('DELETE FROM customers WHERE id = ?').run(id);
}
