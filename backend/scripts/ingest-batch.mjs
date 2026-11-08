#!/usr/bin/env node
/**
 * SOFÍA 2.0 — Knowledge Base Ingestion Script
 * 
 * Procesa archivos JSON de lotes de investigación y actualiza el índice maestro.
 * Uso: node ingest-batch.mjs <ruta-al-archivo-lote.json>
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KB_DIR = join(__dirname, '..', 'knowledge-base');
const META_DIR = join(KB_DIR, '_meta');
const INDEX_FILE = join(META_DIR, 'master-index.json');

/**
 * Carga el índice maestro
 */
function loadIndex() {
  const raw = readFileSync(INDEX_FILE, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Guarda el índice maestro
 */
function saveIndex(index) {
  index.ultima_actualizacion = new Date().toISOString().split('T')[0];
  writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
  console.log(`✅ Índice maestro actualizado: ${INDEX_FILE}`);
}

/**
 * Procesa un archivo de lote JSON
 */
function processBatch(batchFilePath) {
  console.log(`\n📦 Procesando lote: ${batchFilePath}\n`);

  const raw = readFileSync(batchFilePath, 'utf-8');
  const batch = JSON.parse(raw);

  const { lote, fecha_consulta, documentos, urls_procesadas, cobertura, pendientes } = batch;

  if (!documentos || !Array.isArray(documentos)) {
    console.error('❌ El archivo de lote no tiene el campo "documentos" esperado.');
    process.exit(1);
  }

  const index = loadIndex();
  let added = 0;
  let skipped = 0;

  for (const doc of documentos) {
    // Validación básica
    if (!doc.id || !doc.categoria || !doc.titulo || !doc.contenido) {
      console.warn(`⚠️  Documento incompleto omitido: ${doc.id || 'sin ID'}`);
      skipped++;
      continue;
    }

    // Deduplicación por ID
    const exists = index.documentos.some(d => d.id === doc.id);
    if (exists) {
      console.warn(`⚠️  Documento duplicado omitido: ${doc.id}`);
      skipped++;
      continue;
    }

    // Añadir al índice
    index.documentos.push({
      id: doc.id,
      categoria: doc.categoria,
      titulo: doc.titulo,
      url_fuente: doc.url_fuente || '',
      fecha_consulta: doc.fecha_consulta || fecha_consulta,
      vigencia: doc.vigencia || 'pendiente_verificacion',
      palabras_clave: doc.palabras_clave || [],
      lote: lote,
    });

    // Actualizar estadísticas
    index.estadisticas.total_documentos++;
    if (index.estadisticas.por_categoria[doc.categoria] !== undefined) {
      index.estadisticas.por_categoria[doc.categoria]++;
    }
    if (index.estadisticas.por_vigencia[doc.vigencia] !== undefined) {
      index.estadisticas.por_vigencia[doc.vigencia]++;
    }

    // Guardar documento completo en su carpeta
    const catDir = join(KB_DIR, doc.categoria);
    const docFile = join(catDir, `${doc.id}.json`);
    writeFileSync(docFile, JSON.stringify(doc, null, 2), 'utf-8');
    console.log(`  ✅ Guardado: ${doc.categoria}/${doc.id}.json`);
    added++;
  }

  // Marcar lote como completado
  if (!index.lotes_completados.includes(lote)) {
    index.lotes_completados.push(lote);
  }
  index.lotes_pendientes = index.lotes_pendientes.filter(l => l !== lote);

  saveIndex(index);

  // Resumen del lote
  console.log(`\n📊 RESUMEN DEL LOTE "${lote}":`);
  console.log(`   Fecha consulta:    ${fecha_consulta}`);
  console.log(`   Documentos añadidos: ${added}`);
  console.log(`   Documentos omitidos: ${skipped}`);
  console.log(`   URLs procesadas:   ${(urls_procesadas || []).length}`);
  console.log(`   Cobertura:         ${cobertura}`);
  if (pendientes && pendientes.length > 0) {
    console.log(`   Pendientes:`);
    pendientes.forEach(p => console.log(`     - ${p}`));
  }
}

/**
 * Genera reporte de cobertura
 */
function generateCoverageReport() {
  const index = loadIndex();
  const lines = [
    '# SOFÍA 2.0 — Reporte de Cobertura de Knowledge Base',
    '',
    `**Generado:** ${new Date().toISOString()}`,
    `**Total documentos:** ${index.estadisticas.total_documentos}`,
    '',
    '## Por Categoría',
    '',
    '| Categoría | Documentos |',
    '|-----------|-----------|',
  ];

  for (const [cat, count] of Object.entries(index.estadisticas.por_categoria)) {
    lines.push(`| ${cat} | ${count} |`);
  }

  lines.push('', '## Por Vigencia', '', '| Vigencia | Documentos |', '|----------|-----------|');
  for (const [vig, count] of Object.entries(index.estadisticas.por_vigencia)) {
    lines.push(`| ${vig} | ${count} |`);
  }

  lines.push('', '## Lotes Completados', '');
  (index.lotes_completados || []).forEach(l => lines.push(`- ✅ ${l}`));

  lines.push('', '## Lotes Pendientes', '');
  (index.lotes_pendientes || []).forEach(l => lines.push(`- ⏳ ${l}`));

  const reportPath = join(META_DIR, 'coverage-report.md');
  writeFileSync(reportPath, lines.join('\n'), 'utf-8');
  console.log(`\n📋 Reporte de cobertura generado: ${reportPath}`);
}

// CLI
const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Uso: node ingest-batch.mjs <archivo-lote.json>');
  console.log('     node ingest-batch.mjs --report  (genera reporte de cobertura)');
  process.exit(0);
}

if (args[0] === '--report') {
  generateCoverageReport();
} else {
  processBatch(args[0]);
  generateCoverageReport();
}

