import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { SCHEMA_SQL } from './schema';
import { seedDatabase } from './seed';
import { ERPData } from '../types';

export function initDatabase(dbPath: string): Database.Database {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);
  
  // Migration safety: ensure permissions column exists in users table
  try {
    db.prepare('ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT NULL').run();
  } catch (err) {
    // Column already exists or table doesn't exist yet, ignore
  }

  // Migration safety: ensure itemsJson column exists in journal_lines table
  try {
    db.prepare('ALTER TABLE journal_lines ADD COLUMN itemsJson TEXT').run();
  } catch (err) {
    // Column already exists or table doesn't exist yet, ignore
  }

  // Migration safety: ensure branch, responsible, accountId columns exist in treasuries
  try {
    db.prepare('ALTER TABLE treasuries ADD COLUMN branch TEXT').run();
  } catch (err) {}
  try {
    db.prepare('ALTER TABLE treasuries ADD COLUMN responsible TEXT').run();
  } catch (err) {}
  try {
    db.prepare('ALTER TABLE treasuries ADD COLUMN accountId TEXT').run();
  } catch (err) {}

  // Migration safety: ensure branch, responsible, accountId columns exist in bank_accounts
  try {
    db.prepare('ALTER TABLE bank_accounts ADD COLUMN branch TEXT').run();
  } catch (err) {}
  try {
    db.prepare('ALTER TABLE bank_accounts ADD COLUMN responsible TEXT').run();
  } catch (err) {}
  try {
    db.prepare('ALTER TABLE bank_accounts ADD COLUMN accountId TEXT').run();
  } catch (err) {}

  // Migration safety: ensure chequeImage column exists in vouchers
  try {
    db.prepare('ALTER TABLE vouchers ADD COLUMN chequeImage TEXT DEFAULT \'\'').run();
  } catch (err) {}

  // Migration safety: ensure new employee fields exist
  try { db.prepare('ALTER TABLE employees ADD COLUMN nationalId TEXT DEFAULT \'\'').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE employees ADD COLUMN department TEXT DEFAULT \'\'').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE employees ADD COLUMN email TEXT DEFAULT \'\'').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE employees ADD COLUMN phone TEXT DEFAULT \'\'').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE employees ADD COLUMN hireDate TEXT DEFAULT \'\'').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE employees ADD COLUMN contractType TEXT DEFAULT \'\'').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE employees ADD COLUMN manager TEXT DEFAULT \'\'').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE employees ADD COLUMN status TEXT DEFAULT \'ACTIVE\'').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE employees ADD COLUMN timelineJson TEXT DEFAULT \'[]\'').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE employees ADD COLUMN contractStartDate TEXT DEFAULT \'\'').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE employees ADD COLUMN contractEndDate TEXT DEFAULT \'\'').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE employees ADD COLUMN workingHours REAL DEFAULT 0').run(); } catch (e) {}

  // Migration safety: ensure version and isActive exist in recipes table
  try { db.prepare('ALTER TABLE recipes ADD COLUMN version INTEGER NOT NULL DEFAULT 1').run(); } catch (e) {}
  try { db.prepare('ALTER TABLE recipes ADD COLUMN isActive INTEGER NOT NULL DEFAULT 1').run(); } catch (e) {}

  // Migration safety: ensure customPath exists in backup_schedule table
  try { db.prepare('ALTER TABLE backup_schedule ADD COLUMN customPath TEXT DEFAULT \'\'').run(); } catch (e) {}

  // Migration safety: ensure Sales Discount account exists
  try {
    const exists = db.prepare("SELECT 1 FROM accounts WHERE code = '4108001'").get();
    if (!exists) {
      db.prepare(
        "INSERT INTO accounts (id, code, nameAr, nameEn, type, balance, isSystem) VALUES ('406', '4108001', 'خصم المبيعات والمسموحات', 'Sales Discounts & Allowances', 'REVENUE', 0, 1)"
      ).run();
    }
  } catch (err) {}

  seedDatabase(db);
  return db;
}


/**
 * Sync helper to perform incremental INSERT, UPDATE, and DELETE operations.
 * Compares incoming list with current database rows, doing changes only where needed.
 */
function syncTable<T>(
  db: Database.Database,
  tableName: string,
  incomingList: T[],
  idField: keyof T,
  fieldsToUpdate: (keyof T)[]
): void {
  // 1. Get all current records in the database
  const currentRecords = db.prepare(`SELECT * FROM ${tableName}`).all() as any[];
  const currentMap = new Map(currentRecords.map(r => [r[idField], r]));
  const incomingMap = new Map(incomingList.map(r => [r[idField], r]));

  const toInsert: T[] = [];
  const toUpdate: T[] = [];
  const toDelete: any[] = [];

  // Identify inserts and updates
  for (const incoming of incomingList) {
    const id = incoming[idField];
    const current = currentMap.get(id);
    if (!current) {
      toInsert.push(incoming);
    } else {
      let hasChanged = false;
      for (const field of fieldsToUpdate) {
        let incomingVal = incoming[field] as any;
        let currentVal = current[field] as any;

        if (typeof incomingVal === 'boolean') incomingVal = incomingVal ? 1 : 0;
        if (typeof currentVal === 'boolean') currentVal = currentVal ? 1 : 0;
        if (incomingVal === undefined) incomingVal = null;
        if (currentVal === undefined) currentVal = null;

        if (incomingVal !== currentVal) {
          hasChanged = true;
          break;
        }
      }
      if (hasChanged) {
        toUpdate.push(incoming);
      }
    }
  }

  // Identify deletes
  for (const current of currentRecords) {
    const id = current[idField];
    if (!incomingMap.has(id)) {
      toDelete.push(id);
    }
  }

  const mapRecordValues = (record: T) => {
    return fieldsToUpdate.map(f => {
      const val = record[f];
      
      // 1. Explicit NOT NULL Booleans
      if (f === 'isSystem' || f === 'approved') {
        return val ? 1 : 0;
      }
      if (f === 'active' || f === 'enabled') {
        return val === false ? 0 : 1;
      }
      
      // 2. Explicit NOT NULL Numbers
      if (
        f === 'balance' || 
        f === 'quantity' || 
        f === 'cost' || 
        f === 'debit' || 
        f === 'credit' ||
        f === 'subtotal' ||
        f === 'taxAmount' ||
        f === 'totalAmount' ||
        f.toString().endsWith('Amount') ||
        f.toString().endsWith('Cost') ||
        f === 'serviceCharge'
      ) {
        return typeof val === 'number' && !isNaN(val) ? val : 0;
      }

      return typeof val === 'boolean' ? (val ? 1 : 0) : (val ?? null);
    });
  };

  // Execute inserts
  if (toInsert.length > 0) {
    const placeholders = fieldsToUpdate.map(() => '?').join(', ');
    const columns = fieldsToUpdate.join(', ');
    const stmt = db.prepare(`INSERT INTO ${tableName} (id, ${columns}) VALUES (?, ${placeholders})`);
    for (const record of toInsert) {
      const values = mapRecordValues(record);
      stmt.run(record[idField], ...values);
    }
  }

  // Execute updates
  if (toUpdate.length > 0) {
    const sets = fieldsToUpdate.map(f => `${String(f)} = ?`).join(', ');
    const stmt = db.prepare(`UPDATE ${tableName} SET ${sets} WHERE id = ?`);
    for (const record of toUpdate) {
      const values = mapRecordValues(record);
      stmt.run(...values, record[idField]);
    }
  }

  // Execute deletes
  if (toDelete.length > 0) {
    const stmt = db.prepare(`DELETE FROM ${tableName} WHERE id = ?`);
    for (const id of toDelete) {
      stmt.run(id);
    }
  }
}

/**
 * Direct sync handler for journal entries and child journal lines.
 */
function syncJournalEntries(db: Database.Database, incomingEntries: any[]): void {
  // Query all existing entries to find deletes
  const currentEntries = db.prepare('SELECT id FROM journal_entries').all() as any[];
  const incomingMap = new Map(incomingEntries.map(e => [e.id, e]));

  // 1. Delete removed entries (CASCADE will handle lines)
  const deleteStmt = db.prepare('DELETE FROM journal_entries WHERE id = ?');
  for (const curr of currentEntries) {
    if (!incomingMap.has(curr.id)) {
      deleteStmt.run(curr.id);
    }
  }

  // 2. Insert or update existing entries
  const insertJE = db.prepare('INSERT OR REPLACE INTO journal_entries (id, entryNumber, date, type, description, approved, approvedBy) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const deleteLines = db.prepare('DELETE FROM journal_lines WHERE entryId = ?');
  const insertJL = db.prepare('INSERT INTO journal_lines (id, entryId, accountId, debit, credit, itemsJson) VALUES (?, ?, ?, ?, ?, ?)');

  for (const je of incomingEntries) {
    // Write entry header
    insertJE.run(je.id, je.entryNumber, je.date, je.type, je.description, je.approved ? 1 : 0, je.approvedBy || null);

    // Re-insert child lines
    deleteLines.run(je.id);
    if (je.lines && Array.isArray(je.lines)) {
      je.lines.forEach((l: any, idx: number) => {
        insertJL.run(
          `${je.id}-line-${idx}`,
          je.id,
          l.accountId,
          l.debit,
          l.credit,
          l.items && l.items.length > 0 ? JSON.stringify(l.items) : null
        );
      });
    }
  }
}

/**
 * Direct sync handler for recipes and child components.
 */
function syncRecipes(db: Database.Database, incomingRecipes: any[]): void {
  const currentRecipes = db.prepare('SELECT id FROM recipes').all() as any[];
  const incomingMap = new Map(incomingRecipes.map(r => [r.id, r]));

  // 1. Delete removed recipes (CASCADE will handle components)
  const deleteStmt = db.prepare('DELETE FROM recipes WHERE id = ?');
  for (const curr of currentRecipes) {
    if (!incomingMap.has(curr.id)) {
      deleteStmt.run(curr.id);
    }
  }

  // 2. Insert or update existing recipes
  const insertRecipe = db.prepare('INSERT OR REPLACE INTO recipes (id, itemId, version, isActive, yieldAmount, laborCost, packagingCost, otherOperatingCost, calculatedCost, sellingPrice, marginPercent, foodCostPercent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const deleteComponents = db.prepare('DELETE FROM recipe_components WHERE recipeId = ?');
  const insertRC = db.prepare('INSERT INTO recipe_components (id, recipeId, componentItemId, quantity, lossPercent) VALUES (?, ?, ?, ?, ?)');

  for (const r of incomingRecipes) {
    // Write recipe header
    insertRecipe.run(r.id, r.itemId, r.version || 1, r.isActive !== false ? 1 : 0, r.yieldAmount, r.laborCost, r.packagingCost, r.otherOperatingCost, r.calculatedCost, r.sellingPrice, r.marginPercent, r.foodCostPercent);

    // Re-insert child components
    deleteComponents.run(r.id);
    if (r.components && Array.isArray(r.components)) {
      r.components.forEach((c: any, idx: number) => {
        insertRC.run(`${r.id}-comp-${idx}`, r.id, c.componentItemId, c.quantity, c.lossPercent);
      });
    }
  }
}

/**
 * Smart Incremental Diff Sync Function.
 * Replaces the deprecated full-overwrite function with transactional diff updating.
 */
export function saveERPDataDiff(db: Database.Database, data: ERPData): void {
  const tx = db.transaction(() => {
    // 1. Sync accounts
    syncTable(db, 'accounts', data.accounts, 'id', [
      'code', 'nameAr', 'nameEn', 'type', 'parentCode', 'balance', 'isSystem'
    ]);

    // 2. Sync journal entries (complex nesting)
    syncJournalEntries(db, data.journalEntries);

    // 3. Sync inventory
    syncTable(db, 'inventory', data.inventory, 'id', [
      'code', 'nameAr', 'nameEn', 'category', 'unitAr', 'unitEn', 'cost', 'quantity', 'reorderPoint', 'yieldPercent'
    ]);

    // 4. Sync sales (with items mapped to itemsJson string)
    const salesWithJson = data.sales.map((s: any) => ({
      ...s,
      itemsJson: JSON.stringify(s.items || [])
    }));
    syncTable(db, 'sales', salesWithJson, 'id', [
      'orderNumber', 'date', 'channel', 'cashierName', 'dineInAmount', 'takeawayAmount',
      'deliveryAmount', 'deliveryAppsAmount', 'cashAmount', 'cardAmount', 'serviceCharge',
      'taxAmount', 'totalAmount', 'foodCost', 'description', 'itemsJson'
    ]);

    // 5. Sync purchases (with items mapped to itemsJson string)
    const purchasesWithJson = data.purchases.map((p: any) => ({
      ...p,
      itemsJson: JSON.stringify(p.items || [])
    }));
    syncTable(db, 'purchases', purchasesWithJson, 'id', [
      'number', 'date', 'supplierId', 'status', 'subtotal', 'taxAmount', 'totalAmount', 'type', 'itemsJson'
    ]);

    // 6. Sync recipes (complex nesting)
    syncRecipes(db, data.recipes);

    // 7. Sync treasuries & bank accounts
    syncTable(db, 'treasuries', data.treasuries, 'id', ['nameAr', 'nameEn', 'balance', 'branch', 'responsible', 'accountId']);
    syncTable(db, 'bank_accounts', data.bankAccounts, 'id', ['accountNumber', 'bankNameAr', 'bankNameEn', 'balance', 'branch', 'responsible', 'accountId']);

    // 7.5 Sync checkbooks — filter out ones linked to deleted banks
    const bankIds = new Set(data.bankAccounts.map(b => b.id));
    const checkbooksWithJson = (data.checkbooks || [])
      .filter(c => bankIds.has(c.bankAccountId))
      .map((c: any) => ({
      ...c,
      checksJson: JSON.stringify(c.checks || [])
    }));
    syncTable(db, 'checkbooks', checkbooksWithJson, 'id', [
      'bankAccountId', 'code', 'startNumber', 'endNumber', 'checksJson'
    ]);

    // 8. Sync money transactions & cheques
    syncTable(db, 'money_transactions', data.moneyTransactions, 'id', [
      'number', 'date', 'type', 'amount', 'sourceType', 'sourceId', 'destType', 'destId', 'description'
    ]);
    syncTable(db, 'cheques', data.cheques, 'id', [
      'chequeNumber', 'bankName', 'amount', 'type', 'dueDate', 'status', 'partyName'
    ]);

    // 9. Sync fixed assets & employees
    syncTable(db, 'fixed_assets', data.fixedAssets, 'id', [
      'code', 'nameAr', 'nameEn', 'purchaseDate', 'purchaseValue', 'salvageValue', 'usefulLifeYears', 'accumulatedDepreciation', 'currentBookValue'
    ]);
    syncTable(db, 'employees', data.employees, 'id', [
      'code', 'nameAr', 'nameEn', 'role', 'salary', 'shift', 'loanBalance', 'active', 'allowances', 'deductions', 'overtimeHours', 'workingDays', 'workingHours',
      'nationalId', 'department', 'email', 'phone', 'hireDate', 'contractType', 'manager', 'status', 'timelineJson',
      'contractStartDate', 'contractEndDate'
    ]);

    // 9.5 Sync HR custom JSON collections into app_state
    const hrCollections = [
      { key: 'hr_leaves', val: data.hrLeaves },
      { key: 'hr_candidates', val: data.hrCandidates },
      { key: 'hr_departments', val: data.hrDepartments },
      { key: 'hr_jobs', val: data.hrJobs },
      { key: 'hr_appraisals', val: data.hrAppraisals },
      { key: 'hr_loans', val: data.hrLoans },
      { key: 'hr_documents', val: data.hrDocuments },
      { key: 'hr_trainings', val: data.hrTrainings },
      { key: 'hr_attendance', val: data.hrAttendance },
      { key: 'hr_events', val: data.hrEvents }
    ];
    for (const hc of hrCollections) {
      if (hc.val) {
        db.prepare("INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)")
          .run(hc.key, JSON.stringify(hc.val));
      }
    }

    // 10. Sync budgets, suppliers, customers
    syncTable(db, 'budgets', data.budgets, 'id', [
      'year', 'month', 'branchAr', 'branchEn', 'departmentAr', 'departmentEn', 'budgetedRevenue', 'budgetedFoodCost', 'budgetedLaborCost', 'budgetedExpenses'
    ]);
    syncTable(db, 'suppliers', data.suppliers, 'id', ['code', 'nameAr', 'nameEn', 'phone', 'balance']);
    syncTable(db, 'customers', data.customers, 'id', ['code', 'nameAr', 'nameEn', 'phone', 'balance']);

    // 11. Sync wastage & audit logs
    syncTable(db, 'wastage', data.wastage, 'id', ['itemId', 'quantity', 'date', 'reason', 'cost']);
    syncTable(db, 'audit_logs', data.auditLogs, 'id', ['timestamp', 'user', 'actionAr', 'actionEn', 'details', 'ipAddress']);

    // 12. Sync sales invoices
    const invoicesWithJson = (data.salesInvoices || []).map((inv: any) => ({
      ...inv,
      itemsJson: JSON.stringify(inv.items || [])
    }));
    syncTable(db, 'sales_invoices', invoicesWithJson, 'id', [
      'invoiceNumber', 'date', 'dueDate', 'customerId', 'subtotal', 'discountTotal',
      'taxRate', 'taxAmount', 'totalAmount', 'paidAmount', 'status', 'paymentMethod',
      'notes', 'journalEntryId', 'itemsJson'
    ]);

    // 13. Sync vouchers
    syncTable(db, 'vouchers', data.vouchers || [], 'id', [
      'voucherNumber', 'type', 'date', 'amount', 'partyType', 'partyId', 'partyName',
      'paymentMethod', 'treasuryId', 'bankAccountId', 'description', 'referenceNumber', 'journalEntryId', 'chequeImage'
    ]);

    // 14. Sync sales returns
    const salesReturnsWithJson = (data.salesReturns || []).map((sr: any) => ({
      ...sr,
      itemsJson: JSON.stringify(sr.items || [])
    }));
    syncTable(db, 'sales_returns', salesReturnsWithJson, 'id', [
      'returnNumber', 'date', 'originalInvoiceId', 'customerId', 'subtotal',
      'taxAmount', 'totalAmount', 'reason', 'journalEntryId', 'itemsJson'
    ]);

    // 15. Sync purchase returns
    const purchaseReturnsWithJson = (data.purchaseReturns || []).map((pr: any) => ({
      ...pr,
      itemsJson: JSON.stringify(pr.items || [])
    }));
    syncTable(db, 'purchase_returns', purchaseReturnsWithJson, 'id', [
      'returnNumber', 'date', 'originalPurchaseId', 'supplierId', 'subtotal',
      'taxAmount', 'totalAmount', 'reason', 'journalEntryId', 'itemsJson'
    ]);

    // 16. Sync payroll runs
    const payrollWithJson = (data.payrollRuns || []).map((pr: any) => ({
      ...pr,
      linesJson: JSON.stringify(pr.lines || [])
    }));
    syncTable(db, 'payroll_runs', payrollWithJson, 'id', [
      'runNumber', 'month', 'year', 'date', 'status', 'totalGross',
      'totalDeductions', 'totalNet', 'journalEntryId', 'linesJson'
    ]);

    // 17. Sync accounting periods
    syncTable(db, 'accounting_periods', data.accountingPeriods || [], 'id', [
      'year', 'month', 'status', 'closedAt', 'closedBy', 'closingEntryId'
    ]);

    // 18. Update backup schedule (always row id 1)
    const bs = data.backupSchedule;
    if (bs) {
      db.prepare(`
        INSERT OR REPLACE INTO backup_schedule (id, frequency, time, target, enabled, customPath)
        VALUES (1, ?, ?, ?, ?, ?)
      `).run(bs.frequency, bs.time, bs.target, bs.enabled ? 1 : 0, bs.customPath || '');
      console.log(`[DB] Saved backup schedule: customPath="${bs.customPath}"`);
    }

    // 19. Sync Company Profile
    const cp = (data as any).companyProfile;
    if (cp) {
      db.prepare("INSERT OR REPLACE INTO app_state (key, value) VALUES ('company_profile', ?)")
        .run(JSON.stringify(cp));
    }
  });
  tx();
}
