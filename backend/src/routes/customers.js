import { Router } from 'express';
import { get, all, run } from '../db.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const customers = await all(
      'SELECT * FROM customers ORDER BY LOWER(name)'
    );
    res.json(customers);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const customer = await get('SELECT * FROM customers WHERE id = ?', [
      req.params.id,
    ]);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { name, email, phone, address, trn } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await run(
      `INSERT INTO customers (name, email, phone, address, trn)
       VALUES (?, ?, ?, ?, ?)`,
      [
        name.trim(),
        email?.trim() || null,
        phone?.trim() || null,
        address?.trim() || null,
        trn?.trim() || null,
      ]
    );

    const customer = await get('SELECT * FROM customers WHERE id = ?', [
      result.lastInsertRowid,
    ]);
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = await get('SELECT * FROM customers WHERE id = ?', [
      req.params.id,
    ]);
    if (!existing) return res.status(404).json({ error: 'Customer not found' });

    const { name, email, phone, address, trn } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    await run(
      `UPDATE customers
       SET name = ?, email = ?, phone = ?, address = ?, trn = ?
       WHERE id = ?`,
      [
        name.trim(),
        email?.trim() || null,
        phone?.trim() || null,
        address?.trim() || null,
        trn?.trim() || null,
        req.params.id,
      ]
    );

    const customer = await get('SELECT * FROM customers WHERE id = ?', [
      req.params.id,
    ]);
    res.json(customer);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const linked = await get(
      'SELECT COUNT(*)::int AS count FROM invoices WHERE customer_id = ?',
      [req.params.id]
    );

    if (linked.count > 0) {
      return res.status(400).json({
        error: 'Cannot delete customer with existing invoices',
      });
    }

    const result = await run('DELETE FROM customers WHERE id = ?', [
      req.params.id,
    ]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
