import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
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
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const sale = db
    .prepare(
      `SELECT s.*, i.invoice_number
       FROM sales s
       LEFT JOIN invoices i ON i.id = s.invoice_id
       WHERE s.id = ?`
    )
    .get(req.params.id);
  if (!sale) return res.status(404).json({ error: 'Sale not found' });
  res.json(sale);
});

router.post('/', (req, res) => {
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

  const result = db
    .prepare(
      `INSERT INTO sales
       (invoice_id, sale_date, description, category, amount, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      invoice_id || null,
      sale_date,
      description.trim(),
      category,
      Number(amount),
      payment_method,
      notes || null
    );

  const sale = db
    .prepare(
      `SELECT s.*, i.invoice_number
       FROM sales s
       LEFT JOIN invoices i ON i.id = s.invoice_id
       WHERE s.id = ?`
    )
    .get(result.lastInsertRowid);

  res.status(201).json(sale);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM sales WHERE id = ?').get(req.params.id);
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

  db.prepare(
    `UPDATE sales SET
      invoice_id = ?, sale_date = ?, description = ?, category = ?,
      amount = ?, payment_method = ?, notes = ?
     WHERE id = ?`
  ).run(
    invoice_id || null,
    sale_date,
    description.trim(),
    category,
    Number(amount),
    payment_method,
    notes || null,
    req.params.id
  );

  const sale = db
    .prepare(
      `SELECT s.*, i.invoice_number
       FROM sales s
       LEFT JOIN invoices i ON i.id = s.invoice_id
       WHERE s.id = ?`
    )
    .get(req.params.id);

  res.json(sale);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM sales WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Sale not found' });
  }
  res.json({ success: true });
});

export default router;
