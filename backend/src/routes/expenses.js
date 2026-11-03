import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const { from, to, category } = req.query;
  let sql = 'SELECT * FROM expenses WHERE 1=1';
  const params = [];

  if (from) {
    sql += ' AND expense_date >= ?';
    params.push(from);
  }
  if (to) {
    sql += ' AND expense_date <= ?';
    params.push(to);
  }
  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  sql += ' ORDER BY expense_date DESC, id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const expense = db
    .prepare('SELECT * FROM expenses WHERE id = ?')
    .get(req.params.id);
  if (!expense) return res.status(404).json({ error: 'Expense not found' });
  res.json(expense);
});

router.post('/', (req, res) => {
  const {
    expense_date,
    description,
    category = 'parts',
    amount,
    vendor,
    payment_method = 'cash',
    notes,
  } = req.body;

  if (!expense_date || !description?.trim()) {
    return res.status(400).json({ error: 'Date and description are required' });
  }
  if (amount === undefined || Number(amount) < 0) {
    return res.status(400).json({ error: 'Valid amount is required' });
  }

  const result = db
    .prepare(
      `INSERT INTO expenses
       (expense_date, description, category, amount, vendor, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      expense_date,
      description.trim(),
      category,
      Number(amount),
      vendor?.trim() || null,
      payment_method,
      notes || null
    );

  const expense = db
    .prepare('SELECT * FROM expenses WHERE id = ?')
    .get(result.lastInsertRowid);
  res.status(201).json(expense);
});

router.put('/:id', (req, res) => {
  const existing = db
    .prepare('SELECT * FROM expenses WHERE id = ?')
    .get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Expense not found' });

  const {
    expense_date,
    description,
    category = 'parts',
    amount,
    vendor,
    payment_method = 'cash',
    notes,
  } = req.body;

  if (!expense_date || !description?.trim()) {
    return res.status(400).json({ error: 'Date and description are required' });
  }
  if (amount === undefined || Number(amount) < 0) {
    return res.status(400).json({ error: 'Valid amount is required' });
  }

  db.prepare(
    `UPDATE expenses SET
      expense_date = ?, description = ?, category = ?, amount = ?,
      vendor = ?, payment_method = ?, notes = ?
     WHERE id = ?`
  ).run(
    expense_date,
    description.trim(),
    category,
    Number(amount),
    vendor?.trim() || null,
    payment_method,
    notes || null,
    req.params.id
  );

  const expense = db
    .prepare('SELECT * FROM expenses WHERE id = ?')
    .get(req.params.id);
  res.json(expense);
});

router.delete('/:id', (req, res) => {
  const result = db
    .prepare('DELETE FROM expenses WHERE id = ?')
    .run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Expense not found' });
  }
  res.json({ success: true });
});

export default router;
