# Falcon Garage Finance

Complete invoicing and finance system for a car garage. Manage customer invoices, track sales, and record expenses.

## Structure

```
falcon/
  backend/   Express + SQLite API
  frontend/  React + Vite app
```

## Quick start

### Backend

```bash
cd backend
npm install
npm run seed
npm run dev
```

API runs at `http://localhost:4000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173` and proxies API calls to the backend.

## Features

- **Dashboard** — sales, expenses, profit, outstanding invoices
- **Invoices** — create, edit, delete, vehicle details, line items (labor/parts), tax, statuses
- **Official PDF** — Download PDF fills `Falcon_Revive_Emerald_Invoice_Fillable.pdf` via `invoice_generator.py` (same payload shape as `invoice_example.json`)
- **Customers** — customer records linked to invoices
- **Sales** — income tracking (including paid invoice payments)
- **Expenses** — workshop costs by category (parts, rent, utilities, wages, etc.)

## Invoice PDF

Requires Python + `pypdf` on the machine running the backend:

```bash
python -m pip install pypdf
```

Then use **Download PDF** on any invoice detail page, or:

`GET /api/invoices/:id/pdf`
