import { cp, mkdir, readFile, readdir, writeFile, lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, relative, join } from 'node:path';
import { execFileSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
const name = `sofia-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const stage = resolve(root, 'release', name);
await mkdir(stage, { recursive: true });
// Lista explícita: nunca copiar el repositorio entero, .env ni node_modules.
for (const path of ['frontend/dist', 'backend/dist', 'backend/knowledge-base', 'backend/package.json', 'backend/pnpm-lock.yaml', 'deploy/nginx', 'deploy/systemd', 'deploy/VALIDATION.md', '.env.example', 'DEPLOY.md']) {
  await cp(resolve(root, path), resolve(stage, path), { recursive: true, filter: source => !source.endsWith('.map') });
}
const hashes = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if ((await lstat(path)).isSymbolicLink()) throw new Error('No se permiten enlaces simbólicos');
    if (entry.name === 'node_modules' || (entry.name.startsWith('.env') && entry.name !== '.env.example')) throw new Error('Archivo prohibido');
    if (entry.isDirectory()) await walk(path);
    else hashes.push(`${createHash('sha256').update(await readFile(path)).digest('hex')}  ${relative(stage, path).replaceAll('\\', '/')}`);
  }
}
await walk(stage);
await writeFile(join(stage, 'SHA256SUMS'), hashes.sort().join('\n') + '\n');
execFileSync('tar', ['-czf', resolve(root, 'release', `${name}.tar.gz`), '-C', stage, '.']);
console.log(`Paquete: release/${name}.tar.gz (${hashes.length} archivos; sin dependencias ni secretos de entorno)`);
