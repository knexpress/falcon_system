import { Router } from 'express';
import { get, all, run, withTransaction } from '../db.js';

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

async function getItem(id, client) {
  return get('SELECT * FROM inventory_items WHERE id = ?', [id], client);
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

router.get('/summary', async (_req, res, next) => {
  try {
    const summary = await get(
      `SELECT
         COUNT(*)::int AS total_items,
         SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END)::int AS active_items,
         SUM(CASE WHEN is_active = 1 AND quantity_on_hand <= reorder_level THEN 1 ELSE 0 END)::int AS low_stock_count,
         COALESCE(SUM(CASE WHEN is_active = 1 THEN quantity_on_hand * cost_price ELSE 0 END), 0)::float AS stock_value
       FROM inventory_items`
    );

    const byCategory = await all(
      `SELECT category, COUNT(*)::int AS count,
              COALESCE(SUM(quantity_on_hand * cost_price), 0)::float AS value
       FROM inventory_items
       WHERE is_active = 1
       GROUP BY category
       ORDER BY value DESC`
    );

    const lowStock = (
      await all(
        `SELECT * FROM inventory_items
         WHERE is_active = 1 AND quantity_on_hand <= reorder_level
         ORDER BY quantity_on_hand ASC, LOWER(name)
         LIMIT 10`
      )
    ).map(enrichItem);

    res.json({
      ...summary,
      stock_value: Math.round((summary.stock_value || 0) * 100) / 100,
      by_category: byCategory,
      low_stock: lowStock,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/movements', async (req, res, next) => {
  try {
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

    res.json(await all(sql, params));
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
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
        name ILIKE ? OR sku ILIKE ? OR supplier ILIKE ? OR location ILIKE ?
      )`;
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    if (low_stock === '1') {
      sql += ' AND quantity_on_hand <= reorder_level';
    }

    sql += ' ORDER BY LOWER(name)';
    res.json((await all(sql, params)).map(enrichItem));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const item = await getItem(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });

    const movements = await all(
      `SELECT * FROM inventory_movements
       WHERE item_id = ?
       ORDER BY movement_date DESC, id DESC
       LIMIT 50`,
      [req.params.id]
    );

    res.json({ ...enrichItem(item), movements });
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
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
      const itemId = await withTransaction(async (client) => {
        const result = await run(
          `INSERT INTO inventory_items (
            sku, name, category, unit, quantity_on_hand, reorder_level,
            cost_price, sell_price, supplier, location, notes, is_active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
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
            is_active ? 1 : 0,
          ],
          client
        );

        const id = result.lastInsertRowid;

        if (qty > 0) {
          await run(
            `INSERT INTO inventory_movements
             (item_id, movement_type, quantity, unit_cost, balance_after, reference, notes, movement_date)
             VALUES (?, 'in', ?, ?, ?, ?, ?, CURRENT_DATE)`,
            [
              id,
              qty,
              Number(cost_price) || 0,
              qty,
              'Opening stock',
              'Initial quantity on create',
            ],
            client
          );
        }

        return id;
      });

      res.status(201).json(enrichItem(await getItem(itemId)));
    } catch (err) {
      if (String(err.message).includes('unique') || err.code === '23505') {
        return res.status(400).json({ error: 'SKU already exists' });
      }
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await getItem(req.params.id);
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
      await run(
        `UPDATE inventory_items SET
          sku = ?, name = ?, category = ?, unit = ?, reorder_level = ?,
          cost_price = ?, sell_price = ?, supplier = ?, location = ?,
          notes = ?, is_active = ?, updated_at = NOW()
         WHERE id = ?`,
        [
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
          req.params.id,
        ]
      );
    } catch (err) {
      if (String(err.message).includes('unique') || err.code === '23505') {
        return res.status(400).json({ error: 'SKU already exists' });
      }
      throw err;
    }

    res.json(enrichItem(await getItem(req.params.id)));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = await getItem(req.params.id);
    if (!existing) return res.status(404).json({ error: 'Item not found' });

    await run('DELETE FROM inventory_items WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

async function applyMovement(
  itemId,
  {
    movement_type,
    quantity,
    unit_cost,
    unit_price,
    reference,
    notes,
    movement_date,
    create_expense,
    create_sale,
    payment_method = 'cash',
  }
) {
  const item = await getItem(itemId);
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

  const sellPrice =
    unit_price !== undefined && unit_price !== null && unit_price !== ''
      ? Number(unit_price)
      : Number(item.sell_price) || 0;

  const date = movement_date || new Date().toISOString().slice(0, 10);

  const { movementId, saleId } = await withTransaction(async (client) => {
    await run(
      `UPDATE inventory_items
       SET quantity_on_hand = ?, updated_at = NOW()
       WHERE id = ?`,
      [nextQty, itemId],
      client
    );

    if (
      type === 'in' &&
      unit_cost !== undefined &&
      unit_cost !== null &&
      unit_cost !== ''
    ) {
      await run(
        `UPDATE inventory_items SET cost_price = ? WHERE id = ?`,
        [cost, itemId],
        client
      );
    }

    const moveRef =
      reference?.trim() ||
      (create_sale && type === 'out' ? 'Inventory sale' : null);

    const result = await run(
      `INSERT INTO inventory_movements
       (item_id, movement_type, quantity, unit_cost, balance_after, reference, notes, movement_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itemId,
        type,
        type === 'adjust' ? signedQty : qty,
        cost,
        nextQty,
        moveRef,
        notes?.trim() || null,
        date,
      ],
      client
    );

    if (create_expense && type === 'in' && qty > 0 && cost > 0) {
      await run(
        `INSERT INTO expenses
         (expense_date, description, category, amount, vendor, payment_method, notes)
         VALUES (?, ?, 'parts', ?, ?, 'cash', ?)`,
        [
          date,
          `Stock purchase — ${item.name}`,
          Math.round(qty * cost * 100) / 100,
          item.supplier || null,
          reference || notes || null,
        ],
        client
      );
    }

    let newSaleId = null;
    if (create_sale && type === 'out' && qty > 0) {
      if (sellPrice < 0 || Number.isNaN(sellPrice)) {
        const err = new Error('Valid sell price is required');
        err.status = 400;
        throw err;
      }
      const amount = Math.round(qty * sellPrice * 100) / 100;
      const saleResult = await run(
        `INSERT INTO sales
         (invoice_id, sale_date, description, category, amount, payment_method, notes)
         VALUES (NULL, ?, ?, 'parts', ?, ?, ?)`,
        [
          date,
          `Inventory sale — ${item.name} × ${qty} ${item.unit}`,
          amount,
          payment_method || 'cash',
          [
            item.sku ? `SKU ${item.sku}` : null,
            `@ AED ${sellPrice}`,
            notes?.trim() || null,
          ]
            .filter(Boolean)
            .join(' · ') || null,
        ],
        client
      );
      newSaleId = saleResult.lastInsertRowid;
    }

    return { movementId: result.lastInsertRowid, saleId: newSaleId };
  });

  const movement = await get(
    'SELECT * FROM inventory_movements WHERE id = ?',
    [movementId]
  );

  const sale = saleId
    ? await get('SELECT * FROM sales WHERE id = ?', [saleId])
    : null;

  return {
    item: enrichItem(await getItem(itemId)),
    movement,
    sale,
  };
}

router.post('/:id/stock-in', async (req, res) => {
  try {
    const result = await applyMovement(req.params.id, {
      ...req.body,
      movement_type: 'in',
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/:id/stock-out', async (req, res) => {
  try {
    const result = await applyMovement(req.params.id, {
      ...req.body,
      movement_type: 'out',
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

router.post('/:id/adjust', async (req, res) => {
  try {
    const result = await applyMovement(req.params.id, {
      ...req.body,
      movement_type: 'adjust',
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

export default router;
