import Database from 'better-sqlite3';
import { generateId } from './utils';

function mapSale(r: any) {
  return {
    ...r,
    items: JSON.parse(r.itemsJson || '[]'),
    itemsJson: undefined,
    channel: r.channel || undefined,
    cashierName: r.cashierName || undefined,
    dineInAmount: r.dineInAmount || 0,
    takeawayAmount: r.takeawayAmount || 0,
    deliveryAmount: r.deliveryAmount || 0,
    deliveryAppsAmount: r.deliveryAppsAmount || 0,
    cashAmount: r.cashAmount || 0,
    cardAmount: r.cardAmount || 0,
    serviceCharge: r.serviceCharge || 0,
    description: r.description || undefined
  };
}

export function getAllSales(db: Database.Database) {
  return (db.prepare('SELECT * FROM sales ORDER BY date DESC').all() as any[]).map(mapSale);
}

export function getSaleById(db: Database.Database, id: string) {
  const r = db.prepare('SELECT * FROM sales WHERE id = ?').get(id) as any;
  if (!r) return null;
  return mapSale(r);
}

export function createSale(db: Database.Database, data: {
  orderNumber: string;
  date: string;
  channel?: string;
  cashierName?: string;
  dineInAmount?: number;
  takeawayAmount?: number;
  deliveryAmount?: number;
  deliveryAppsAmount?: number;
  cashAmount?: number;
  cardAmount?: number;
  serviceCharge?: number;
  taxAmount: number;
  totalAmount: number;
  foodCost: number;
  description?: string;
  items?: { itemId: string; quantity: number; price: number; cost: number }[];
}) {
  const id = generateId('sl');
  db.prepare(`
    INSERT INTO sales (id, orderNumber, date, channel, cashierName, dineInAmount, takeawayAmount, deliveryAmount, deliveryAppsAmount, cashAmount, cardAmount, serviceCharge, taxAmount, totalAmount, foodCost, description, itemsJson)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, data.orderNumber, data.date, data.channel || null, data.cashierName || null,
    data.dineInAmount || 0, data.takeawayAmount || 0, data.deliveryAmount || 0, data.deliveryAppsAmount || 0,
    data.cashAmount || 0, data.cardAmount || 0, data.serviceCharge || 0,
    data.taxAmount, data.totalAmount, data.foodCost,
    data.description || '', JSON.stringify(data.items || [])
  );

  return getSaleById(db, id);
}

export function deleteSale(db: Database.Database, id: string) {
  const sale = db.prepare('SELECT * FROM sales WHERE id = ?').get(id) as any;
  if (!sale) throw new Error('Sale not found');
  db.prepare('DELETE FROM sales WHERE id = ?').run(id);
  return mapSale(sale);
}

export function getSalesCount(db: Database.Database): number {
  const r = db.prepare('SELECT COUNT(*) as cnt FROM sales').get() as any;
  return r.cnt;
}

export function getDailyTotals(db: Database.Database) {
  return db.prepare(`
    SELECT date, SUM(totalAmount) as total, SUM(foodCost) as foodCost
    FROM sales GROUP BY date ORDER BY date ASC
  `).all() as any[];
}

export function getMonthlySales(db: Database.Database) {
  return db.prepare(`
    SELECT substr(date, 1, 7) as month, SUM(totalAmount) as total
    FROM sales GROUP BY month ORDER BY month ASC
  `).all() as any[];
}

export function getTopSellingItems(db: Database.Database) {
  const rows = db.prepare('SELECT itemsJson FROM sales ORDER BY date DESC').all() as any[];
  const invItems = db.prepare('SELECT id, nameAr, nameEn FROM inventory').all() as any[];
  const invMap = new Map(invItems.map((i: any) => [i.id, i]));
  const itemMap = new Map<string, { nameAr: string; nameEn: string; qty: number; revenue: number }>();

  for (const row of rows) {
    const items = JSON.parse(row.itemsJson || '[]');
    for (const it of items) {
      const inv = invMap.get(it.itemId);
      if (!inv) continue;
      if (!itemMap.has(it.itemId)) {
        itemMap.set(it.itemId, { nameAr: inv.nameAr, nameEn: inv.nameEn, qty: 0, revenue: 0 });
      }
      const entry = itemMap.get(it.itemId)!;
      entry.qty += it.quantity || 0;
      entry.revenue += (it.price || 0) * (it.quantity || 0);
    }
  }

  return Array.from(itemMap.values())
    .map(v => ({ nameAr: v.nameAr, nameEn: v.nameEn, totalQty: v.qty, totalRevenue: v.revenue }))
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);
}
