# SOFÍA 2.0 — Knowledge Base: Arquitectura RAG

**Proyecto:** SOFÍA 2.0 by mjvstudio.online  
**Dominio:** Tributación y Aduanas del Perú  
**Versión:** 1.0 (Fase: Construcción)  
**Inicio:** 2026-11-03

---

## 1. Estructura de carpetas

```
backend/knowledge-base/
├── _meta/                    ← Índice maestro, arquitectura, pendientes
│   ├── ARCHITECTURE.md       ← Este archivo
│   ├── master-index.json     ← Índice de todos los documentos
│   ├── coverage-report.md    ← Reporte de cobertura por tema
│   └── pending-topics.md     ← Temas pendientes de investigar
├── ruc/                      ← RUC y Clave SOL
├── regimenes/                ← NRUS, RER, RMT, Régimen General
├── igv/                      ← IGV, crédito fiscal, exoneraciones
├── comprobantes/             ← Factura, boleta, CPE, SEE, OSE
├── detracciones/             ← SPOT, detracciones por sector
├── renta/                    ← Impuesto a la Renta (1ra–5ta categoría)
├── aduanas/                  ← Importaciones, exportaciones, aranceles
└── multas/                   ← Infracciones, sanciones, gradualidad
```

---

## 2. Esquema de documento RAG

Cada documento JSON sigue este esquema:

```typescript
interface KnowledgeDocument {
  id: string;               // Ej: "ruc-001", "igv-003"
  categoria: string;        // ruc | regimenes | igv | comprobantes | ...
  titulo: string;           // Título descriptivo del contenido
  contenido: string;        // Texto completo (mínimo 150 palabras)
  url_fuente: string;       // URL oficial exacta
  fecha_consulta: string;   // ISO 8601
  vigencia: "vigente" | "historico" | "pendiente_verificacion";
  referencias_normativas: string[];  // Leyes, DS, RS aplicables
  palabras_clave: string[];          // Para búsqueda por keywords
  faqs: Array<{
    pregunta: string;
    respuesta: string;
  }>;
}
```

---

## 3. Estrategia de recuperación (RAG)

### 3.1 Chunking
- **Chunk size recomendado:** 512 tokens con solapamiento de 50 tokens
- **Estrategia:** Por sección/subtema dentro de cada documento
- **Metadatos preservados:** id, categoria, titulo, url_fuente, vigencia

### 3.2 Embeddings (futuro)
- **Modelo sugerido:** `text-embedding-3-small` (OpenAI) o `multilingual-e5-large`
- **Dimensiones:** 1536 (OpenAI) o 1024 (E5)
- **Vector store sugerido:** Pinecone, Weaviate, o pgvector

### 3.3 Estrategia de búsqueda
1. **Búsqueda semántica** (cosine similarity sobre embeddings)
2. **Filtros de metadata:** por `categoria`, `vigencia`
3. **Re-ranking:** por relevancia + preferencia por documentos `vigente`
4. **Fallback:** búsqueda por keywords si similitud < 0.75

### 3.4 Prompt template (futuro)
```
Eres SOFÍA 2.0, asistente tributaria y aduanera del Perú.
Responde SOLO con base en los documentos de contexto proporcionados.
Si no tienes información suficiente, indícalo claramente.
No inventes datos tributarios.

CONTEXTO:
{retrieved_documents}

PREGUNTA DEL USUARIO:
{user_question}
```

---

## 4. Fuentes oficiales autorizadas

| Fuente | URL | Tipo |
|--------|-----|------|
| SUNAT Orientación | https://orientacion.sunat.gob.pe | Portal principal |
| SUNAT CPE | https://cpe.sunat.gob.pe | Comprobantes electrónicos |
| Gob.pe SUNAT | https://www.gob.pe/sunat | Portal unificado |
| MEF | https://www.mef.gob.pe | Ministerio de Economía |
| El Peruano | https://www.elperuano.pe | Normas legales oficiales |
| SUNAT SOL | https://sol.sunat.gob.pe | Plataforma en línea |

---

## 5. Lotes de investigación

| Lote | Temas | Estado | Documentos |
|------|-------|--------|------------|
| Lote 01 | RUC, Clave SOL | Auditado con pendientes | 8 |
| Lote 02 | Regímenes tributarios, IGV | Auditado con pendientes | 9 |
| Lote 03 | Comprobantes electrónicos | Auditado con pendientes | 9 |
| Lote 04 | Detracciones, percepciones, retenciones | ⏳ Pendiente | — |
| Lote 05 | Impuesto a la Renta (todas las categorías) | ⏳ Pendiente | — |
| Lote 06 | Multas, infracciones, cobranza coactiva | ⏳ Pendiente | — |
| Lote 07 | Importaciones y exportaciones | ⏳ Pendiente | — |
| Lote 08 | Procedimientos aduaneros y aranceles | ⏳ Pendiente | — |

---

## 6. Control de calidad

- ✅ Toda información tiene URL fuente verificable
- ✅ Se distingue entre vigente / histórico / pendiente
- ✅ No se inventan datos tributarios
- ✅ Referencias normativas explícitas cuando disponibles
- ⚠️ Siempre recomendar al usuario verificar en sunat.gob.pe la información más reciente



## Auditoría normativa 2026-11-03

Los documentos incluyen auditoria con fuentes_verificadas, fecha_verificacion, corte_normativo, cambios y pendientes. El estado pendiente_verificacion impide clasificarlos globalmente como vigentes aunque conserven hechos confirmados. Los resúmenes auditados pueden tener menos de 150 palabras para evitar completar longitud con contenido no respaldado.
