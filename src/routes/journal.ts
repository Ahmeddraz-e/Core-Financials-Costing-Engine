import { Router } from 'express';
import Database from 'better-sqlite3';
import * as journalQ from '../database/queries/journal';
import { createLog } from '../database/queries/audit';

export function journalRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    try { res.json(journalQ.getAllEntries(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.get('/:id', (req, res) => {
    try {
      const entry = journalQ.getEntryById(db, req.params.id);
      if (!entry) { res.status(404).json({ error: 'Entry not found' }); return; }
      res.json(entry);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post('/', (req, res) => {
    try {
      const entry = journalQ.createEntry(db, req.body);
      createLog(db, {
        user: req.user?.username || 'system',
        actionAr: `تسجيل قيد محاسبي: ${req.body.entryNumber}`,
        actionEn: `Posted journal entry: ${req.body.entryNumber}`,
        details: req.body.description || ''
      });
      res.status(201).json(entry);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.put('/:id/approve', (req, res) => {
    try {
      const entry = journalQ.approveEntry(db, req.params.id, req.user?.username || 'system');
      createLog(db, {
        user: req.user?.username || 'system',
        actionAr: `اعتماد قيد: ${entry?.entryNumber}`,
        actionEn: `Approved entry: ${entry?.entryNumber}`,
        details: ''
      });
      res.json(entry);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.delete('/:id', (req, res) => {
    try {
      journalQ.deleteEntry(db, req.params.id);
      createLog(db, {
        user: req.user?.username || 'system',
        actionAr: `حذف وعكس قيد محاسبي: ${req.params.id}`,
        actionEn: `Reversed journal entry: ${req.params.id}`,
        details: ''
      });
      res.json({ success: true });
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  return router;
}
