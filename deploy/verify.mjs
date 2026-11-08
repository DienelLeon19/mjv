import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const child = spawn(process.execPath, ['--use-system-ca', root + '/backend/dist/index.js'], {
  cwd: root, env: { ...process.env, NODE_ENV: 'production', PORT: '3001' }, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('No inició el backend')), 10000);
    child.once('error', reject);
    child.once('exit', code => { clearTimeout(timer); reject(new Error(`Salida prematura: ${code}`)); });
    child.stdout.once('data', () => { clearTimeout(timer); resolve(); });
  });
  const url = 'http://127.0.0.1:3001';
  assert.equal((await fetch(url + '/api/health')).status, 200);
  for (const [body, status] of [['{}', 400], ['{', 400], [JSON.stringify({ message: 'x'.repeat(9000) }), 413]]) {
    assert.equal((await fetch(url + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })).status, status);
  }
  const docs = [];
  for (const folder of await readdir(root + '/backend/knowledge-base', { withFileTypes: true })) {
    if (!folder.isDirectory() || folder.name.startsWith('_')) continue;
    for (const name of await readdir(root + '/backend/knowledge-base/' + folder.name)) {
      if (name.endsWith('.json')) docs.push(JSON.parse((await readFile(`${root}/backend/knowledge-base/${folder.name}/${name}`, 'utf8')).replace(/^\uFEFF/, '')));
    }
  }
  assert.equal(docs.length, 26);
  for (const message of ['¿Qué es el RUC?', 'Tasa IGV 2026', 'Envío factura electrónica']) {
    const res = await fetch(url + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.sources.length);
    if (data.status === 'documented') assert.ok(docs.some(doc => doc.contenido === data.response && doc.vigencia === 'vigente'));
    console.log(JSON.stringify({ query: message, status: data.status, sources: data.sources.map(source => source.url) }));
  }
  console.log('PASS: health, validación 400/413, 26 JSON y procedencia de respuestas.');
} finally {
  child.kill('SIGTERM');
}
