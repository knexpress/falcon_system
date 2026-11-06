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

  // Income = paid invoices + walk-in/manual sales (not linked to an invoice)
  const invoiceIncome = db
    .prepare(
      `SELECT COALESCE(SUM(total), 0) AS total
       FROM invoices WHERE status = 'paid'`
    )
    .get().total;

  const otherSales = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM sales WHERE invoice_id IS NULL`
    )
    .get().total;

  const salesTotal = invoiceIncome + otherSales;

  const expensesTotal = db
    .prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses')
    .get().total;

  const monthPrefix = new Date().toISOString().slice(0, 7);

  const monthInvoiceIncome = db
    .prepare(
      `SELECT COALESCE(SUM(total), 0) AS total
       FROM invoices
       WHERE status = 'paid' AND issue_date LIKE ?`
    )
    .get(`${monthPrefix}%`).total;

  const monthOtherSales = db
    .prepare(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM sales
       WHERE invoice_id IS NULL AND sale_date LIKE ?`
    )
    .get(`${monthPrefix}%`).total;

  const monthSales = monthInvoiceIncome + monthOtherSales;

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

  const inventorySummary = db
    .prepare(
      `SELECT
         COUNT(*) AS inventory_items,
         SUM(CASE WHEN is_active = 1 AND quantity_on_hand <= reorder_level THEN 1 ELSE 0 END) AS low_stock_count,
         COALESCE(SUM(CASE WHEN is_active = 1 THEN quantity_on_hand * cost_price ELSE 0 END), 0) AS stock_value
       FROM inventory_items`
    )
    .get();

  const lowStockItems = db
    .prepare(
      `SELECT id, sku, name, quantity_on_hand, reorder_level, unit
       FROM inventory_items
       WHERE is_active = 1 AND quantity_on_hand <= reorder_level
       ORDER BY quantity_on_hand ASC
       LIMIT 5`
    )
    .all();

  res.json({
    ...invoiceStats,
    invoice_income: invoiceIncome,
    other_sales: otherSales,
    sales_total: salesTotal,
    income_total: salesTotal,
    expenses_total: expensesTotal,
    profit: salesTotal - expensesTotal,
    month_invoice_income: monthInvoiceIncome,
    month_other_sales: monthOtherSales,
    month_sales: monthSales,
    month_income: monthSales,
    month_expenses: monthExpenses,
    month_profit: monthSales - monthExpenses,
    recent_invoices: recentInvoices,
    recent_expenses: recentExpenses,
    sales_by_category: salesByCategory,
    expenses_by_category: expensesByCategory,
    inventory_items: inventorySummary.inventory_items || 0,
    low_stock_count: inventorySummary.low_stock_count || 0,
    stock_value: Math.round((inventorySummary.stock_value || 0) * 100) / 100,
    low_stock_items: lowStockItems,
  });
});

export default router;
