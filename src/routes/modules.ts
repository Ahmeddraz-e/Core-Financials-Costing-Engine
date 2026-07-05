import { Router } from 'express';
import Database from 'better-sqlite3';
import * as hrQ from '../database/queries/hr';
import * as assetsQ from '../database/queries/fixed-assets';
import * as partiesQ from '../database/queries/parties';
import * as budgetsQ from '../database/queries/budgets';
import * as auditQ from '../database/queries/audit';
import { createLog } from '../database/queries/audit';

export function hrRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    try { res.json(hrQ.getAllEmployees(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.get('/:id', (req, res) => {
    try {
      const emp = hrQ.getEmployeeById(db, req.params.id);
      if (!emp) { res.status(404).json({ error: 'Employee not found' }); return; }
      res.json(emp);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post('/', (req, res) => {
    try {
      const emp = hrQ.createEmployee(db, req.body);
      createLog(db, {
        user: req.user?.username || 'system',
        actionAr: `تسجيل موظف: ${req.body.nameAr}`,
        actionEn: `Created employee: ${req.body.nameEn}`,
        details: `كود: ${req.body.code}`
      });
      res.status(201).json(emp);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.put('/:id', (req, res) => {
    try {
      const emp = hrQ.updateEmployee(db, req.params.id, req.body);
      res.json(emp);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.delete('/:id', (req, res) => {
    try {
      hrQ.deleteEmployee(db, req.params.id);
      res.json({ success: true });
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  return router;
}

export function fixedAssetsRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    try { res.json(assetsQ.getAllAssets(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post('/', (req, res) => {
    try {
      const asset = assetsQ.createAsset(db, req.body);
      createLog(db, {
        user: req.user?.username || 'system',
        actionAr: `تسجيل أصل ثابت: ${req.body.nameAr}`,
        actionEn: `Created fixed asset: ${req.body.nameEn}`,
        details: `كود: ${req.body.code}`
      });
      res.status(201).json(asset);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.put('/:id', (req, res) => {
    try {
      const asset = assetsQ.updateAsset(db, req.params.id, req.body);
      res.json(asset);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.delete('/:id', (req, res) => {
    try {
      assetsQ.deleteAsset(db, req.params.id);
      res.json({ success: true });
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  return router;
}

export function suppliersRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    try { res.json(partiesQ.getAllSuppliers(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post('/', (req, res) => {
    try {
      const s = partiesQ.createSupplier(db, req.body);
      createLog(db, {
        user: req.user?.username || 'system',
        actionAr: `تسجيل مورد: ${req.body.nameAr}`,
        actionEn: `Created supplier: ${req.body.nameEn}`,
        details: ''
      });
      res.status(201).json(s);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.put('/:id', (req, res) => {
    try { res.json(partiesQ.updateSupplier(db, req.params.id, req.body)); }
    catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.delete('/:id', (req, res) => {
    try { partiesQ.deleteSupplier(db, req.params.id); res.json({ success: true }); }
    catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  return router;
}

export function customersRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    try { res.json(partiesQ.getAllCustomers(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post('/', (req, res) => {
    try { res.status(201).json(partiesQ.createCustomer(db, req.body)); }
    catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.put('/:id', (req, res) => {
    try { res.json(partiesQ.updateCustomer(db, req.params.id, req.body)); }
    catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.delete('/:id', (req, res) => {
    try { partiesQ.deleteCustomer(db, req.params.id); res.json({ success: true }); }
    catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  return router;
}

export function budgetsRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    try { res.json(budgetsQ.getAllBudgets(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post('/', (req, res) => {
    try { res.status(201).json(budgetsQ.createBudget(db, req.body)); }
    catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.put('/:id', (req, res) => {
    try { res.json(budgetsQ.updateBudget(db, req.params.id, req.body)); }
    catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.delete('/:id', (req, res) => {
    try { budgetsQ.deleteBudget(db, req.params.id); res.json({ success: true }); }
    catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  return router;
}

export function auditRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    try { res.json(auditQ.getAllLogs(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.delete('/', (req, res) => {
    try {
      auditQ.clearLogs(db);
      createLog(db, {
        user: req.user?.username || 'system',
        actionAr: 'تصفير سجلات المراقبة',
        actionEn: 'Cleared audit logs',
        details: ''
      });
      res.json({ success: true });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  return router;
}
