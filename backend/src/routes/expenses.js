import { Router } from 'express';
import { get, all, run } from '../db.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
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
    res.json(await all(sql, params));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const expense = await get('SELECT * FROM expenses WHERE id = ?', [
      req.params.id,
    ]);
    if (!expense) return res.status(404).json({ error: 'Expense not found' });
    res.json(expense);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
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

    const result = await run(
      `INSERT INTO expenses
       (expense_date, description, category, amount, vendor, payment_method, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        expense_date,
        description.trim(),
        category,
        Number(amount),
        vendor?.trim() || null,
        payment_method,
        notes || null,
      ]
    );

    const expense = await get('SELECT * FROM expenses WHERE id = ?', [
      result.lastInsertRowid,
    ]);
    res.status(201).json(expense);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await get('SELECT * FROM expenses WHERE id = ?', [
      req.params.id,
    ]);
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

    await run(
      `UPDATE expenses SET
        expense_date = ?, description = ?, category = ?, amount = ?,
        vendor = ?, payment_method = ?, notes = ?
       WHERE id = ?`,
      [
        expense_date,
        description.trim(),
        category,
        Number(amount),
        vendor?.trim() || null,
        payment_method,
        notes || null,
        req.params.id,
      ]
    );

    const expense = await get('SELECT * FROM expenses WHERE id = ?', [
      req.params.id,
    ]);
    res.json(expense);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const result = await run('DELETE FROM expenses WHERE id = ?', [
      req.params.id,
    ]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
