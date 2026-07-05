import { Router } from 'express';
import Database from 'better-sqlite3';
import * as treasuryQ from '../database/queries/treasury';
import { createLog } from '../database/queries/audit';

export function treasuryRouter(db: Database.Database): Router {
  const router = Router();

  // ═══════════ TREASURIES ═══════════
  router.get('/cashboxes', (_req, res) => {
    try { res.json(treasuryQ.getAllTreasuries(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post('/cashboxes', (req, res) => {
    try {
      const t = treasuryQ.createTreasury(db, req.body);
      res.status(201).json(t);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.put('/cashboxes/:id', (req, res) => {
    try {
      const t = treasuryQ.updateTreasury(db, req.params.id, req.body);
      res.json(t);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.delete('/cashboxes/:id', (req, res) => {
    try {
      treasuryQ.deleteTreasury(db, req.params.id);
      res.json({ success: true });
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  // ═══════════ BANK ACCOUNTS ═══════════
  router.get('/banks', (_req, res) => {
    try { res.json(treasuryQ.getAllBankAccounts(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post('/banks', (req, res) => {
    try {
      const b = treasuryQ.createBankAccount(db, req.body);
      res.status(201).json(b);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.put('/banks/:id', (req, res) => {
    try {
      const b = treasuryQ.updateBankAccount(db, req.params.id, req.body);
      res.json(b);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.delete('/banks/:id', (req, res) => {
    try {
      treasuryQ.deleteBankAccount(db, req.params.id);
      res.json({ success: true });
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  // ═══════════ CHEQUES ═══════════
  router.get('/cheques', (_req, res) => {
    try { res.json(treasuryQ.getAllCheques(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post('/cheques', (req, res) => {
    try {
      const c = treasuryQ.createCheque(db, req.body);
      createLog(db, {
        user: req.user?.username || 'system',
        actionAr: `تسجيل شيك: ${req.body.chequeNumber}`,
        actionEn: `Registered cheque: ${req.body.chequeNumber}`,
        details: `المبلغ: ${req.body.amount}`
      });
      res.status(201).json(c);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.put('/cheques/:id/status', (req, res) => {
    try {
      const c = treasuryQ.updateChequeStatus(db, req.params.id, req.body.status);
      res.json(c);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.delete('/cheques/:id', (req, res) => {
    try {
      treasuryQ.deleteCheque(db, req.params.id);
      res.json({ success: true });
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  // ═══════════ MONEY TRANSACTIONS ═══════════
  router.get('/transactions', (_req, res) => {
    try { res.json(treasuryQ.getAllMoneyTransactions(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post('/transactions', (req, res) => {
    try {
      const mtx = treasuryQ.createMoneyTransaction(db, req.body);
      createLog(db, {
        user: req.user?.username || 'system',
        actionAr: `حركة مالية: ${req.body.type} - ${req.body.amount}`,
        actionEn: `Money transaction: ${req.body.type} - ${req.body.amount}`,
        details: req.body.description || ''
      });
      res.status(201).json(mtx);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.delete('/transactions/:id', (req, res) => {
    try {
      treasuryQ.deleteMoneyTransaction(db, req.params.id);
      res.json({ success: true });
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  return router;
}
