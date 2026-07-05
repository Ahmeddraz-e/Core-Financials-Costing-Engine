import { Router } from 'express';
import Database from 'better-sqlite3';
import * as invQ from '../database/queries/inventory';
import * as recipesQ from '../database/queries/recipes';
import { createLog } from '../database/queries/audit';

export function inventoryRouter(db: Database.Database): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    try { res.json(invQ.getAllItems(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.get('/summary', (_req, res) => {
    try { res.json(invQ.getInventorySummary(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.get('/low-stock', (_req, res) => {
    try { res.json(invQ.getLowStockItems(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.get('/:id', (req, res) => {
    try {
      const item = invQ.getItemById(db, req.params.id);
      if (!item) { res.status(404).json({ error: 'Item not found' }); return; }
      res.json(item);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post('/', (req, res) => {
    try {
      const item = invQ.createItem(db, req.body);
      createLog(db, {
        user: req.user?.username || 'system',
        actionAr: `إضافة صنف مخزني: ${req.body.nameAr}`,
        actionEn: `Created inventory item: ${req.body.nameEn}`,
        details: `كود: ${req.body.code}`
      });
      res.status(201).json(item);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.put('/:id', (req, res) => {
    try {
      const item = invQ.updateItem(db, req.params.id, req.body);
      res.json(item);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.put('/:id/adjust', (req, res) => {
    try {
      const { delta } = req.body;
      const item = invQ.adjustQuantity(db, req.params.id, delta);
      res.json(item);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.delete('/:id', (req, res) => {
    try {
      invQ.deleteItem(db, req.params.id);
      res.json({ success: true });
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  // ═══════════ WASTAGE ═══════════
  router.get('/wastage/all', (_req, res) => {
    try { res.json(recipesQ.getAllWastage(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post('/wastage', (req, res) => {
    try {
      const wastage = recipesQ.createWastage(db, req.body);
      // Also deduct from inventory
      if (req.body.itemId && req.body.quantity) {
        invQ.adjustQuantity(db, req.body.itemId, -req.body.quantity);
      }
      createLog(db, {
        user: req.user?.username || 'system',
        actionAr: `تسجيل هالك: ${req.body.quantity}`,
        actionEn: `Wastage recorded: ${req.body.quantity}`,
        details: req.body.reason || ''
      });
      res.status(201).json(wastage);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  // ═══════════ RECIPES ═══════════
  router.get('/recipes/all', (_req, res) => {
    try { res.json(recipesQ.getAllRecipes(db)); }
    catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.get('/recipes/:id', (req, res) => {
    try {
      const recipe = recipesQ.getRecipeById(db, req.params.id);
      if (!recipe) { res.status(404).json({ error: 'Recipe not found' }); return; }
      res.json(recipe);
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  router.post('/recipes', (req, res) => {
    try {
      const recipe = recipesQ.createRecipe(db, req.body);
      createLog(db, {
        user: req.user?.username || 'system',
        actionAr: `إضافة وصفة جديدة`,
        actionEn: `Created recipe`,
        details: `Item: ${req.body.itemId}`
      });
      res.status(201).json(recipe);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.put('/recipes/:id', (req, res) => {
    try {
      const recipe = recipesQ.updateRecipe(db, req.params.id, req.body);
      res.json(recipe);
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  router.delete('/recipes/:id', (req, res) => {
    try {
      recipesQ.deleteRecipe(db, req.params.id);
      res.json({ success: true });
    } catch (err: any) { res.status(400).json({ error: err.message }); }
  });

  return router;
}
