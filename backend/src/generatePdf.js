import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { invoiceToPayload } from './invoicePayload.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF_DIR = path.join(__dirname, '..', 'invoice-pdf');
const GENERATOR = path.join(PDF_DIR, 'invoice_generator.py');
const TEMPLATE = path.join(PDF_DIR, 'Falcon_Revive_Emerald_Invoice_Fillable.pdf');

function runPython(args) {
  return new Promise((resolve, reject) => {
    const child = spawn('python', args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr || `PDF generator exited with code ${code}`));
    });
  });
}

export async function generateInvoicePdf(invoice) {
  if (!fs.existsSync(GENERATOR) || !fs.existsSync(TEMPLATE)) {
    throw new Error('Invoice PDF template/generator is missing on the server');
  }

  const payload = invoiceToPayload(invoice);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'falcon-inv-'));
  const jsonPath = path.join(tmpDir, 'payload.json');
  const outPath = path.join(
    tmpDir,
    `${(invoice.invoice_number || 'invoice').replace(/[^\w.-]+/g, '_')}.pdf`
  );

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), 'utf8');

  try {
    await runPython([
      GENERATOR,
      jsonPath,
      outPath,
      '--template',
      TEMPLATE,
    ]);
    return fs.readFileSync(outPath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
