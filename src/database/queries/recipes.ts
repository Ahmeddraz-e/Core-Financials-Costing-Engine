import Database from 'better-sqlite3';
import { generateId } from './utils';

function mapRecipe(db: Database.Database, r: any) {
  const components = db.prepare('SELECT * FROM recipe_components WHERE recipeId = ?').all(r.id) as any[];
  return {
    id: r.id,
    itemId: r.itemId,
    version: r.version,
    isActive: r.isActive === 1,
    yieldAmount: r.yieldAmount,
    components: components.map(c => ({
      componentItemId: c.componentItemId,
      quantity: c.quantity,
      lossPercent: c.lossPercent
    })),
    laborCost: r.laborCost,
    packagingCost: r.packagingCost,
    otherOperatingCost: r.otherOperatingCost,
    calculatedCost: r.calculatedCost,
    sellingPrice: r.sellingPrice,
    marginPercent: r.marginPercent,
    foodCostPercent: r.foodCostPercent
  };
}

export function getAllRecipes(db: Database.Database) {
  const rows = db.prepare('SELECT * FROM recipes').all() as any[];
  return rows.map(r => mapRecipe(db, r));
}

export function getRecipeById(db: Database.Database, id: string) {
  const r = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id) as any;
  if (!r) return null;
  return mapRecipe(db, r);
}

export function getRecipeByItemId(db: Database.Database, itemId: string) {
  const r = db.prepare('SELECT * FROM recipes WHERE itemId = ?').get(itemId) as any;
  if (!r) return null;
  return mapRecipe(db, r);
}

export function createRecipe(db: Database.Database, data: {
  itemId: string; yieldAmount: number;
  components: { componentItemId: string; quantity: number; lossPercent: number }[];
  laborCost: number; packagingCost: number; otherOperatingCost: number;
  calculatedCost: number; sellingPrice: number; marginPercent: number; foodCostPercent: number;
  version?: number; isActive?: boolean;
}) {
  const id = generateId('rec');
  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO recipes (id, itemId, version, isActive, yieldAmount, laborCost, packagingCost, otherOperatingCost, calculatedCost, sellingPrice, marginPercent, foodCostPercent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, data.itemId, data.version || 1, data.isActive !== false ? 1 : 0, data.yieldAmount, data.laborCost, data.packagingCost, data.otherOperatingCost, data.calculatedCost, data.sellingPrice, data.marginPercent, data.foodCostPercent);

    const insertComp = db.prepare('INSERT INTO recipe_components (id, recipeId, componentItemId, quantity, lossPercent) VALUES (?, ?, ?, ?, ?)');
    data.components.forEach((c, i) => {
      insertComp.run(`${id}-comp-${i}`, id, c.componentItemId, c.quantity, c.lossPercent);
    });
  });
  tx();
  return getRecipeById(db, id);
}

export function updateRecipe(db: Database.Database, id: string, data: {
  yieldAmount?: number;
  components?: { componentItemId: string; quantity: number; lossPercent: number }[];
  laborCost?: number; packagingCost?: number; otherOperatingCost?: number;
  calculatedCost?: number; sellingPrice?: number; marginPercent?: number; foodCostPercent?: number;
}) {
  const existing = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id) as any;
  if (!existing) throw new Error('Recipe not found');

  const tx = db.transaction(() => {
    const fields: string[] = [];
    const values: any[] = [];
    if (data.yieldAmount !== undefined) { fields.push('yieldAmount = ?'); values.push(data.yieldAmount); }
    if (data.laborCost !== undefined) { fields.push('laborCost = ?'); values.push(data.laborCost); }
    if (data.packagingCost !== undefined) { fields.push('packagingCost = ?'); values.push(data.packagingCost); }
    if (data.otherOperatingCost !== undefined) { fields.push('otherOperatingCost = ?'); values.push(data.otherOperatingCost); }
    if (data.calculatedCost !== undefined) { fields.push('calculatedCost = ?'); values.push(data.calculatedCost); }
    if (data.sellingPrice !== undefined) { fields.push('sellingPrice = ?'); values.push(data.sellingPrice); }
    if (data.marginPercent !== undefined) { fields.push('marginPercent = ?'); values.push(data.marginPercent); }
    if (data.foodCostPercent !== undefined) { fields.push('foodCostPercent = ?'); values.push(data.foodCostPercent); }

    if (fields.length > 0) {
      values.push(id);
      db.prepare(`UPDATE recipes SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }

    if (data.components) {
      db.prepare('DELETE FROM recipe_components WHERE recipeId = ?').run(id);
      const insertComp = db.prepare('INSERT INTO recipe_components (id, recipeId, componentItemId, quantity, lossPercent) VALUES (?, ?, ?, ?, ?)');
      data.components.forEach((c, i) => {
        insertComp.run(`${id}-comp-${i}`, id, c.componentItemId, c.quantity, c.lossPercent);
      });
    }
  });
  tx();
  return getRecipeById(db, id);
}

export function deleteRecipe(db: Database.Database, id: string) {
  const existing = db.prepare('SELECT * FROM recipes WHERE id = ?').get(id) as any;
  if (!existing) throw new Error('Recipe not found');

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM recipe_components WHERE recipeId = ?').run(id);
    db.prepare('DELETE FROM recipes WHERE id = ?').run(id);
  });
  tx();
}

// ═══════════ WASTAGE ═══════════

export function getAllWastage(db: Database.Database) {
  return db.prepare('SELECT * FROM wastage ORDER BY date DESC').all() as any[];
}

export function createWastage(db: Database.Database, data: {
  itemId: string; quantity: number; date: string; reason: string; cost: number;
}) {
  const id = generateId('wst');
  db.prepare('INSERT INTO wastage (id, itemId, quantity, date, reason, cost) VALUES (?, ?, ?, ?, ?, ?)').run(id, data.itemId, data.quantity, data.date, data.reason, data.cost);
  return db.prepare('SELECT * FROM wastage WHERE id = ?').get(id) as any;
}

export function deleteWastage(db: Database.Database, id: string) {
  const existing = db.prepare('SELECT * FROM wastage WHERE id = ?').get(id) as any;
  if (!existing) throw new Error('Wastage record not found');
  db.prepare('DELETE FROM wastage WHERE id = ?').run(id);
}
