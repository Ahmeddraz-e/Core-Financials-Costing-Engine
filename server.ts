import express from 'express';
import path from 'path';
import { initDatabase } from './src/database/db';
import { authMiddleware } from './src/middleware/auth';

// Route imports
import { authRouter } from './src/routes/auth';
import { accountsRouter } from './src/routes/accounts';
import { journalRouter } from './src/routes/journal';
import { salesRouter } from './src/routes/sales';
import { purchasesRouter } from './src/routes/purchases';
import { inventoryRouter } from './src/routes/inventory';
import { treasuryRouter } from './src/routes/treasury';
import { hrRouter, fixedAssetsRouter, suppliersRouter, customersRouter, budgetsRouter, auditRouter } from './src/routes/modules';
import { systemRouter } from './src/routes/system';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  const appDataDir = process.env.APPDATA_PATH || process.cwd();
  const dbPath = path.join(appDataDir, 'loding-erp.db');
  const db = initDatabase(dbPath);

  console.log(`[SQLite] Database path: ${dbPath}`);

  // ═══════════════════════════════════════════════
  // PUBLIC ROUTES (no auth required)
  // ═══════════════════════════════════════════════

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Authentication (login doesn't require a token)
  app.use('/api/auth', authRouter(db));

  // ═══════════════════════════════════════════════
  // PROTECTED ROUTES (auth required)
  // ═══════════════════════════════════════════════

  const auth = authMiddleware(db);

  app.use('/api/accounts',       auth, accountsRouter(db));
  app.use('/api/journal-entries', auth, journalRouter(db));
  app.use('/api/sales',          auth, salesRouter(db));
  app.use('/api/purchases',      auth, purchasesRouter(db));
  app.use('/api/inventory',      auth, inventoryRouter(db));
  app.use('/api/treasury',       auth, treasuryRouter(db));
  app.use('/api/employees',      auth, hrRouter(db));
  app.use('/api/fixed-assets',   auth, fixedAssetsRouter(db));
  app.use('/api/suppliers',      auth, suppliersRouter(db));
  app.use('/api/customers',      auth, customersRouter(db));
  app.use('/api/budgets',        auth, budgetsRouter(db));
  app.use('/api/audit-logs',     auth, auditRouter(db));
  app.use('/api/system',         auth, systemRouter(db, dbPath));

  // ═══════════════════════════════════════════════
  // BACKWARD COMPATIBILITY (legacy endpoints)
  // These will be removed in a future version
  // ═══════════════════════════════════════════════

  // Legacy: GET /api/erp-data — returns all data (for components not yet migrated)
  app.get('/api/erp-data', auth, (_req, res) => {
    try {
      const accounts = (db.prepare('SELECT * FROM accounts ORDER BY code').all() as any[]).map((r: any) => ({
        ...r, isSystem: !!r.isSystem, parentCode: r.parentCode || null
      }));

      const journalRows = db.prepare('SELECT * FROM journal_entries ORDER BY date DESC').all() as any[];
      const journalEntries = journalRows.map((je: any) => {
        const lines = db.prepare('SELECT accountId, debit, credit FROM journal_lines WHERE entryId = ?').all(je.id) as any[];
        return { ...je, approved: !!je.approved, approvedBy: je.approvedBy || undefined, lines };
      });

      const purchases = (db.prepare('SELECT * FROM purchases').all() as any[]).map((r: any) => ({
        ...r, items: JSON.parse(r.itemsJson || '[]'), itemsJson: undefined
      }));

      const inventory = (db.prepare('SELECT * FROM inventory').all() as any[]).map((r: any) => ({
        ...r, yieldPercent: r.yieldPercent ?? undefined
      }));

      const wastage = db.prepare('SELECT * FROM wastage').all() as any[];

      const recipeRows = db.prepare('SELECT * FROM recipes').all() as any[];
      const recipes = recipeRows.map((r: any) => {
        const components = db.prepare('SELECT * FROM recipe_components WHERE recipeId = ?').all(r.id) as any[];
        return {
          ...r,
          components: components.map((c: any) => ({ componentItemId: c.componentItemId, quantity: c.quantity, lossPercent: c.lossPercent }))
        };
      });

      const sales = (db.prepare('SELECT * FROM sales ORDER BY date DESC').all() as any[]).map((r: any) => ({
        ...r, items: JSON.parse(r.itemsJson || '[]'), itemsJson: undefined,
        channel: r.channel || undefined, cashierName: r.cashierName || undefined,
        dineInAmount: r.dineInAmount || 0, takeawayAmount: r.takeawayAmount || 0,
        deliveryAmount: r.deliveryAmount || 0, deliveryAppsAmount: r.deliveryAppsAmount || 0,
        cashAmount: r.cashAmount || 0, cardAmount: r.cardAmount || 0,
        serviceCharge: r.serviceCharge || 0, description: r.description || undefined
      }));

      const treasuries = db.prepare('SELECT * FROM treasuries').all() as any[];
      const bankAccounts = db.prepare('SELECT * FROM bank_accounts').all() as any[];
      const moneyTransactions = db.prepare('SELECT * FROM money_transactions').all() as any[];
      const cheques = db.prepare('SELECT * FROM cheques').all() as any[];
      const fixedAssets = db.prepare('SELECT * FROM fixed_assets').all() as any[];
      const employees = (db.prepare('SELECT * FROM employees').all() as any[]).map((r: any) => ({
        ...r, active: !!r.active
      }));
      const budgets = db.prepare('SELECT * FROM budgets').all() as any[];
      const suppliers = db.prepare('SELECT * FROM suppliers').all() as any[];
      const customers = db.prepare('SELECT * FROM customers').all() as any[];
      const auditLogs = db.prepare('SELECT * FROM audit_logs ORDER BY rowid DESC').all() as any[];
      const backupRow = db.prepare('SELECT * FROM backup_schedule WHERE id = 1').get() as any;

      // New entities
      const salesInvoices = (db.prepare('SELECT * FROM sales_invoices ORDER BY date DESC').all() as any[]).map((r: any) => ({
        ...r, items: JSON.parse(r.itemsJson || '[]'), itemsJson: undefined
      }));
      const vouchers = db.prepare('SELECT * FROM vouchers ORDER BY date DESC').all() as any[];
      const salesReturns = (db.prepare('SELECT * FROM sales_returns ORDER BY date DESC').all() as any[]).map((r: any) => ({
        ...r, items: JSON.parse(r.itemsJson || '[]'), itemsJson: undefined
      }));
      const purchaseReturns = (db.prepare('SELECT * FROM purchase_returns ORDER BY date DESC').all() as any[]).map((r: any) => ({
        ...r, items: JSON.parse(r.itemsJson || '[]'), itemsJson: undefined
      }));
      const payrollRuns = (db.prepare('SELECT * FROM payroll_runs ORDER BY date DESC').all() as any[]).map((r: any) => ({
        ...r, lines: JSON.parse(r.linesJson || '[]'), linesJson: undefined
      }));
      const accountingPeriods = db.prepare('SELECT * FROM accounting_periods ORDER BY year DESC, month DESC').all() as any[];
      const checkbooks = (db.prepare('SELECT * FROM checkbooks').all() as any[]).map((r: any) => ({
        ...r, checks: JSON.parse(r.checksJson || '[]'), checksJson: undefined
      }));

      res.json({
        accounts, journalEntries, purchases, inventory, wastage, recipes, sales,
        treasuries, bankAccounts, moneyTransactions, cheques, fixedAssets, employees,
        budgets, suppliers, customers, auditLogs,
        backupSchedule: backupRow ? { frequency: backupRow.frequency, time: backupRow.time, target: backupRow.target, enabled: !!backupRow.enabled }
          : { frequency: 'DAILY', time: '23:00', target: 'LOCAL', enabled: true },
        salesInvoices, vouchers, salesReturns, purchaseReturns, payrollRuns, accountingPeriods, checkbooks
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to read ERP data' });
    }
  });

  // Legacy: POST /api/erp-data — full state overwrite (for components not yet migrated)
  app.post('/api/erp-data', auth, (req, res) => {
    try {
      const data = req.body;
      if (!data || typeof data !== 'object') {
        res.status(400).json({ error: 'Invalid payload' });
        return;
      }

      // Import new incremental diff sync function
      const { saveERPDataDiff } = require('./src/database/db');
      saveERPDataDiff(db, data);
      res.json({ success: true });
    } catch (err: any) {
      console.error('Failed to sync ERP data:', err);
      res.status(500).json({ error: 'Failed to synchronize ERP data: ' + err.message });
    }
  });

  // Legacy chart endpoints (backward compat)
  app.get('/api/charts/sales-daily', auth, (_req, res) => {
    try {
      const { getDailyTotals } = require('./src/database/queries/sales');
      res.json(getDailyTotals(db));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/charts/account-balances', auth, (_req, res) => {
    try {
      const { getAccountBalancesByType } = require('./src/database/queries/accounts');
      res.json(getAccountBalancesByType(db));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/charts/inventory-summary', auth, (_req, res) => {
    try {
      const { getInventorySummary } = require('./src/database/queries/inventory');
      res.json(getInventorySummary(db));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/charts/monthly-sales', auth, (_req, res) => {
    try {
      const { getMonthlySales } = require('./src/database/queries/sales');
      res.json(getMonthlySales(db));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/charts/top-items', auth, (_req, res) => {
    try {
      const { getTopSellingItems } = require('./src/database/queries/sales');
      res.json(getTopSellingItems(db));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Legacy backup/restore
  app.post('/api/backup', auth, (req, res) => {
    const { systemRouter: sr } = require('./src/routes/system');
    // Forward to system router handler
    const sysApp = express();
    sysApp.use(express.json());
    const sysR = sr(db, dbPath);
    sysR.handle(req, res, () => {});
  });

  // ═══════════════════════════════════════════════
  // STATIC FILES / VITE DEV SERVER
  // ═══════════════════════════════════════════════

  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = __dirname;
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LODing ERP Engine listening on http://0.0.0.0:${PORT}`);
    console.log(`  New CRUD APIs:    /api/accounts, /api/sales, /api/inventory, ...`);
    console.log(`  Auth:             /api/auth/login, /api/auth/me`);
    console.log(`  Legacy (compat):  /api/erp-data (GET/POST)`);
  });
}

startServer();
