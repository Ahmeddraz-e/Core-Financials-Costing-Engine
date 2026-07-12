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

  // List all available backups
  router.get('/backups/list', (_req, res) => {
    try {
      const schedule = db.prepare('SELECT * FROM backup_schedule WHERE id = 1').get() as any;
      let backupDir = '';
      if (schedule && schedule.customPath) {
        backupDir = schedule.customPath;
      } else {
        const appDataDir = path.dirname(dbPath);
        backupDir = path.join(appDataDir, 'backups');
      }
      console.log(`[BACKUPS/LIST] customPath="${schedule?.customPath}" resolvedDir="${backupDir}"`);

      if (!fs.existsSync(backupDir)) {
        console.log(`[BACKUPS/LIST] Directory does not exist: ${backupDir}`);
        res.json([]);
        return;
      }

      const files = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.db'))
        .map(f => {
          const filePath = path.join(backupDir, f);
          const stats = fs.statSync(filePath);
          return {
            fileName: f,
            sizeBytes: stats.size,
            createdAt: stats.birthtime.toISOString(),
            modifiedAt: stats.mtime.toISOString()
          };
        })
        .sort((a, b) => b.fileName.localeCompare(a.fileName)); // Sort newest first

      console.log(`[BACKUPS/LIST] Found ${files.length} files in ${backupDir}`);
      res.json(files);
    } catch (err: any) {
      console.error('[BACKUPS/LIST] Error:', err.message);
      res.status(500).json({ error: 'Failed to list backups: ' + err.message });
    }
  });

  // Backup
  router.post('/backup', async (req, res) => {
    try {
      const schedule = db.prepare('SELECT * FROM backup_schedule WHERE id = 1').get() as any;
      let backupDir = '';
      if (schedule && schedule.customPath) {
        backupDir = schedule.customPath;
      } else {
        const appDataDir = path.dirname(dbPath);
        backupDir = path.join(appDataDir, 'backups');
      }
      console.log(`[BACKUP/CREATE] customPath="${schedule?.customPath}" resolvedDir="${backupDir}"`);

      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = `loding-erp-backup-${timestamp}.db`;
      const backupPath = path.join(backupDir, backupFile);
      await db.backup(backupPath);
      console.log(`[BACKUP/CREATE] Created: ${backupPath}`);
      res.json({
        success: true,
        message: 'Backup created successfully',
        messageAr: `تم إنشاء النسخة الاحتياطية بنجاح في: ${backupPath}`,
        messageEn: `Backup created successfully at: ${backupPath}`,
        fileName: backupFile,
        timestamp: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('[BACKUP/CREATE] Error:', err.message);
      res.status(500).json({ error: 'Failed to create backup: ' + err.message });
    }
  });

  // Restore
  router.post('/restore', async (req, res) => {
    try {
      const schedule = db.prepare('SELECT * FROM backup_schedule WHERE id = 1').get() as any;
      let backupDir = '';
      if (schedule && schedule.customPath) {
        backupDir = schedule.customPath;
      } else {
        const appDataDir = path.dirname(dbPath);
        backupDir = path.join(appDataDir, 'backups');
      }
      console.log(`[BACKUP/RESTORE] customPath="${schedule?.customPath}" resolvedDir="${backupDir}"`);

      if (!fs.existsSync(backupDir)) { res.status(404).json({ error: 'No backups directory found' }); return; }

      const { fileName } = req.body || {};
      let selectedFile = '';
      if (fileName) {
        selectedFile = path.join(backupDir, fileName);
        if (!fs.existsSync(selectedFile)) {
          res.status(404).json({ error: 'Selected backup file not found' });
          return;
        }
      } else {
        const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.db')).sort().reverse();
        if (files.length === 0) { res.status(404).json({ error: 'No backup files found' }); return; }
        selectedFile = path.join(backupDir, files[0]);
      }

      const fileBasename = path.basename(selectedFile);

      // Safety: create a pre-restore snapshot using db.backup() (consistent snapshot)
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safetyBackupFile = `loding-erp-backup-before-restore-${timestamp}.db`;
      const safetyBackupPath = path.join(backupDir, safetyBackupFile);
      await db.backup(safetyBackupPath);
      console.log(`[SAFETY] Pre-restore backup created at: ${safetyBackupPath}`);

      db.close();
      fs.copyFileSync(selectedFile, dbPath);

      res.json({
        success: true,
        messageAr: `تم استعادة النسخة الاحتياطية: ${fileBasename}. تم أخذ نسخة احتياطية للأمان قبل الاستعادة: ${safetyBackupFile}. سيتم إعادة تشغيل النظام تلقائياً خلال ثوانٍ.`,
        messageEn: `Database restored from backup: ${fileBasename}. Safety pre-restore backup: ${safetyBackupFile}. The application will relaunch in a few seconds.`
      });

      setTimeout(() => {
        try {
          const { app } = require('electron');
          if (app) {
            app.relaunch();
            app.exit(0);
          } else {
            process.exit(0);
          }
        } catch (e) {
          process.exit(0);
        }
      }, 750);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to restore backup: ' + err.message });
    }
  });

  // Restore from external file (user-selected path, e.g. USB)
  router.post('/restore-from-file', async (req, res) => {
    try {
      const { filePath } = req.body || {};
      if (!filePath || typeof filePath !== 'string') {
        res.status(400).json({ error: 'filePath is required' });
        return;
      }
      if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'Selected file not found' });
        return;
      }
      const stats = fs.statSync(filePath);
      if (!stats.isFile()) {
        res.status(400).json({ error: 'Selected path is not a file' });
        return;
      }
      const fileBasename = path.basename(filePath);

      // Safety: create a pre-restore snapshot
      const backupDir = path.dirname(dbPath);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safetyBackupFile = `loding-erp-backup-before-restore-${timestamp}.db`;
      const safetyBackupPath = path.join(backupDir, safetyBackupFile);
      await db.backup(safetyBackupPath);
      console.log(`[SAFETY] Pre-restore backup created at: ${safetyBackupPath}`);

      db.close();
      fs.copyFileSync(filePath, dbPath);

      res.json({
        success: true,
        messageAr: `تم استعادة النسخة الاحتياطية: ${fileBasename}. تم أخذ نسخة احتياطية للأمان قبل الاستعادة: ${safetyBackupFile}. سيتم إعادة تشغيل النظام تلقائياً خلال ثوانٍ.`,
        messageEn: `Database restored from: ${fileBasename}. Safety pre-restore backup: ${safetyBackupFile}. The application will relaunch in a few seconds.`
      });

      setTimeout(() => {
        try {
          const { app } = require('electron');
          if (app) { app.relaunch(); app.exit(0); }
          else { process.exit(0); }
        } catch (e) { process.exit(0); }
      }, 750);
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to restore from file: ' + err.message });
    }
  });

  // Reset
  router.post('/reset', (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        res.status(401).json({ error: 'No token provided' });
        return;
      }
      const { validateSession } = require('../database/queries/users');
      const session = validateSession(db, token);
      if (!session) {
        res.status(401).json({ error: 'Invalid or expired session' });
        return;
      }

      if (session.role?.toLowerCase() !== 'admin') {
        res.status(403).json({ error: 'Only administrators can perform system reset' });
        return;
      }

      const { password } = req.body;
      if (!password) {
        res.status(400).json({ error: 'كلمة المرور مطلوبة لإتمام إعادة التهيئة' });
        return;
      }

      const adminUser = db.prepare('SELECT * FROM users WHERE id = ?').get(session.userId) as any;
      if (!adminUser) {
        res.status(404).json({ error: 'Admin user not found' });
        return;
      }

      const { verifyPassword } = require('../database/queries/utils');
      const isMatch = verifyPassword(password, adminUser.passwordHash);
      if (!isMatch) {
        res.status(400).json({ error: 'كلمة المرور الحالية غير صحيحة' });
        return;
      }

      // 🚨 SAFETY FIRST: Auto-create a backup BEFORE resetting the database!
      const schedule = db.prepare('SELECT * FROM backup_schedule WHERE id = 1').get() as any;
      let backupDir = '';
      if (schedule && schedule.customPath) {
        backupDir = schedule.customPath;
      } else {
        const appDataDir = path.dirname(dbPath);
        backupDir = path.join(appDataDir, 'backups');
      }

      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const safetyBackupFile = `loding-erp-backup-before-reset-${timestamp}.db`;
      const safetyBackupPath = path.join(backupDir, safetyBackupFile);
      fs.copyFileSync(dbPath, safetyBackupPath);
      console.log(`[SAFETY] Pre-reset backup created at: ${safetyBackupPath}`);

      db.transaction(() => {
        db.exec(`
          DELETE FROM journal_lines;
          DELETE FROM journal_entries;
          DELETE FROM sales;
          DELETE FROM purchases;
          DELETE FROM wastage;
          DELETE FROM money_transactions;
          DELETE FROM cheques;
          DELETE FROM sales_invoices;
          DELETE FROM vouchers;
          DELETE FROM sales_returns;
          DELETE FROM purchase_returns;
          DELETE FROM payroll_runs;
          
          UPDATE accounts SET balance = 0;
          UPDATE treasuries SET balance = 0;
          UPDATE bank_accounts SET balance = 0;
          UPDATE customers SET balance = 0;
          UPDATE suppliers SET balance = 0;
          UPDATE inventory SET quantity = 0, cost = 0;
        `);

        // Insert audit log directly to avoid React state overwrite
        const logId = `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const logTime = new Date().toISOString();
        db.prepare(`
          INSERT INTO audit_logs (id, timestamp, user, actionAr, actionEn, details, ipAddress)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          logId,
          logTime,
          session.username || 'ADMIN',
          'إعادة تهيئة النظام',
          'System Reset executed',
          'تم تصفير العمليات والأرصدة والكميات والاحتفاظ بالبيانات التعريفية والوصفات بنجاح.',
          '127.0.0.1'
        );
      })();
      res.json({
        success: true,
        messageAr: `تمت إعادة تهيئة الحركات التشغيلية وتصفير الأرصدة بنجاح. تم أخذ نسخة احتياطية تلقائياً للأمان باسم: ${safetyBackupFile}`,
        messageEn: `Operational transactions successfully wiped. A safety backup was created at: ${safetyBackupFile}`
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to reset database: ' + err.message });
    }
  });

  return router;
}
