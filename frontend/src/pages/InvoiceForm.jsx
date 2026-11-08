import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { api, todayISO } from '../api.js';
import { InvoiceDocumentPreview } from '../components/InvoiceDocument.jsx';
import { getAuth } from '../components/RequireAuth.jsx';
import {
  MAIN_SERVICES,
  categoryNeedsVehicle,
  categoryUsesSuvSedan,
  getOptionList,
  getVehicleOptions,
  resolvePricing,
} from '../data/pricingCatalog.js';

const emptyItem = () => ({
  description: '',
  item_type: 'service',
  unit: 'Job',
  quantity: 1,
  unit_price: 0,
  vat_rate: 5,
  pricing_category: '',
  pricing_vehicle: '',
  pricing_option: '',
});

export default function InvoiceForm({ forceDocType } = {}) {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const location = useLocation();
  const auth = getAuth();
  const isStaff = auth?.role === 'staff';
  const docType =
    forceDocType ||
    (location.pathname.includes('/quotations') ? 'quotation' : 'invoice');
  const isQuotation = docType === 'quotation';
  const journalReturn = location.state?.journalReturn;
  const backTo =
    journalReturn || (isQuotation ? '/app/quotations' : '/app/invoices');
  const backLabel = journalReturn ? '← Back to journal' : 'Cancel';

  const [customers, setCustomers] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [invoiceNumber, setInvoiceNumber] = useState('·····');
  const [ownerNote, setOwnerNote] = useState('');
  const [docStatus, setDocStatus] = useState('');
  const [form, setForm] = useState({
    customer_id: '',
    customer_name: '',
    customer_trn: '',
    customer_phone: '',
    customer_address: '',
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_plate: '',
    vehicle_vin: '',
    job_order_no: '',
    mileage: '',
    issue_date: todayISO(),
    due_date: '',
    status: 'sent',
    notes: '',
    prepared_by: auth?.name || '',
    authorized_by: '',
    received_by: '',
    tax_rate: 5,
    discount: 0,
    items: [emptyItem(), emptyItem(), emptyItem()],
    create_sale: true,
  });

  useEffect(() => {
    api.getCustomers().then(setCustomers).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    api
      .getInvoice(id)
      .then((inv) => {
        setInvoiceNumber(inv.invoice_number);
        setOwnerNote(inv.approval_note || '');
        setDocStatus(inv.status || '');
        setForm({
          customer_id: String(inv.customer_id),
          customer_name: inv.customer_name || '',
          customer_trn: inv.customer_trn || '',
          customer_phone: inv.customer_phone || '',
          customer_address: inv.customer_address || '',
          vehicle_make: inv.vehicle_make || '',
          vehicle_model: inv.vehicle_model || '',
          vehicle_year: inv.vehicle_year || '',
          vehicle_plate: inv.vehicle_plate || '',
          vehicle_vin: inv.vehicle_vin || '',
          job_order_no: inv.job_order_no || '',
          mileage: inv.mileage || '',
          issue_date: inv.issue_date,
          due_date: inv.due_date || '',
          status: inv.requested_status || 'sent',
          notes: inv.notes || '',
          prepared_by: inv.prepared_by || '',
          authorized_by: inv.authorized_by || '',
          received_by: inv.received_by || '',
          tax_rate: inv.tax_rate ?? 5,
          discount: inv.discount ?? 0,
          items:
            inv.items?.length > 0
              ? inv.items.map((item) => ({
                  description: item.description,
                  item_type: item.item_type,
                  unit: item.unit || 'Job',
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  vat_rate: item.vat_rate ?? 5,
                  pricing_category: 'custom',
                  pricing_vehicle: '',
                  pricing_option: '',
                }))
              : [emptyItem()],
          create_sale: true,
        });
      })
      .catch((err) => setError(err.message));
  }, [id, isEdit]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onCustomerChange(customerId) {
    if (customerId === '__new__') {
      setForm((prev) => ({
        ...prev,
        customer_id: '__new__',
        customer_name: '',
        customer_trn: '',
        customer_phone: '',
        customer_address: '',
      }));
      return;
    }

    const customer = customers.find((c) => String(c.id) === String(customerId));
    setForm((prev) => ({
      ...prev,
      customer_id: customerId,
      customer_name: customer?.name || '',
      customer_trn: customer?.trn || '',
      customer_phone: customer?.phone || '',
      customer_address: customer?.address || '',
    }));
  }

  async function ensureCustomerId() {
    if (form.customer_id && form.customer_id !== '__new__') {
      return Number(form.customer_id);
    }

    const name = form.customer_name.trim();
    if (!name) {
      throw new Error('Enter the new customer name.');
    }

    const created = await api.createCustomer({
      name,
      phone: form.customer_phone || null,
      address: form.customer_address || null,
      trn: form.customer_trn || null,
    });

    setCustomers((prev) =>
      [...prev, created].sort((a, b) =>
        String(a.name).localeCompare(String(b.name))
      )
    );
    setForm((prev) => ({
      ...prev,
      customer_id: String(created.id),
      customer_name: created.name,
    }));

    return created.id;
  }

  function updateItem(index, key, value) {
    setForm((prev) => {
      const items = prev.items.map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      );
      return { ...prev, items };
    });
  }

  function applyPricing(index, patch) {
    setForm((prev) => {
      const items = prev.items.map((item, i) => {
        if (i !== index) return item;
        const next = { ...item, ...patch };
        const resolved = resolvePricing(
          next.pricing_category,
          next.pricing_vehicle,
          next.pricing_option
        );
        if (resolved) {
          next.description = resolved.description;
          next.unit_price = resolved.unit_price;
          next.unit = resolved.unit;
        }
        return next;
      });
      return { ...prev, items };
    });
  }

  function onPricingCategory(index, categoryId) {
    applyPricing(index, {
      pricing_category: categoryId,
      pricing_vehicle: '',
      pricing_option: '',
      description: categoryId === 'custom' ? '' : '',
      unit_price: categoryId === 'custom' ? 0 : 0,
    });
  }

  function onPricingVehicle(index, vehicleId) {
    const item = form.items[index];
    // Body package: vehicle IS the option
    if (item.pricing_category === 'body_package') {
      applyPricing(index, {
        pricing_vehicle: vehicleId,
        pricing_option: vehicleId,
      });
      return;
    }
    applyPricing(index, {
      pricing_vehicle: vehicleId,
      pricing_option: '',
    });
  }

  function onPricingOption(index, optionId) {
    applyPricing(index, { pricing_option: optionId });
  }

  function addItem() {
    if (form.items.length >= 14) return;
    setForm((prev) => ({ ...prev, items: [...prev.items, emptyItem()] }));
  }

  function removeItem(index) {
    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const customerId = await ensureCustomerId();
      const payload = {
        ...form,
        doc_type: docType,
        customer_id: customerId,
        tax_rate: Number(form.tax_rate) || 5,
        discount: Number(form.discount) || 0,
        items: form.items
          .filter((item) => item.description.trim())
          .map((item) => ({
            ...item,
            quantity: Number(item.quantity) || 0,
            unit_price: Number(item.unit_price) || 0,
            vat_rate: Number(item.vat_rate) || 0,
          })),
      };

      const saved = isEdit
        ? await api.updateInvoice(id, payload)
        : await api.createInvoice(payload);
      navigate(
        isQuotation
          ? `/app/quotations/${saved.id}`
          : `/app/invoices/${saved.id}`
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <header className="page-header">
        <div>
          <h1>
            {isEdit
              ? isQuotation
                ? 'Edit quotation'
                : 'Edit invoice'
              : isQuotation
                ? 'New quotation'
                : 'New invoice'}
          </h1>
          <p>
            {isQuotation
              ? 'Same workshop fields as an invoice — saved as a quotation for Cedrick’s approval first.'
              : 'Fields map onto the Falcon Revive Tax Invoice template — preview updates as you type.'}
          </p>
        </div>
        <div className="row-actions">
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setShowPreview((v) => !v)}
          >
            {showPreview ? 'Hide preview' : 'Show preview'}
          </button>
          <Link className="btn btn-ghost" to={backTo}>
            {backLabel}
          </Link>
        </div>
      </header>

      <div className={showPreview ? 'invoice-workbench' : ''}>
        <form className="panel" onSubmit={handleSubmit}>
          {error && <div className="error-banner">{error}</div>}
          {isQuotation && docStatus === 'changes_requested' && ownerNote && (
            <div className="error-banner">
              <strong>Cedrick asked for changes:</strong> {ownerNote}
              <br />
              Edit the quotation and save — it will go back to Approvals.
            </div>
          )}
          {isQuotation && docStatus !== 'changes_requested' && (
            <div
              className="success-banner"
              style={{
                background: 'var(--warn-bg)',
                color: 'var(--warn)',
                borderColor: 'rgba(183, 121, 31, 0.35)',
              }}
            >
              This quotation will wait in Approvals for Cedrick. After he
              approves it, use <strong>Generate invoice</strong> on the Invoices
              page. A draft journal line is created now; it posts when the
              invoice is generated.
            </div>
          )}

          <h2 className="form-section-title">Customer details</h2>
          <div className="form-grid">
            <div className="field span-2">
              <label>Customer *</label>
              <select
                className="select"
                required
                value={form.customer_id}
                onChange={(e) => onCustomerChange(e.target.value)}
              >
                <option value="">Select customer</option>
                <option value="__new__">+ Add new customer…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {form.customer_id === '__new__' && (
              <div className="field span-2">
                <label>New customer name *</label>
                <input
                  className="input"
                  required
                  placeholder="Type customer name"
                  value={form.customer_name}
                  onChange={(e) => updateField('customer_name', e.target.value)}
                />
                <p className="muted" style={{ margin: '6px 0 0' }}>
                  Saving this invoice will also save the customer in Customers.
                </p>
              </div>
            )}
            <div className="field">
              <label>TRN / ID No.</label>
              <input
                className="input"
                value={form.customer_trn}
                onChange={(e) => updateField('customer_trn', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Mobile No.</label>
              <input
                className="input"
                value={form.customer_phone}
                onChange={(e) => updateField('customer_phone', e.target.value)}
              />
            </div>
            <div className="field span-2">
              <label>Address</label>
              <input
                className="input"
                value={form.customer_address}
                onChange={(e) => updateField('customer_address', e.target.value)}
              />
            </div>
          </div>

          <h2 className="form-section-title">Invoice details</h2>
          <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>
            Vehicle details are saved automatically to Vehicles (matched by plate
            / VIN) with full service history.
          </p>
          <div className="form-grid three">
            <div className="field">
              <label>Date *</label>
              <input
                className="input"
                type="date"
                required
                value={form.issue_date}
                onChange={(e) => updateField('issue_date', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Job Order No.</label>
              <input
                className="input"
                value={form.job_order_no}
                onChange={(e) => updateField('job_order_no', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Status</label>
              <select
                className="select"
                value={form.status}
                onChange={(e) => updateField('status', e.target.value)}
              >
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="cancelled">Cancelled</option>
                <option value="credit_note">Credit note</option>
                <option value="debit_note">Debit note</option>
              </select>
            </div>
            <div className="field">
              <label>Vehicle Make</label>
              <input
                className="input"
                value={form.vehicle_make}
                onChange={(e) => updateField('vehicle_make', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Model</label>
              <input
                className="input"
                value={form.vehicle_model}
                onChange={(e) => updateField('vehicle_model', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Year</label>
              <input
                className="input"
                value={form.vehicle_year}
                onChange={(e) => updateField('vehicle_year', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Plate No.</label>
              <input
                className="input"
                value={form.vehicle_plate}
                onChange={(e) => updateField('vehicle_plate', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Mileage</label>
              <input
                className="input"
                value={form.mileage}
                onChange={(e) => updateField('mileage', e.target.value)}
                placeholder="e.g. 45200 km"
              />
            </div>
            <div className="field">
              <label>Prepared By</label>
              <input
                className="input"
                value={form.prepared_by}
                onChange={(e) => updateField('prepared_by', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Authorized Signature</label>
              <input
                className="input"
                value={form.authorized_by}
                onChange={(e) => updateField('authorized_by', e.target.value)}
              />
            </div>
            <div className="field">
              <label>Customer Received By</label>
              <input
                className="input"
                value={form.received_by}
                onChange={(e) => updateField('received_by', e.target.value)}
              />
            </div>
          </div>

          <h2 className="form-section-title">Line items (max 14)</h2>
          <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>
            Pick a service category → vehicle (if needed) → option. Rate fills
            automatically from the Falcon price list.
          </p>
          <div className="items-editor template-items">
            {form.items.map((item, index) => {
              const needsVehicle = categoryNeedsVehicle(item.pricing_category);
              const isBodyPackage = item.pricing_category === 'body_package';
              const isCustom =
                item.pricing_category === 'custom' || !item.pricing_category;
              const vehicleOptions = getVehicleOptions(item.pricing_category);
              const optionList = isBodyPackage
                ? []
                : getOptionList(item.pricing_category);
              const optionLabel =
                item.pricing_category === 'pdr'
                  ? 'Select Dent Size'
                  : item.pricing_category === 'panel_paint'
                    ? 'Select Panel'
                    : 'Select Service';

              return (
                <div className="pricing-item-block" key={index}>
                  <div className="pricing-item-head">
                    <span className="pricing-item-no">#{index + 1}</span>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => removeItem(index)}
                      disabled={form.items.length === 1}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="form-grid three">
                    <div className="field">
                      <label>Main Service</label>
                      <select
                        className="select"
                        value={item.pricing_category}
                        onChange={(e) =>
                          onPricingCategory(index, e.target.value)
                        }
                      >
                        <option value="">Select service…</option>
                        {MAIN_SERVICES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {needsVehicle && (
                      <div className="field">
                        <label>
                          {isBodyPackage || categoryUsesSuvSedan(item.pricing_category)
                            ? 'Vehicle Type'
                            : 'Vehicle Type'}
                        </label>
                        <select
                          className="select"
                          value={item.pricing_vehicle}
                          onChange={(e) =>
                            onPricingVehicle(index, e.target.value)
                          }
                        >
                          <option value="">Select vehicle…</option>
                          {vehicleOptions.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.label}
                              {v.price != null ? ` — ${v.price} AED` : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {!isBodyPackage &&
                      item.pricing_category &&
                      item.pricing_category !== 'custom' && (
                        <div className="field">
                          <label>{optionLabel}</label>
                          <select
                            className="select"
                            value={item.pricing_option}
                            onChange={(e) =>
                              onPricingOption(index, e.target.value)
                            }
                            disabled={
                              needsVehicle &&
                              !isBodyPackage &&
                              !item.pricing_vehicle
                            }
                          >
                            <option value="">Select…</option>
                            {optionList.map((o) => {
                              let priceHint = '';
                              if (o.price != null) priceHint = ` — ${o.price} AED`;
                              else if (item.pricing_vehicle === 'sedan' && o.sedan != null)
                                priceHint = ` — ${o.sedan} AED`;
                              else if (item.pricing_vehicle === 'suv' && o.suv != null)
                                priceHint = ` — ${o.suv} AED`;
                              else if (o.suv != null)
                                priceHint = ` — SUV ${o.suv} / Sedan ${o.sedan}`;
                              return (
                                <option key={o.id} value={o.id}>
                                  {o.label}
                                  {priceHint}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      )}
                  </div>

                  <div className="item-row pricing-item-row">
                    <div className="field span-desc">
                      <label>Description</label>
                      <input
                        className="input"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, 'description', e.target.value)
                        }
                        placeholder={
                          isCustom
                            ? 'Type custom description'
                            : 'Auto-filled from price list'
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Unit</label>
                      <input
                        className="input"
                        value={item.unit}
                        onChange={(e) =>
                          updateItem(index, 'unit', e.target.value)
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Qty</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, 'quantity', e.target.value)
                        }
                      />
                    </div>
                    <div className="field">
                      <label>Rate (AED)</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) =>
                          updateItem(index, 'unit_price', e.target.value)
                        }
                      />
                    </div>
                    <div className="field">
                      <label>VAT %</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.vat_rate}
                        onChange={(e) =>
                          updateItem(index, 'vat_rate', e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="toolbar" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={addItem}
              disabled={form.items.length >= 14}
            >
              Add line
            </button>
          </div>

          <div className="form-grid three" style={{ marginTop: 16 }}>
            <div className="field">
              <label>Discount (AED)</label>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.discount}
                onChange={(e) => updateField('discount', e.target.value)}
              />
            </div>
            <div className="field span-2">
              <label>Notes / ملاحظات</label>
              <textarea
                className="textarea"
                value={form.notes}
                onChange={(e) => updateField('notes', e.target.value)}
              />
            </div>
          </div>

          <p className="muted" style={{ marginTop: 12 }}>
            When status is <strong>Paid</strong>, this invoice is automatically
            counted in Sales / Income.
          </p>

          <div className="modal-actions">
            <button className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Update invoice' : 'Create invoice'}
            </button>
          </div>
        </form>

        {showPreview && (
          <aside className="invoice-preview-pane panel">
            <div className="preview-sticky">
              <h2 className="form-section-title" style={{ marginTop: 0 }}>
                Live template preview
              </h2>
              <InvoiceDocumentPreview
                form={form}
                customers={customers}
                invoiceNumber={invoiceNumber}
              />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
