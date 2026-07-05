import Database from 'better-sqlite3';
import { generateId } from './utils';

export function getAllBudgets(db: Database.Database) {
  return db.prepare('SELECT * FROM budgets ORDER BY year DESC, month DESC').all() as any[];
}

export function getBudgetById(db: Database.Database, id: string) {
  return db.prepare('SELECT * FROM budgets WHERE id = ?').get(id) as any || null;
}

export function createBudget(db: Database.Database, data: {
  year: number; month: number; branchAr: string; branchEn: string;
  departmentAr: string; departmentEn: string;
  budgetedRevenue: number; budgetedFoodCost: number;
  budgetedLaborCost: number; budgetedExpenses: number;
}) {
  const id = generateId('bud');
  db.prepare(`
    INSERT INTO budgets (id, year, month, branchAr, branchEn, departmentAr, departmentEn, budgetedRevenue, budgetedFoodCost, budgetedLaborCost, budgetedExpenses)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.year, data.month, data.branchAr, data.branchEn, data.departmentAr, data.departmentEn, data.budgetedRevenue, data.budgetedFoodCost, data.budgetedLaborCost, data.budgetedExpenses);
  return getBudgetById(db, id);
}

export function updateBudget(db: Database.Database, id: string, data: Partial<{
  budgetedRevenue: number; budgetedFoodCost: number;
  budgetedLaborCost: number; budgetedExpenses: number;
}>) {
  const existing = getBudgetById(db, id);
  if (!existing) throw new Error('Budget not found');

  const fields: string[] = [];
  const values: any[] = [];
  if (data.budgetedRevenue !== undefined) { fields.push('budgetedRevenue = ?'); values.push(data.budgetedRevenue); }
  if (data.budgetedFoodCost !== undefined) { fields.push('budgetedFoodCost = ?'); values.push(data.budgetedFoodCost); }
  if (data.budgetedLaborCost !== undefined) { fields.push('budgetedLaborCost = ?'); values.push(data.budgetedLaborCost); }
  if (data.budgetedExpenses !== undefined) { fields.push('budgetedExpenses = ?'); values.push(data.budgetedExpenses); }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE budgets SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
  return getBudgetById(db, id);
}

export function deleteBudget(db: Database.Database, id: string) {
  const existing = getBudgetById(db, id);
  if (!existing) throw new Error('Budget not found');
  db.prepare('DELETE FROM budgets WHERE id = ?').run(id);
}

// ═══════════ BACKUP SCHEDULE ═══════════

export function getBackupSchedule(db: Database.Database) {
  const row = db.prepare('SELECT * FROM backup_schedule WHERE id = 1').get() as any;
  return row ? {
    frequency: row.frequency,
    time: row.time,
    target: row.target,
    enabled: !!row.enabled
  } : { frequency: 'DAILY', time: '23:00', target: 'LOCAL', enabled: true };
}

export function updateBackupSchedule(db: Database.Database, data: { frequency?: string; time?: string; target?: string; enabled?: boolean }) {
  const existing = db.prepare('SELECT * FROM backup_schedule WHERE id = 1').get();
  if (!existing) {
    db.prepare('INSERT INTO backup_schedule (id, frequency, time, target, enabled) VALUES (1, ?, ?, ?, ?)').run(
      data.frequency || 'DAILY', data.time || '23:00', data.target || 'LOCAL', data.enabled !== false ? 1 : 0
    );
  } else {
    if (data.frequency !== undefined) db.prepare('UPDATE backup_schedule SET frequency = ? WHERE id = 1').run(data.frequency);
    if (data.time !== undefined) db.prepare('UPDATE backup_schedule SET time = ? WHERE id = 1').run(data.time);
    if (data.target !== undefined) db.prepare('UPDATE backup_schedule SET target = ? WHERE id = 1').run(data.target);
    if (data.enabled !== undefined) db.prepare('UPDATE backup_schedule SET enabled = ? WHERE id = 1').run(data.enabled ? 1 : 0);
  }
  return getBackupSchedule(db);
}
