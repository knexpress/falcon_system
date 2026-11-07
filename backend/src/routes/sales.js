import { Router } from 'express';
import { get, all, run } from '../db.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const { from, to, category } = req.query;
    let sql = `
      SELECT s.*, i.invoice_number
      FROM sales s
      LEFT JOIN invoices i ON i.id = s.invoice_id
      WHERE 1=1
    `;
    const params = [];

    if (from) {
      sql += ' AND s.sale_date >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND s.sale_date <= ?';
      params.push(to);
    }
    if (category) {
      sql += ' AND s.category = ?';
      params.push(category);
    }

    sql += ' ORDER BY s.sale_date DESC, s.id DESC';
    res.json(await all(sql, params));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const sale = await get(
      `SELECT s.*, i.invoice_number
       FROM sales s
       LEFT JOIN invoices i ON i.id = s.invoice_id
       WHERE s.id = ?`,
      [req.params.id]
    );
    if (!sale) return res.status(404).json({ error: 'Sale not found' });
    res.json(sale);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const {
      invoice_id,
      sale_date,
      description,
      category = 'service',
      amount,
      payment_method = 'cash',
      notes,
    } = req.body;

    if (!sale_date || !description?.trim()) {
      return res.status(400).json({ error: 'Date and description are required' });
    }
    if (amount === undefined || Number(amount) < 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const result = await run(
      `INSERT INTO sales
       (invoice_id, sale_date, description, category, amount, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        invoice_id || null,
        sale_date,
        description.trim(),
        category,
        Number(amount),
        payment_method,
        notes || null,
      ]
    );

    const sale = await get(
      `SELECT s.*, i.invoice_number
       FROM sales s
       LEFT JOIN invoices i ON i.id = s.invoice_id
       WHERE s.id = ?`,
      [result.lastInsertRowid]
    );

    res.status(201).json(sale);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await get('SELECT * FROM sales WHERE id = ?', [
      req.params.id,
    ]);
    if (!existing) return res.status(404).json({ error: 'Sale not found' });

    const {
      invoice_id,
      sale_date,
      description,
      category = 'service',
      amount,
      payment_method = 'cash',
      notes,
    } = req.body;

    if (!sale_date || !description?.trim()) {
      return res.status(400).json({ error: 'Date and description are required' });
    }
    if (amount === undefined || Number(amount) < 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    await run(
      `UPDATE sales SET
        invoice_id = ?, sale_date = ?, description = ?, category = ?,
        amount = ?, payment_method = ?, notes = ?
       WHERE id = ?`,
      [
        invoice_id || null,
        sale_date,
        description.trim(),
        category,
        Number(amount),
        payment_method,
        notes || null,
        req.params.id,
      ]
    );

    const sale = await get(
      `SELECT s.*, i.invoice_number
       FROM sales s
       LEFT JOIN invoices i ON i.id = s.invoice_id
       WHERE s.id = ?`,
      [req.params.id]
    );

    res.json(sale);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await run('DELETE FROM sales WHERE id = ?', [req.params.id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
