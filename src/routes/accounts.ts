import { Router } from 'express';
import Database from 'better-sqlite3';
import * as accountsQ from '../database/queries/accounts';
import { createLog } from '../database/queries/audit';

export function accountsRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    try { res.json(accountsQ.getAllAccounts(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.get('/:id', (req, res) => {
    try {
      const account = accountsQ.getAccountById(db, req.params.id);
      if (!account) { res.status(404).json({ error: 'Account not found' }); return; }
      res.json(account);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post('/', (req, res) => {
    try {
      const account = accountsQ.createAccount(db, req.body);
      createLog(db, {
        user: req.user?.username || 'system',
        actionAr: `إضافة حساب جديد: ${req.body.nameAr}`,
        actionEn: `Created account: ${req.body.nameEn}`,
        details: `كود الحساب: ${req.body.code}`
      });
      res.status(201).json(account);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.put('/:id', (req, res) => {
    try {
      const account = accountsQ.updateAccount(db, req.params.id, req.body);
      res.json(account);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.delete('/:id', (req, res) => {
    try {
      accountsQ.deleteAccount(db, req.params.id);
      createLog(db, {
        user: req.user?.username || 'system',
        actionAr: `حذف حساب: ${req.params.id}`,
        actionEn: `Deleted account: ${req.params.id}`,
        details: ''
      });
      res.json({ success: true });
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.get('/summary/by-type', (_req, res) => {
    try { res.json(accountsQ.getAccountBalancesByType(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  return router;
}
