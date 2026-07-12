import Database from 'better-sqlite3';
import { generateId } from './utils';

function mapItem(r: any) {
  return { ...r, yieldPercent: r.yieldPercent ?? undefined };
}

export function getAllItems(db: Database.Database) {
  return (db.prepare('SELECT * FROM inventory ORDER BY code').all() as any[]).map(mapItem);
}

export function getItemById(db: Database.Database, id: string) {
  const r = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id) as any;
  if (!r) return null;
  return mapItem(r);
}

export function createItem(db: Database.Database, data: {
  code: string; nameAr: string; nameEn: string; category: string;
  unitAr: string; unitEn: string; cost: number; quantity: number;
  reorderPoint: number; yieldPercent?: number;
}) {
  const existing = db.prepare('SELECT id FROM inventory WHERE code = ?').get(data.code);
  if (existing) throw new Error('Item code already exists');

  const id = generateId('inv');
  db.prepare(`
    INSERT INTO inventory (id, code, nameAr, nameEn, category, unitAr, unitEn, cost, quantity, reorderPoint, yieldPercent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.code, data.nameAr, data.nameEn, data.category, data.unitAr, data.unitEn, data.cost, data.quantity, data.reorderPoint, data.yieldPercent ?? null);

  return getItemById(db, id);
}

export function updateItem(db: Database.Database, id: string, data: Partial<{
  nameAr: string; nameEn: string; category: string; unitAr: string; unitEn: string;
  cost: number; quantity: number; reorderPoint: number; yieldPercent: number | null;
}>) {
  const existing = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id) as any;
  if (!existing) throw new Error('Item not found');

  const fields: string[] = [];
  const values: any[] = [];

  if (data.nameAr !== undefined) { fields.push('nameAr = ?'); values.push(data.nameAr); }
  if (data.nameEn !== undefined) { fields.push('nameEn = ?'); values.push(data.nameEn); }
  if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
  if (data.unitAr !== undefined) { fields.push('unitAr = ?'); values.push(data.unitAr); }
  if (data.unitEn !== undefined) { fields.push('unitEn = ?'); values.push(data.unitEn); }
  if (data.cost !== undefined) { fields.push('cost = ?'); values.push(data.cost); }
  if (data.quantity !== undefined) { fields.push('quantity = ?'); values.push(data.quantity); }
  if (data.reorderPoint !== undefined) { fields.push('reorderPoint = ?'); values.push(data.reorderPoint); }
  if (data.yieldPercent !== undefined) { fields.push('yieldPercent = ?'); values.push(data.yieldPercent); }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE inventory SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  return getItemById(db, id);
}

export function adjustQuantity(db: Database.Database, id: string, delta: number) {
  db.prepare('UPDATE inventory SET quantity = quantity + ? WHERE id = ?').run(delta, id);
  return getItemById(db, id);
}

export function deleteItem(db: Database.Database, id: string) {
  const existing = db.prepare('SELECT * FROM inventory WHERE id = ?').get(id) as any;
  if (!existing) throw new Error('Item not found');

  // Check if used in recipes
  const inRecipe = db.prepare('SELECT COUNT(*) as cnt FROM recipe_components WHERE componentItemId = ?').get(id) as any;
  if (inRecipe.cnt > 0) throw new Error('Cannot delete item used in recipes');

  db.prepare('DELETE FROM inventory WHERE id = ?').run(id);
}

export function getInventorySummary(db: Database.Database) {
  return db.prepare(`
    SELECT category, SUM(cost * quantity) as totalValue, SUM(quantity) as totalQty
    FROM inventory GROUP BY category
  `).all() as any[];
}

export function getLowStockCount(db: Database.Database): number {
  const r = db.prepare("SELECT COUNT(*) as cnt FROM inventory WHERE quantity <= reorderPoint AND category !== 'FINISHED_PRODUCT'").get() as any;
  return r.cnt;
}

export function getLowStockItems(db: Database.Database) {
  return (db.prepare("SELECT * FROM inventory WHERE quantity <= reorderPoint AND category !== 'FINISHED_PRODUCT' ORDER BY quantity ASC").all() as any[]).map(mapItem);
}
