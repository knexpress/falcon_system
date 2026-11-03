import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (_req, res) => {
  const invoiceStats = db
    .prepare(
      `SELECT
         COUNT(*) AS total_invoices,
         SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_invoices,
         SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent_invoices,
         SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) AS overdue_invoices,
         SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS draft_invoices,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) AS paid_amount,
         COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue') THEN total ELSE 0 END), 0) AS outstanding_amount
       FROM invoices`
    )
    .get();

  const salesTotal = db
    .prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM sales')
    .get().total;

  const expensesTotal = db
    .prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses')
    .get().total;

  const monthPrefix = new Date().toISOString().slice(0, 7);

  const monthSales = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM sales WHERE sale_date LIKE ?`
    )
    .get(`${monthPrefix}%`).total;

  const monthExpenses = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM expenses WHERE expense_date LIKE ?`
    )
    .get(`${monthPrefix}%`).total;

  const recentInvoices = db
    .prepare(
      `SELECT i.id, i.invoice_number, i.issue_date, i.status, i.total, c.name AS customer_name
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       ORDER BY i.issue_date DESC, i.id DESC
       LIMIT 5`
    )
    .all();

  const recentExpenses = db
    .prepare(
      `SELECT id, expense_date, description, category, amount
       FROM expenses
       ORDER BY expense_date DESC, id DESC
       LIMIT 5`
    )
    .all();

  const salesByCategory = db
    .prepare(
      `SELECT category, COALESCE(SUM(amount), 0) AS total
       FROM sales GROUP BY category ORDER BY total DESC`
    )
    .all();

  const expensesByCategory = db
    .prepare(
      `SELECT category, COALESCE(SUM(amount), 0) AS total
       FROM expenses GROUP BY category ORDER BY total DESC`
    )
    .all();

  res.json({
    ...invoiceStats,
    sales_total: salesTotal,
    expenses_total: expensesTotal,
    profit: salesTotal - expensesTotal,
    month_sales: monthSales,
    month_expenses: monthExpenses,
    month_profit: monthSales - monthExpenses,
    recent_invoices: recentInvoices,
    recent_expenses: recentExpenses,
    sales_by_category: salesByCategory,
    expenses_by_category: expensesByCategory,
  });
});

export default router;
