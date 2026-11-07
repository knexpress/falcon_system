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

function spawnPython(bin, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { windowsHide: true });
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

async function runPython(args) {
  const bins = process.platform === 'win32' ? ['python', 'py'] : ['python3', 'python'];
  let lastError;
  for (const bin of bins) {
    try {
      await spawnPython(bin, args);
      return;
    } catch (err) {
      lastError = err;
      // Try next binary if this one isn't installed
      if (err.code === 'ENOENT') continue;
      // Real Python/module error — stop and surface it
      throw err;
    }
  }
  throw lastError || new Error('Python is not available on this server');
}

let pypdfReady = false;

async function ensurePypdf() {
  if (pypdfReady) return;
  try {
    await runPython(['-c', 'import pypdf']);
    pypdfReady = true;
    return;
  } catch {
    // Fall through and install
  }

  const req = path.join(__dirname, '..', 'requirements.txt');
  const installAttempts = [
    ['-m', 'pip', 'install', '-r', req],
    ['-m', 'pip', 'install', '--break-system-packages', '-r', req],
    ['-m', 'pip', 'install', 'pypdf'],
    ['-m', 'pip', 'install', '--break-system-packages', 'pypdf'],
  ];

  let lastError;
  for (const args of installAttempts) {
    try {
      await runPython(args);
      await runPython(['-c', 'import pypdf']);
      pypdfReady = true;
      return;
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(
    `pypdf is not installed on this server. ${lastError?.message || ''}`.trim()
  );
}

export async function generateInvoicePdf(invoice) {
  if (!fs.existsSync(GENERATOR) || !fs.existsSync(TEMPLATE)) {
    throw new Error('Invoice PDF template/generator is missing on the server');
  }

  await ensurePypdf();

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
