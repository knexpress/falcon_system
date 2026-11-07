# Falcon Garage Finance

Complete invoicing and finance system for a car garage. Manage customer invoices, track sales, and record expenses.

## Structure

```
falcon/
  backend/   Express + Postgres API
  frontend/  React + Vite app
```

## Quick start (local)

### 1. Cloud / local Postgres

Create a free Postgres DB (Neon, Supabase, or Render Postgres) and copy the connection URL.

```bash
cd backend
cp .env.example .env
# Edit .env and set DATABASE_URL=postgresql://...
npm install
npm run seed   # optional sample data
npm run dev
```

API runs at `http://localhost:4000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173` and proxies API calls to the backend.

## Deploy

### Backend (Render Web Service)

| Setting | Value |
|---------|--------|
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Env `DATABASE_URL` | your Postgres URL |
| Env `CORS_ORIGIN` | your Vercel frontend URL, e.g. `https://falcon.vercel.app` |
| Instance | Free (sleeps when idle) |

### Frontend (Vercel)

| Setting | Value |
|---------|--------|
| Root Directory | `frontend` |
| Build | `npm run build` |
| Output | `dist` |
| Env `VITE_API_URL` | `https://your-backend.onrender.com` |

## Features

- **Dashboard** — sales, expenses, profit, outstanding invoices
- **Invoices** — create, edit, delete, vehicle details, line items (labor/parts), tax, statuses
- **Official PDF** — Download PDF fills template via `invoice_generator.py` (needs Python + `pypdf` on the API host)
- **Customers** — customer records linked to invoices
- **Sales** — income tracking (including paid invoice payments)
- **Expenses** — workshop costs by category
- **Inventory / Vehicles** — stock and vehicle history

## Invoice PDF

Requires Python + `pypdf` on the machine running the backend:

```bash
python -m pip install pypdf
```

Then use **Download PDF** on any invoice detail page, or:

`GET /api/invoices/:id/pdf`
