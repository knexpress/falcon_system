# Falcon Revive invoice generator

This package fills the supplied one-page invoice artwork without rebuilding its graphics. The generated PDF keeps the same page size and remains an editable PDF form. Its named fields can also be read back as a flat mapping for another system.

## Setup

Keep these files together:

- `invoice_generator.py`
- `Falcon_Revive_Emerald_Invoice_Fillable.pdf`
- Your JSON payload file

Install the dependency once:

```text
python -m pip install pypdf
```

## Generate from a system payload

Copy `invoice_example.json`, replace its sample values with the values from your system, then run:

```text
python invoice_generator.py invoice_example.json invoice-TEST-INV-001.pdf
```

The same operation can be called directly from a Python service:

```python
from invoice_generator import generate_invoice

invoice_data = {
    "customer": {"name": "Customer name", "trn_id": "TRN", "mobile": "+971...", "address": "Dubai"},
    "invoice": {
        "number": "INV-1001", "date": "2026-11-03", "job_order_number": "JO-1001",
        "vehicle": {"make": "Toyota", "model_year": "2024", "plate_number": "A 12345", "mileage": "24500"}
    },
    "items": [{
        "description": "Repair", "unit": "Job", "quantity": "1", "rate_aed": "250.00",
        "vat_percent": "5", "vat_amount_aed": "12.50", "amount_aed": "250.00"
    }],
    "notes": "",
    "totals": {"subtotal_aed": "250.00", "discount_aed": "0.00", "vat_total_aed": "12.50", "net_total_aed": "262.50"},
    "signatures": {"prepared_by": "Service advisor", "authorized_signature_name": "", "customer_received_by": ""}
}

generate_invoice(invoice_data, "invoice-INV-1001.pdf")
```

Each invoice supports up to 14 line items. Pass amounts and tax totals from your system so its existing rounding and accounting rules remain authoritative. The generator does not calculate totals. The signature lines are editable name fields, not cryptographic PDF signatures.

## Extract values later

Print the completed invoice's form values as JSON:

```text
python invoice_generator.py invoice-INV-1001.pdf --extract
```

Or read them from Python:

```python
from invoice_generator import extract_invoice

values = extract_invoice("invoice-INV-1001.pdf")
print(values["invoice_number"])
print(values["item_01_description"])
```

Field names are stable, for example `customer_name`, `invoice_date`, `item_01_amount_aed`, and `net_total_aed`. Empty form fields are returned as empty strings.
