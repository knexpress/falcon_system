import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const customers = db
    .prepare('SELECT * FROM customers ORDER BY name COLLATE NOCASE')
    .all();
  res.json(customers);
});

router.get('/:id', (req, res) => {
  const customer = db
    .prepare('SELECT * FROM customers WHERE id = ?')
    .get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  res.json(customer);
});

router.post('/', (req, res) => {
  const { name, email, phone, address, trn } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const result = db
    .prepare(
      `INSERT INTO customers (name, email, phone, address, trn)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      name.trim(),
      email?.trim() || null,
      phone?.trim() || null,
      address?.trim() || null,
      trn?.trim() || null
    );

  const customer = db
    .prepare('SELECT * FROM customers WHERE id = ?')
    .get(result.lastInsertRowid);
  res.status(201).json(customer);
});

router.put('/:id', (req, res) => {
  const existing = db
    .prepare('SELECT * FROM customers WHERE id = ?')
    .get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Customer not found' });

  const { name, email, phone, address, trn } = req.body;
  if (!name?.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  db.prepare(
    `UPDATE customers
     SET name = ?, email = ?, phone = ?, address = ?, trn = ?
     WHERE id = ?`
  ).run(
    name.trim(),
    email?.trim() || null,
    phone?.trim() || null,
    address?.trim() || null,
    trn?.trim() || null,
    req.params.id
  );

  const customer = db
    .prepare('SELECT * FROM customers WHERE id = ?')
    .get(req.params.id);
  res.json(customer);
});

router.delete('/:id', (req, res) => {
  const linked = db
    .prepare('SELECT COUNT(*) AS count FROM invoices WHERE customer_id = ?')
    .get(req.params.id);

  if (linked.count > 0) {
    return res.status(400).json({
      error: 'Cannot delete customer with existing invoices',
    });
  }

  const result = db
    .prepare('DELETE FROM customers WHERE id = ?')
    .run(req.params.id);
  if (result.changes === 0) {
    return res.status(404).json({ error: 'Customer not found' });
  }
  res.json({ success: true });
});

export default router;
