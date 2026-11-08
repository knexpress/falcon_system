import { Router } from 'express';
import { all } from '../db.js';

const router = Router();

/**
 * Unified workshop journal:
 * - Quotations → draft lines (not tallied)
 * - Invoices / credit notes / debit notes → posted
 *   (paid invoices & debit notes credit; credit notes debit)
 * - Manual sales → posted income
 * - Expenses → posted outflow
 */
router.get('/', async (req, res, next) => {
  try {
    const { from, to, type } = req.query;

    const invoices = await all(
      `SELECT i.id, i.invoice_number, i.issue_date, i.status, i.total, i.notes,
              i.doc_type, i.journal_status, c.name AS customer_name
       FROM invoices i
       JOIN customers c ON c.id = i.customer_id
       ORDER BY i.issue_date ASC, i.id ASC`
    );

    const sales = await all(
      `SELECT s.id, s.invoice_id, s.sale_date, s.description, s.category,
              s.amount, s.payment_method, s.notes, i.invoice_number
       FROM sales s
       LEFT JOIN invoices i ON i.id = s.invoice_id
       ORDER BY s.sale_date ASC, s.id ASC`
    );

    const expenses = await all(
      `SELECT id, expense_date, description, category, amount, vendor,
              payment_method, notes
       FROM expenses
       ORDER BY expense_date ASC, id ASC`
    );

    const entries = [];

    for (const inv of invoices) {
      const isQuote = inv.doc_type === 'quotation';
      const isCreditNote = inv.status === 'credit_note';
      const isDebitNote = inv.status === 'debit_note';
      const isPaid = inv.status === 'paid';
      const amount = Number(inv.total) || 0;
      const journalStatus =
        inv.journal_status || (isQuote ? 'draft' : 'posted');

      let debit = 0;
      let credit = 0;
      if (isQuote) {
        // Draft preview amounts (not tallied)
        credit = amount;
      } else if (isCreditNote) {
        debit = amount;
      } else if (isDebitNote || isPaid) {
        credit = amount;
      } else if (journalStatus === 'posted') {
        // Posted invoice not yet paid — show as posted memo with zero tally impact
        credit = 0;
      }

      const entryType = isQuote
        ? 'quotation'
        : isCreditNote
          ? 'credit_note'
          : isDebitNote
            ? 'debit_note'
            : 'invoice';

      entries.push({
        id: `${isQuote ? 'quotation' : 'invoice'}-${inv.id}`,
        date: inv.issue_date,
        entry_type: entryType,
        reference: inv.invoice_number,
        description: isQuote
          ? `Quotation — ${inv.customer_name}`
          : isCreditNote
            ? `Credit note — ${inv.customer_name}`
            : isDebitNote
              ? `Debit note — ${inv.customer_name}`
              : `Invoice — ${inv.customer_name}`,
        category: isQuote
          ? inv.status
          : isCreditNote
            ? 'credit_note'
            : isDebitNote
              ? 'debit_note'
              : inv.status,
        customer_name: inv.customer_name,
        debit,
        credit,
        amount,
        status: inv.status,
        posting_status: journalStatus,
        source: isQuote ? 'quotation' : 'invoice',
        source_id: inv.id,
        link: `/app/journal/${entryType}/${inv.id}`,
        notes: inv.notes || null,
        include_in_tally: !isQuote && (isCreditNote || isDebitNote || isPaid),
      });
    }

    for (const sale of sales) {
      if (sale.invoice_id) continue;

      const amount = Number(sale.amount) || 0;
      entries.push({
        id: `sale-${sale.id}`,
        date: sale.sale_date,
        entry_type: 'sale',
        reference: sale.invoice_number || `SALE-${sale.id}`,
        description: sale.description,
        category: sale.category || 'service',
        customer_name: null,
        debit: 0,
        credit: amount,
        amount,
        status: sale.payment_method || 'cash',
        posting_status: 'posted',
        source: 'sale',
        source_id: sale.id,
        link: `/app/journal/sale/${sale.id}`,
        notes: sale.notes || null,
        include_in_tally: true,
      });
    }

    for (const expense of expenses) {
      const amount = Number(expense.amount) || 0;
      entries.push({
        id: `expense-${expense.id}`,
        date: expense.expense_date,
        entry_type: 'expense',
        reference: `EXP-${expense.id}`,
        description: expense.description,
        category: expense.category || 'parts',
        customer_name: expense.vendor || null,
        debit: amount,
        credit: 0,
        amount,
        status: expense.payment_method || 'cash',
        posting_status: 'posted',
        source: 'expense',
        source_id: expense.id,
        link: `/app/journal/expense/${expense.id}`,
        notes: expense.notes || null,
        include_in_tally: true,
      });
    }

    let filtered = entries;

    if (from) {
      filtered = filtered.filter((e) => e.date >= from);
    }
    if (to) {
      filtered = filtered.filter((e) => e.date <= to);
    }
    if (type) {
      filtered = filtered.filter((e) => e.entry_type === type);
    }

    filtered.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return String(a.id).localeCompare(String(b.id));
    });

    let running = 0;
    const withBalance = filtered.map((entry) => {
      if (entry.include_in_tally) {
        running += Number(entry.credit || 0) - Number(entry.debit || 0);
      }
      return {
        ...entry,
        balance: Math.round(running * 100) / 100,
      };
    });

    const tallyEntries = withBalance.filter((e) => e.include_in_tally);
    const totalDebit = tallyEntries.reduce((s, e) => s + Number(e.debit || 0), 0);
    const totalCredit = tallyEntries.reduce(
      (s, e) => s + Number(e.credit || 0),
      0
    );

    const byType = {
      quotation: withBalance.filter((e) => e.entry_type === 'quotation').length,
      invoice: withBalance.filter((e) => e.entry_type === 'invoice').length,
      credit_note: withBalance.filter((e) => e.entry_type === 'credit_note')
        .length,
      debit_note: withBalance.filter((e) => e.entry_type === 'debit_note')
        .length,
      sale: withBalance.filter((e) => e.entry_type === 'sale').length,
      expense: withBalance.filter((e) => e.entry_type === 'expense').length,
    };

    res.json({
      entries: withBalance,
      totals: {
        debit: Math.round(totalDebit * 100) / 100,
        credit: Math.round(totalCredit * 100) / 100,
        net: Math.round((totalCredit - totalDebit) * 100) / 100,
        count: withBalance.length,
        drafts: withBalance.filter((e) => e.posting_status === 'draft').length,
        posted: withBalance.filter((e) => e.posting_status === 'posted').length,
        by_type: byType,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
