import express from 'express';
import cors from 'cors';
import customersRouter from './routes/customers.js';
import invoicesRouter from './routes/invoices.js';
import salesRouter from './routes/sales.js';
import expensesRouter from './routes/expenses.js';
import dashboardRouter from './routes/dashboard.js';
import './db.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'garage-finance-api' });
});

app.use('/api/customers', customersRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/sales', salesRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/dashboard', dashboardRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Garage Finance API running on http://localhost:${PORT}`);
});
