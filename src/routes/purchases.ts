import { Router } from 'express';
import Database from 'better-sqlite3';
import * as purchasesQ from '../database/queries/purchases';
import * as inventoryQ from '../database/queries/inventory';
import { createLog } from '../database/queries/audit';

export function purchasesRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    try { res.json(purchasesQ.getAllPurchases(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.get('/:id', (req, res) => {
    try {
      const p = purchasesQ.getPurchaseById(db, req.params.id);
      if (!p) { res.status(404).json({ error: 'Purchase not found' }); return; }
      res.json(p);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post('/', (req, res) => {
    try {
      const purchase = purchasesQ.createPurchase(db, req.body);
      createLog(db, {
        user: req.user?.username || 'system',
        actionAr: `إنشاء طلب شراء: ${req.body.number}`,
        actionEn: `Created purchase: ${req.body.number}`,
        details: `المبلغ: ${req.body.totalAmount}`
      });
      res.status(201).json(purchase);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  // Update status with optional side effects (e.g., receiving goods)
  router.put('/:id/status', (req, res) => {
    try {
      const { status, inventoryAdjustments, supplierBalanceAdjust, accountAdjustments } = req.body;
      
      const tx = db.transaction(() => {
        purchasesQ.updatePurchaseStatus(db, req.params.id, status);

        // When goods are received, add to inventory
        if (status === 'RECEIVED' && inventoryAdjustments) {
          for (const adj of inventoryAdjustments) {
            inventoryQ.adjustQuantity(db, adj.itemId, adj.quantity);
          }
        }

        // Adjust supplier balance
        if (supplierBalanceAdjust) {
          db.prepare('UPDATE suppliers SET balance = balance + ? WHERE id = ?')
            .run(supplierBalanceAdjust.amount, supplierBalanceAdjust.supplierId);
        }

        // Adjust account balances
        if (accountAdjustments && Array.isArray(accountAdjustments)) {
          for (const adj of accountAdjustments) {
            db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?').run(adj.delta, adj.accountId);
          }
        }
      });
      tx();

      const updated = purchasesQ.getPurchaseById(db, req.params.id);
      createLog(db, {
        user: req.user?.username || 'system',
        actionAr: `تحديث حالة مشتريات: ${updated?.number} → ${status}`,
        actionEn: `Updated purchase status: ${updated?.number} → ${status}`,
        details: ''
      });
      res.json(updated);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.delete('/:id', (req, res) => {
    try {
      purchasesQ.deletePurchase(db, req.params.id);
      res.json({ success: true });
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  return router;
}
