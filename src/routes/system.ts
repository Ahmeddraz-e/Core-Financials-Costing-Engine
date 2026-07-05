import { Router } from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import * as accountsQ from '../database/queries/accounts';
import * as salesQ from '../database/queries/sales';
import * as inventoryQ from '../database/queries/inventory';
import * as purchasesQ from '../database/queries/purchases';
import { getBouncedChequesCount } from '../database/queries/treasury';
import { getBackupSchedule, updateBackupSchedule } from '../database/queries/budgets';

export function systemRouter(db: Database.Database, dbPath: string): Router {
  const router = Router();

  // Dashboard summary data
  router.get('/dashboard', (_req, res) => {
    try {
      const accounts = accountsQ.getAllAccounts(db);
      const salesDaily = salesQ.getDailyTotals(db);
      const salesMonthly = salesQ.getMonthlySales(db);
      const topItems = salesQ.getTopSellingItems(db);
      const inventorySummary = inventoryQ.getInventorySummary(db);
      const accountsByType = accountsQ.getAccountBalancesByType(db);

      res.json({
        accounts,
        salesDaily,
        salesMonthly,
        topItems,
        inventorySummary,
        accountsByType
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Badge counts for sidebar
  router.get('/badges', (_req, res) => {
    try {
      res.json({
        pendingPRs: purchasesQ.getPendingPRsCount(db),
        lowStockItems: inventoryQ.getLowStockCount(db),
        bouncedCheques: getBouncedChequesCount(db)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Notifications
  router.get('/notifications', (_req, res) => {
    try {
      const lowStock = inventoryQ.getLowStockItems(db);
      const notifications = lowStock.map((item: any) => ({
        id: `low-stock-${item.id}`,
        titleAr: `نقص مخزون: ${item.nameAr}`,
        titleEn: `Low stock: ${item.nameEn}`,
        type: 'warning'
      }));

      // Add bounced cheques
      const cheques = db.prepare("SELECT * FROM cheques WHERE status = 'BOUNCED'").all() as any[];
      cheques.forEach((c: any) => {
        notifications.push({
          id: `bounced-${c.id}`,
          titleAr: `شيك مرتجع: رقم ${c.chequeNumber}`,
          titleEn: `Bounced cheque: #${c.chequeNumber}`,
          type: 'danger'
        });
      });

      res.json(notifications);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Backup schedule
  router.get('/backup-schedule', (_req, res) => {
    try { res.json(getBackupSchedule(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.put('/backup-schedule', (req, res) => {
    try { res.json(updateBackupSchedule(db, req.body)); }
    catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  // Backup
  router.post('/backup', (req, res) => {
    try {
      const appDataDir = path.dirname(dbPath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupDir = path.join(appDataDir, 'backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

      const backupPath = path.join(backupDir, `loding-erp-backup-${timestamp}.db`);
      fs.copyFileSync(dbPath, backupPath);
      res.json({
        success: true,
        message: 'Backup created successfully',
        messageAr: 'تم إنشاء النسخة الاحتياطية بنجاح',
        messageEn: 'Backup created successfully',
        fileName: `loding-erp-backup-${timestamp}.db`,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to create backup' });
    }
  });

  // Restore
  router.post('/restore', (_req, res) => {
    try {
      const appDataDir = path.dirname(dbPath);
      const backupDir = path.join(appDataDir, 'backups');
      if (!fs.existsSync(backupDir)) { res.status(404).json({ error: 'No backups directory found' }); return; }

      const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.db')).sort().reverse();
      if (files.length === 0) { res.status(404).json({ error: 'No backup files found' }); return; }

      const latest = path.join(backupDir, files[0]);
      db.close();
      fs.copyFileSync(latest, dbPath);
      res.json({
        success: true,
        messageAr: `تم استعادة النسخة الاحتياطية: ${files[0]}`,
        messageEn: `Database restored from backup: ${files[0]}`
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to restore backup' });
    }
  });

  // Reset
  router.post('/reset', (_req, res) => {
    try {
      db.close();
      if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
      res.json({
        success: true,
        messageAr: 'تم إعادة ضبط قاعدة البيانات. أعد تشغيل الخادم.',
        messageEn: 'Database reset. Restart the server to reinitialize.'
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to reset database' });
    }
  });

  return router;
}
