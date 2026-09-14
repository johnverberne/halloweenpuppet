import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const indexHtml = resolve(root, 'client/dist/index.html');

if (existsSync(indexHtml)) {
  process.exit(0);
}

console.log('[halloweenpuppet] client/dist ontbreekt — Vue bouwen…');
const result = spawnSync('npm', ['run', 'build', '-w', 'client'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
});
process.exit(result.status ?? 1);
