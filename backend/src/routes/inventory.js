import { Router } from 'express';
import db from '../db.js';

const router = Router();

const CATEGORIES = [
  'paint',
  'parts',
  'consumables',
  'tools',
  'chemicals',
  'polish',
  'other',
];

function getItem(id) {
  return db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id);
}

function enrichItem(item) {
  if (!item) return null;
  const qty = Number(item.quantity_on_hand) || 0;
  const reorder = Number(item.reorder_level) || 0;
  return {
    ...item,
    stock_value: Math.round(qty * (Number(item.cost_price) || 0) * 100) / 100,
    is_low_stock: qty <= reorder,
  };
}

router.get('/summary', (_req, res) => {
  const summary = db
    .prepare(
      `SELECT
         COUNT(*) AS total_items,
         SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) AS active_items,
         SUM(CASE WHEN is_active = 1 AND quantity_on_hand <= reorder_level THEN 1 ELSE 0 END) AS low_stock_count,
         COALESCE(SUM(CASE WHEN is_active = 1 THEN quantity_on_hand * cost_price ELSE 0 END), 0) AS stock_value
       FROM inventory_items`
    )
    .get();

  const byCategory = db
    .prepare(
      `SELECT category, COUNT(*) AS count,
              COALESCE(SUM(quantity_on_hand * cost_price), 0) AS value
       FROM inventory_items
       WHERE is_active = 1
       GROUP BY category
       ORDER BY value DESC`
    )
    .all();

  const lowStock = db
    .prepare(
      `SELECT * FROM inventory_items
       WHERE is_active = 1 AND quantity_on_hand <= reorder_level
       ORDER BY quantity_on_hand ASC, name COLLATE NOCASE
       LIMIT 10`
    )
    .all()
    .map(enrichItem);

  res.json({
    ...summary,
    stock_value: Math.round((summary.stock_value || 0) * 100) / 100,
    by_category: byCategory,
    low_stock: lowStock,
  });
});

router.get('/movements', (req, res) => {
  const { item_id, type, from, to, limit = '100' } = req.query;
  let sql = `
    SELECT m.*, i.name AS item_name, i.sku AS item_sku, i.unit AS item_unit
    FROM inventory_movements m
    JOIN inventory_items i ON i.id = m.item_id
    WHERE 1=1
  `;
  const params = [];

  if (item_id) {
    sql += ' AND m.item_id = ?';
    params.push(item_id);
  }
  if (type) {
    sql += ' AND m.movement_type = ?';
    params.push(type);
  }
  if (from) {
    sql += ' AND m.movement_date >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND m.movement_date <= ?';
    params.push(to);
  }

  sql += ' ORDER BY m.movement_date DESC, m.id DESC LIMIT ?';
  params.push(Math.min(Number(limit) || 100, 500));

  res.json(db.prepare(sql).all(...params));
});

router.get('/', (req, res) => {
  const { q, category, low_stock, active = '1' } = req.query;
  let sql = 'SELECT * FROM inventory_items WHERE 1=1';
  const params = [];

  if (active === '1' || active === '0') {
    sql += ' AND is_active = ?';
    params.push(Number(active));
  }

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  if (q) {
    sql += ` AND (
      name LIKE ? OR sku LIKE ? OR supplier LIKE ? OR location LIKE ?
    )`;
    const like = `%${q}%`;
    params.push(like, like, like, like);
  }

  if (low_stock === '1') {
    sql += ' AND quantity_on_hand <= reorder_level';
  }

  sql += ' ORDER BY name COLLATE NOCASE';
  res.json(db.prepare(sql).all(...params).map(enrichItem));
});

router.get('/:id', (req, res) => {
  const item = getItem(req.params.id);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  const movements = db
    .prepare(
      `SELECT * FROM inventory_movements
       WHERE item_id = ?
       ORDER BY movement_date DESC, id DESC
       LIMIT 50`
    )
    .all(req.params.id);

  res.json({ ...enrichItem(item), movements });
});

router.post('/', (req, res) => {
  const {
    sku,
    name,
    category = 'parts',
    unit = 'Pcs',
    quantity_on_hand = 0,
    reorder_level = 0,
    cost_price = 0,
    sell_price = 0,
    supplier,
    location,
    notes,
    is_active = 1,
  } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const qty = Math.max(0, Number(quantity_on_hand) || 0);
  const cat = CATEGORIES.includes(category) ? category : 'other';

  try {
    const create = db.transaction(() => {
      const result = db
        .prepare(
          `INSERT INTO inventory_items (
            sku, name, category, unit, quantity_on_hand, reorder_level,
            cost_price, sell_price, supplier, location, notes, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          sku?.trim() || null,
          name.trim(),
          cat,
          unit.trim() || 'Pcs',
          qty,
          Math.max(0, Number(reorder_level) || 0),
          Math.max(0, Number(cost_price) || 0),
          Math.max(0, Number(sell_price) || 0),
          supplier?.trim() || null,
          location?.trim() || null,
          notes?.trim() || null,
          is_active ? 1 : 0
        );

      const itemId = result.lastInsertRowid;

      if (qty > 0) {
        db.prepare(
          `INSERT INTO inventory_movements
           (item_id, movement_type, quantity, unit_cost, balance_after, reference, notes, movement_date)
           VALUES (?, 'in', ?, ?, ?, ?, ?, date('now'))`
        ).run(
          itemId,
          qty,
          Number(cost_price) || 0,
          qty,
          'Opening stock',
          'Initial quantity on create',
        );
      }

      return itemId;
    });

    const itemId = create();
    res.status(201).json(enrichItem(getItem(itemId)));
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    throw err;
  }
});

router.put('/:id', (req, res) => {
  const existing = getItem(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  const {
    sku,
    name,
    category = existing.category,
    unit = existing.unit,
    reorder_level = existing.reorder_level,
    cost_price = existing.cost_price,
    sell_price = existing.sell_price,
    supplier,
    location,
    notes,
    is_active = existing.is_active,
  } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const cat = CATEGORIES.includes(category) ? category : existing.category;

  try {
    db.prepare(
      `UPDATE inventory_items SET
        sku = ?, name = ?, category = ?, unit = ?, reorder_level = ?,
        cost_price = ?, sell_price = ?, supplier = ?, location = ?,
        notes = ?, is_active = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(
      sku?.trim() || null,
      name.trim(),
      cat,
      unit.trim() || 'Pcs',
      Math.max(0, Number(reorder_level) || 0),
      Math.max(0, Number(cost_price) || 0),
      Math.max(0, Number(sell_price) || 0),
      supplier?.trim() || null,
      location?.trim() || null,
      notes?.trim() || null,
      is_active ? 1 : 0,
      req.params.id
    );
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(400).json({ error: 'SKU already exists' });
    }
    throw err;
  }

  res.json(enrichItem(getItem(req.params.id)));
});

router.delete('/:id', (req, res) => {
  const existing = getItem(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Item not found' });

  db.prepare('DELETE FROM inventory_items WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

function applyMovement(itemId, { movement_type, quantity, unit_cost, reference, notes, movement_date, create_expense }) {
  const item = getItem(itemId);
  if (!item) {
    const err = new Error('Item not found');
    err.status = 404;
    throw err;
  }

  const qty = Math.abs(Number(quantity) || 0);
  if (qty <= 0) {
    const err = new Error('Quantity must be greater than zero');
    err.status = 400;
    throw err;
  }

  const type = ['in', 'out', 'adjust'].includes(movement_type)
    ? movement_type
    : null;
  if (!type) {
    const err = new Error('Invalid movement type');
    err.status = 400;
    throw err;
  }

  let nextQty = Number(item.quantity_on_hand) || 0;
  let signedQty = qty;

  if (type === 'in') {
    nextQty += qty;
  } else if (type === 'out') {
    if (qty > nextQty) {
      const err = new Error(
        `Insufficient stock. Available: ${nextQty} ${item.unit}`
      );
      err.status = 400;
      throw err;
    }
    nextQty -= qty;
    signedQty = -qty;
  } else {
    // adjust: quantity is the new absolute balance
    const target = Number(quantity);
    if (Number.isNaN(target) || target < 0) {
      const err = new Error('Adjust quantity must be zero or greater');
      err.status = 400;
      throw err;
    }
    signedQty = target - nextQty;
    nextQty = target;
  }

  const cost =
    unit_cost !== undefined && unit_cost !== null && unit_cost !== ''
      ? Number(unit_cost)
      : Number(item.cost_price) || 0;

  const date = movement_date || new Date().toISOString().slice(0, 10);

  const run = db.transaction(() => {
    db.prepare(
      `UPDATE inventory_items
       SET quantity_on_hand = ?, updated_at = datetime('now')
       WHERE id = ?`
    ).run(nextQty, itemId);

    if (type === 'in' && unit_cost !== undefined && unit_cost !== null && unit_cost !== '') {
      db.prepare(
        `UPDATE inventory_items SET cost_price = ? WHERE id = ?`
      ).run(cost, itemId);
    }

    const result = db
      .prepare(
        `INSERT INTO inventory_movements
         (item_id, movement_type, quantity, unit_cost, balance_after, reference, notes, movement_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        itemId,
        type,
        type === 'adjust' ? signedQty : qty,
        cost,
        nextQty,
        reference?.trim() || null,
        notes?.trim() || null,
        date
      );

    if (create_expense && type === 'in' && qty > 0 && cost > 0) {
      db.prepare(
        `INSERT INTO expenses
         (expense_date, description, category, amount, vendor, payment_method, notes)
         VALUES (?, ?, 'parts', ?, ?, 'cash', ?)`
      ).run(
        date,
        `Stock purchase — ${item.name}`,
        Math.round(qty * cost * 100) / 100,
        item.supplier || null,
        reference || notes || null
      );
    }

    return result.lastInsertRowid;
  });

  const movementId = run();
  const movement = db
    .prepare('SELECT * FROM inventory_movements WHERE id = ?')
    .get(movementId);

  return {
    item: enrichItem(getItem(itemId)),
    movement,
  };
}

router.post('/:id/stock-in', (req, res) => {
  try {
    const result = applyMovement(req.params.id, {
      ...req.body,
      movement_type: 'in',
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/:id/stock-out', (req, res) => {
  try {
    const result = applyMovement(req.params.id, {
      ...req.body,
      movement_type: 'out',
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/:id/adjust', (req, res) => {
  try {
    const result = applyMovement(req.params.id, {
      ...req.body,
      movement_type: 'adjust',
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
