import { Navigate, Route, Routes } from 'react-router-dom';
import AppShell from './components/AppShell.jsx';
import HttpNotifyHost from './components/HttpNotifyHost.jsx';
import LoadingOverlay from './components/LoadingOverlay.jsx';
import RequireAuth from './components/RequireAuth.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import PrivacyPolicy from './pages/PrivacyPolicy.jsx';
import Terms from './pages/Terms.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Invoices from './pages/Invoices.jsx';
import InvoiceForm from './pages/InvoiceForm.jsx';
import InvoiceDetail from './pages/InvoiceDetail.jsx';
import Customers from './pages/Customers.jsx';
import Sales from './pages/Sales.jsx';
import Expenses from './pages/Expenses.jsx';
import Journal from './pages/Journal.jsx';
import JournalEntry from './pages/JournalEntry.jsx';
import Inventory from './pages/Inventory.jsx';
import Vehicles from './pages/Vehicles.jsx';
import VehicleDetail from './pages/VehicleDetail.jsx';
import Errors from './pages/Errors.jsx';
import Quotations from './pages/Quotations.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  return (
    <>
      <LoadingOverlay />
      <HttpNotifyHost />
      <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/privacy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/404" element={<NotFound />} />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="approvals" element={<Navigate to="/app/quotations" replace />} />
        <Route path="quotations" element={<Quotations />} />
        <Route
          path="quotations/new"
          element={<InvoiceForm forceDocType="quotation" />}
        />
        <Route path="quotations/:id" element={<InvoiceDetail />} />
        <Route
          path="quotations/:id/edit"
          element={<InvoiceForm forceDocType="quotation" />}
        />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/new" element={<InvoiceForm />} />
        <Route path="invoices/:id" element={<InvoiceDetail />} />
        <Route path="invoices/:id/edit" element={<InvoiceForm />} />
        <Route path="vehicles" element={<Vehicles />} />
        <Route path="vehicles/:id" element={<VehicleDetail />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="customers" element={<Customers />} />
        <Route path="sales" element={<Sales />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="journal" element={<Journal />} />
        <Route path="journal/:type/:id" element={<JournalEntry />} />
        <Route path="errors" element={<Errors />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}
