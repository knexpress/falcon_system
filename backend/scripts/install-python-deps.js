import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const requirements = path.join(__dirname, '..', 'requirements.txt');
const bins =
  process.platform === 'win32' ? ['python', 'py', 'python3'] : ['python3', 'python'];

const argsSets = [
  ['-m', 'pip', 'install', '-r', requirements],
  // Newer Linux images may block system installs without this flag
  ['-m', 'pip', 'install', '--break-system-packages', '-r', requirements],
];

for (const bin of bins) {
  for (const args of argsSets) {
    const result = spawnSync(bin, args, { stdio: 'inherit', shell: false });
    if (result.status === 0) {
      console.log(`Installed Python deps with: ${bin} ${args.join(' ')}`);
      process.exit(0);
    }
  }
}

console.warn(
  'WARNING: could not install requirements.txt (pypdf). Invoice PDF may fail on this host.'
);
// Do not fail npm install on machines without Python (local frontend-only workstations)
process.exit(0);
