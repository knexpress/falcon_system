function money(value) {
  return (Number(value) || 0).toFixed(2);
}

/** Map a DB invoice record to the invoice_generator.py / invoice_example.json payload. */
export function invoiceToPayload(invoice) {
  const modelYear =
    [invoice.vehicle_model, invoice.vehicle_year].filter(Boolean).join(' / ') ||
    '';

  return {
    customer: {
      name: invoice.customer_name || '',
      trn_id: invoice.customer_trn || '',
      mobile: invoice.customer_phone || '',
      address: invoice.customer_address || '',
    },
    invoice: {
      number: invoice.invoice_number || '',
      date: invoice.issue_date || '',
      job_order_number: invoice.job_order_no || '',
      vehicle: {
        make: invoice.vehicle_make || '',
        model_year: modelYear,
        plate_number: invoice.vehicle_plate || '',
        mileage: invoice.mileage || '',
      },
    },
    items: (invoice.items || []).slice(0, 14).map((item) => ({
      description: item.description || '',
      unit: item.unit || 'Job',
      quantity: String(item.quantity ?? ''),
      rate_aed: money(item.unit_price),
      vat_percent: String(item.vat_rate ?? 5),
      vat_amount_aed: money(item.vat_amount),
      amount_aed: money(item.amount),
    })),
    notes: invoice.notes || '',
    totals: {
      subtotal_aed: money(invoice.subtotal),
      discount_aed: money(invoice.discount),
      vat_total_aed: money(invoice.tax_amount),
      net_total_aed: money(invoice.total),
    },
    signatures: {
      prepared_by: invoice.prepared_by || '',
      authorized_signature_name: invoice.authorized_by || '',
      customer_received_by: invoice.received_by || '',
    },
  };
}
