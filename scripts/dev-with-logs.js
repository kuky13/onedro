
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

const viteProcess = spawn('npx', ['vite', '--host'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: true
});

viteProcess.on('error', (error) => {
  console.error('Erro ao iniciar Vite:', error);
  process.exit(1);
});

viteProcess.on('exit', (code) => {
  process.exit(code || 0);
});



