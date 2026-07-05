import Database from 'better-sqlite3';
import { generateId } from './utils';

export function getAllAssets(db: Database.Database) {
  return db.prepare('SELECT * FROM fixed_assets ORDER BY code').all() as any[];
}

export function getAssetById(db: Database.Database, id: string) {
  return db.prepare('SELECT * FROM fixed_assets WHERE id = ?').get(id) as any || null;
}

export function createAsset(db: Database.Database, data: {
  code: string; nameAr: string; nameEn: string; purchaseDate: string;
  purchaseValue: number; salvageValue: number; usefulLifeYears: number;
}) {
  const id = generateId('fa');
  const currentBookValue = data.purchaseValue;
  db.prepare(`
    INSERT INTO fixed_assets (id, code, nameAr, nameEn, purchaseDate, purchaseValue, salvageValue, usefulLifeYears, accumulatedDepreciation, currentBookValue)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(id, data.code, data.nameAr, data.nameEn, data.purchaseDate, data.purchaseValue, data.salvageValue, data.usefulLifeYears, currentBookValue);
  return getAssetById(db, id);
}

export function updateAsset(db: Database.Database, id: string, data: Partial<{
  nameAr: string; nameEn: string; accumulatedDepreciation: number; currentBookValue: number;
}>) {
  const existing = getAssetById(db, id);
  if (!existing) throw new Error('Asset not found');

  if (data.nameAr !== undefined) db.prepare('UPDATE fixed_assets SET nameAr = ? WHERE id = ?').run(data.nameAr, id);
  if (data.nameEn !== undefined) db.prepare('UPDATE fixed_assets SET nameEn = ? WHERE id = ?').run(data.nameEn, id);
  if (data.accumulatedDepreciation !== undefined) db.prepare('UPDATE fixed_assets SET accumulatedDepreciation = ? WHERE id = ?').run(data.accumulatedDepreciation, id);
  if (data.currentBookValue !== undefined) db.prepare('UPDATE fixed_assets SET currentBookValue = ? WHERE id = ?').run(data.currentBookValue, id);

  return getAssetById(db, id);
}

export function deleteAsset(db: Database.Database, id: string) {
  const existing = getAssetById(db, id);
  if (!existing) throw new Error('Asset not found');
  db.prepare('DELETE FROM fixed_assets WHERE id = ?').run(id);
}
