import { Router } from 'express';
import Database from 'better-sqlite3';
import * as salesQ from '../database/queries/sales';
import * as inventoryQ from '../database/queries/inventory';
import * as journalQ from '../database/queries/journal';
import { createLog } from '../database/queries/audit';

export function salesRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    try { res.json(salesQ.getAllSales(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.get('/:id', (req, res) => {
    try {
      const sale = salesQ.getSaleById(db, req.params.id);
      if (!sale) { res.status(404).json({ error: 'Sale not found' }); return; }
      res.json(sale);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // POST /api/sales — Create a sale with full business logic
  // This handles: create sale + update inventory + create journal entry + update treasury
  router.post('/', (req, res) => {
    try {
      const {
        sale: saleData,
        journalEntry: jeData,
        inventoryAdjustments,
        treasuryAdjustment
      } = req.body;

      const tx = db.transaction(() => {
        // 1. Create the sale record
        const newSale = salesQ.createSale(db, saleData);

        // 2. Adjust inventory if itemized
        if (inventoryAdjustments && Array.isArray(inventoryAdjustments)) {
          for (const adj of inventoryAdjustments) {
            inventoryQ.adjustQuantity(db, adj.itemId, -adj.quantity);
          }
        }

        // 3. Create journal entry if provided
        if (jeData && jeData.lines && jeData.lines.length >= 2) {
          journalQ.createEntry(db, jeData);
        }

        // 4. Adjust treasury balance
        if (treasuryAdjustment) {
          db.prepare('UPDATE treasuries SET balance = balance + ? WHERE id = ?')
            .run(treasuryAdjustment.amount, treasuryAdjustment.treasuryId);
        }

        return newSale;
      });

      const result = tx();

      createLog(db, {
        user: req.user?.username || 'system',
        actionAr: `تسجيل مبيعات: ${saleData.orderNumber}`,
        actionEn: `Sales recorded: ${saleData.orderNumber}`,
        details: `المبلغ: ${saleData.totalAmount}`
      });

      res.status(201).json(result);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  // DELETE /api/sales/:id — Reverse a sale with business logic
  router.delete('/:id', (req, res) => {
    try {
      const sale = salesQ.getSaleById(db, req.params.id);
      if (!sale) { res.status(404).json({ error: 'Sale not found' }); return; }

      const { reverseJournal, reverseTreasury, reverseInventory } = req.body || {};

      const tx = db.transaction(() => {
        // 1. Reverse inventory
        if (reverseInventory && Array.isArray(reverseInventory)) {
          for (const adj of reverseInventory) {
            inventoryQ.adjustQuantity(db, adj.itemId, adj.quantity);
          }
        }

        // 2. Reverse treasury
        if (reverseTreasury) {
          db.prepare('UPDATE treasuries SET balance = balance - ? WHERE id = ?')
            .run(reverseTreasury.amount, reverseTreasury.treasuryId);
        }

        // 3. Reverse journal entries if specified
        if (reverseJournal && Array.isArray(reverseJournal)) {
          for (const jeId of reverseJournal) {
            try { journalQ.deleteEntry(db, jeId); } catch (e) { /* journal may not exist */ }
          }
        }

        // 4. Delete the sale
        salesQ.deleteSale(db, req.params.id);
      });
      tx();

      createLog(db, {
        user: req.user?.username || 'system',
        actionAr: `إلغاء وعكس مبيعات: ${sale.orderNumber}`,
        actionEn: `Reversed sale: ${sale.orderNumber}`,
        details: `المبلغ: ${sale.totalAmount}`
      });

      res.json({ success: true });
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  // Chart endpoints
  router.get('/charts/daily', (_req, res) => {
    try { res.json(salesQ.getDailyTotals(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.get('/charts/monthly', (_req, res) => {
    try { res.json(salesQ.getMonthlySales(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.get('/charts/top-items', (_req, res) => {
    try { res.json(salesQ.getTopSellingItems(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  return router;
}
