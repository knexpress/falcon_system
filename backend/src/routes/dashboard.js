import { Router } from 'express';
import { get, all } from '../db.js';

const router = Router();

router.get('/', async (_req, res, next) => {
  try {
    const invoiceStats = await get(
      `SELECT
         COUNT(*)::int AS total_invoices,
         SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END)::int AS paid_invoices,
         SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END)::int AS sent_invoices,
         SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END)::int AS overdue_invoices,
         SUM(CASE WHEN status = 'draft' THEN 1 ELSE 0 END)::int AS draft_invoices,
         SUM(CASE WHEN status = 'pending_approval' AND doc_type = 'quotation' THEN 1 ELSE 0 END)::int AS pending_approvals,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0)::float AS paid_amount,
         COALESCE(SUM(CASE WHEN status IN ('sent', 'overdue') THEN total ELSE 0 END), 0)::float AS outstanding_amount
       FROM invoices`
    );

    const invoiceIncome = Number(
      (
        await get(
          `SELECT COALESCE(SUM(total), 0)::float AS total
           FROM invoices WHERE status = 'paid'`
        )
      ).total
    );

    const otherSales = Number(
      (
        await get(
          `SELECT COALESCE(SUM(amount), 0)::float AS total
           FROM sales WHERE invoice_id IS NULL`
        )
      ).total
    );

    const salesTotal = invoiceIncome + otherSales;

    const expensesTotal = Number(
      (
        await get(
          'SELECT COALESCE(SUM(amount), 0)::float AS total FROM expenses'
        )
      ).total
    );

    const monthPrefix = new Date().toISOString().slice(0, 7);

    const monthInvoiceIncome = Number(
      (
        await get(
          `SELECT COALESCE(SUM(total), 0)::float AS total
           FROM invoices
           WHERE status = 'paid' AND issue_date LIKE ?`,
          [`${monthPrefix}%`]
        )
      ).total
    );

    const monthOtherSales = Number(
      (
        await get(
          `SELECT COALESCE(SUM(amount), 0)::float AS total
           FROM sales
           WHERE invoice_id IS NULL AND sale_date LIKE ?`,
          [`${monthPrefix}%`]
        )
      ).total
    );

    const monthSales = monthInvoiceIncome + monthOtherSales;

    const monthExpenses = Number(
      (
        await get(
          `SELECT COALESCE(SUM(amount), 0)::float AS total
           FROM expenses WHERE expense_date LIKE ?`,
          [`${monthPrefix}%`]
        )
      ).total
    );

    const recentInvoices = await all(
      `SELECT i.id, i.invoice_number, i.issue_date, i.status, i.total, c.name AS customer_name
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       ORDER BY i.issue_date DESC, i.id DESC
       LIMIT 5`
    );

    const recentExpenses = await all(
      `SELECT id, expense_date, description, category, amount
       FROM expenses
       ORDER BY expense_date DESC, id DESC
       LIMIT 5`
    );

    const salesByCategory = await all(
      `SELECT category, COALESCE(SUM(amount), 0)::float AS total
       FROM sales GROUP BY category ORDER BY total DESC`
    );

    const expensesByCategory = await all(
      `SELECT category, COALESCE(SUM(amount), 0)::float AS total
       FROM expenses GROUP BY category ORDER BY total DESC`
    );

    const inventorySummary = await get(
      `SELECT
         COUNT(*)::int AS inventory_items,
         SUM(CASE WHEN is_active = 1 AND quantity_on_hand <= reorder_level THEN 1 ELSE 0 END)::int AS low_stock_count,
         COALESCE(SUM(CASE WHEN is_active = 1 THEN quantity_on_hand * cost_price ELSE 0 END), 0)::float AS stock_value
       FROM inventory_items`
    );

    const lowStockItems = await all(
      `SELECT id, sku, name, quantity_on_hand, reorder_level, unit
       FROM inventory_items
       WHERE is_active = 1 AND quantity_on_hand <= reorder_level
       ORDER BY quantity_on_hand ASC
       LIMIT 5`
    );

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
  } catch (err) {
    next(err);
  }
});

export default router;
