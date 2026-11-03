"""Fill and extract the Falcon Revive invoice PDF.

Install the only dependency with: python -m pip install pypdf
See README_invoice_code.md and invoice_example.json for the payload format.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from pypdf import PdfReader, PdfWriter


DEFAULT_TEMPLATE = Path(__file__).with_name("Falcon_Revive_Emerald_Invoice_Fillable.pdf")
MAX_ITEMS = 14

_CUSTOMER_FIELDS = {
    "name": "customer_name",
    "trn_id": "customer_trn_id",
    "mobile": "customer_mobile",
    "address": "customer_address",
}
_INVOICE_FIELDS = {
    "number": "invoice_number",
    "date": "invoice_date",
    "job_order_number": "job_order_number",
}
_VEHICLE_FIELDS = {
    "make": "vehicle_make",
    "model_year": "vehicle_model_year",
    "plate_number": "vehicle_plate_number",
    "mileage": "vehicle_mileage",
}
_ITEM_FIELDS = (
    "description",
    "unit",
    "quantity",
    "rate_aed",
    "vat_percent",
    "vat_amount_aed",
    "amount_aed",
)
_TOTAL_FIELDS = (
    "subtotal_aed",
    "discount_aed",
    "vat_total_aed",
    "net_total_aed",
)
_SIGNATURE_FIELDS = (
    "prepared_by",
    "authorized_signature_name",
    "customer_received_by",
)


def _text(value: Any, field_name: str) -> str:
    """Convert a JSON-compatible scalar to a PDF string without inventing values."""
    if value is None:
        return ""
    if isinstance(value, bool) or isinstance(value, (dict, list, tuple)):
        raise TypeError(f"{field_name} must be text or a number, not {type(value).__name__}.")
    return str(value)


def payload_to_fields(payload: dict[str, Any]) -> dict[str, str]:
    """Map the documented invoice payload to the PDF's stable AcroForm field names."""
    if not isinstance(payload, dict):
        raise TypeError("Invoice payload must be a dictionary.")

    customer = payload.get("customer") or {}
    invoice = payload.get("invoice") or {}
    vehicle = invoice.get("vehicle") or {}
    totals = payload.get("totals") or {}
    signatures = payload.get("signatures") or {}
    for key, value in (("customer", customer), ("invoice", invoice),
                       ("invoice.vehicle", vehicle), ("totals", totals),
                       ("signatures", signatures)):
        if not isinstance(value, dict):
            raise TypeError(f"{key} must be an object.")

    fields: dict[str, str] = {}
    for source_key, pdf_name in _CUSTOMER_FIELDS.items():
        fields[pdf_name] = _text(customer.get(source_key), f"customer.{source_key}")
    for source_key, pdf_name in _INVOICE_FIELDS.items():
        fields[pdf_name] = _text(invoice.get(source_key), f"invoice.{source_key}")
    for source_key, pdf_name in _VEHICLE_FIELDS.items():
        fields[pdf_name] = _text(vehicle.get(source_key), f"invoice.vehicle.{source_key}")

    items = payload.get("items") or []
    if not isinstance(items, list):
        raise TypeError("items must be a list.")
    if len(items) > MAX_ITEMS:
        raise ValueError(f"The invoice layout supports at most {MAX_ITEMS} line items.")
    for index in range(MAX_ITEMS):
        item = items[index] if index < len(items) else {}
        if not isinstance(item, dict):
            raise TypeError(f"items[{index}] must be an object.")
        for item_key in _ITEM_FIELDS:
            field_name = f"item_{index + 1:02d}_{item_key}"
            fields[field_name] = _text(item.get(item_key), f"items[{index}].{item_key}")

    fields["notes"] = _text(payload.get("notes"), "notes")
    for key in _TOTAL_FIELDS:
        fields[key] = _text(totals.get(key), f"totals.{key}")
    for key in _SIGNATURE_FIELDS:
        fields[key] = _text(signatures.get(key), f"signatures.{key}")
    return fields


def generate_invoice(
    payload: dict[str, Any],
    output_pdf: str | Path,
    template_pdf: str | Path | None = None,
) -> Path:
    """Create a filled, still-editable invoice PDF from a system payload."""
    template = Path(template_pdf) if template_pdf else DEFAULT_TEMPLATE
    output = Path(output_pdf)
    if not template.is_file():
        raise FileNotFoundError(f"Invoice template not found: {template}")
    if template.resolve() == output.resolve():
        raise ValueError("Choose an output path separate from the blank template.")

    values = payload_to_fields(payload)
    reader = PdfReader(str(template))
    if reader.is_encrypted:
        raise ValueError("The invoice template is encrypted and cannot be filled.")
    available = reader.get_fields() or {}
    missing = sorted(set(values) - set(available))
    if missing:
        raise ValueError(f"Template is missing expected fields: {', '.join(missing)}")

    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    writer.update_page_form_field_values(None, values, auto_regenerate=True)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("wb") as stream:
        writer.write(stream)

    # Confirm every supplied value made it into the saved, extractable form tree.
    saved = PdfReader(str(output)).get_fields() or {}
    mismatches = [name for name, value in values.items()
                  if name not in saved or str(saved[name].get("/V", "")) != value]
    if mismatches:
        output.unlink(missing_ok=True)
        raise ValueError(f"Saved PDF did not retain fields: {', '.join(mismatches)}")
    return output


def extract_invoice(pdf_path: str | Path) -> dict[str, str]:
    """Return every form field as a flat, JSON-friendly name/value mapping."""
    fields = PdfReader(str(pdf_path)).get_fields() or {}
    result: dict[str, str] = {}
    for name, field in fields.items():
        value = field.get("/V", "")
        result[name] = "" if value is None else str(value)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Fill or extract a Falcon Revive invoice PDF.")
    parser.add_argument("input", type=Path, help="Invoice JSON, or PDF when using --extract")
    parser.add_argument("output", type=Path, nargs="?", help="Path for the filled PDF")
    parser.add_argument("--template", type=Path, default=DEFAULT_TEMPLATE,
                        help="Blank fillable PDF template (defaults to the neighboring PDF)")
    parser.add_argument("--extract", action="store_true",
                        help="Print AcroForm values from input PDF as JSON")
    args = parser.parse_args()

    if args.extract:
        print(json.dumps(extract_invoice(args.input), ensure_ascii=False, indent=2))
        return
    if args.output is None:
        parser.error("output is required unless --extract is used")
    with args.input.open("r", encoding="utf-8") as stream:
        payload = json.load(stream)
    result = generate_invoice(payload, args.output, args.template)
    print(f"Created {result}")


if __name__ == "__main__":
    main()
