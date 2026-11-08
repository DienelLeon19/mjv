import { intents, normalize, searchOfficial } from './official-search.service.js';
import { readdir, readFile } from 'node:fs/promises';

interface Document {
  id: string;
  titulo: string;
  contenido: string;
  palabras_clave: string[];
  url_fuente: string;
  vigencia: string;
  auditoria?: {
    fecha_verificacion: string;
    pendientes: string[];
    fuentes_verificadas: { url: string }[];
  };
}

const root = new URL('../../knowledge-base/', import.meta.url);
const stopwords = new Set('a al algo como con cual cuales cuando de del el en es esta este hay informacion la las lo los me mi necesito para por que quiero se sobre son su sus tiene un una y cuanto cuantos donde puedo saber favor hola explicame hago hacer sacar saco primera vez tengo emitir emito'.split(' '));

function tokens(text: string): Set<string> {
  return new Set(text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').match(/[a-z0-9]+/g)?.filter(word => word.length > 1 && !stopwords.has(word)) ?? []);
}

async function loadDocuments(): Promise<Document[]> {
  const folders = await readdir(root, { withFileTypes: true });
  const documents: Document[] = [];
  for (const folder of folders.filter(item => item.isDirectory() && !item.name.startsWith('_'))) {
    const directory = new URL(folder.name + '/', root);
    for (const filename of (await readdir(directory)).filter(name => name.endsWith('.json'))) {
      const document = JSON.parse((await readFile(new URL(filename, directory), 'utf8')).replace(/^\uFEFF/, '')) as Document;
      if (!document.id || typeof document.contenido !== 'string' || !Array.isArray(document.palabras_clave)) {
        throw new Error('Documento inválido en la base local');
      }
      documents.push(document);
    }
  }
  return documents;
}

function official(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && ['sunat.gob.pe', 'gob.pe', 'congreso.gob.pe', 'mef.gob.pe', 'elperuano.pe'].some(domain => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain));
  } catch {
    return false;
  }
}

export async function generateChatResponse(message: string) {
  const normalized = normalize(message);
  const intent = intents.find(candidate => candidate.pattern.test(normalized));
  const query = tokens(message + ' ' + (intent?.terms ?? ''));
  const empty = { response: 'No encontré información confiable suficiente para esa consulta en los documentos locales. Prueba una pregunta más específica.', status: 'not_found', sources: [] };
  if (!query.size) return empty;
  const documents = await loadDocuments();
  const ranked = documents.filter(document => !intent || intent.ids.includes(document.id)).map(document => {
    const title = tokens(document.titulo + ' ' + document.palabras_clave.join(' '));
    const body = tokens(document.contenido);
    const matched = [...query].filter(word => title.has(word) || body.has(word)).length;
    const titleMatches = [...query].filter(word => title.has(word)).length;
    // Token overlap and Dice similarity favor specific titles over incidental body mentions.
    const coverage = matched / query.size;
    const similarity = 2 * titleMatches / (query.size + title.size);
    return { document, coverage, titleMatches, score: coverage + similarity + titleMatches / query.size };
  }).filter(result => result.coverage >= 0.45 && result.titleMatches > 0)
    .sort((a, b) => b.score - a.score || a.document.id.localeCompare(b.document.id));
  const best = ranked[0]?.document;
  const urls = best?.auditoria?.fuentes_verificadas.map(source => source.url).filter(official) ?? [];
  const localSources = best ? urls.map(url => ({
    id: best.id, title: best.titulo, url,
    verifiedAt: best.auditoria?.fecha_verificacion,
    origin: 'local' as const,
  })) : [];
  const trace = {
    intent: intent?.name ?? 'textual',
    localCandidates: ranked.slice(0, 3).map(item => ({
      id: item.document.id, title: item.document.titulo,
      status: item.document.vigencia, score: Number(item.score.toFixed(3)),
    })),
    webAttempted: [] as string[],
    webRetrieved: [] as string[],
  };
  const requestedYears = message.match(/\b20\d{2}\b/g) ?? [];
  const yearMatches = requestedYears.every(year => best?.contenido.includes(year));
  const procedural = /\b(como|pasos|hacer|hago|tramitar)\b/.test(normalized);
  if (yearMatches && best?.vigencia === 'vigente' && best.auditoria &&
      !best.auditoria.pendientes.length && localSources.length &&
      (!procedural || intent?.name === 'envio_factura')) {
    return { response: best.contenido, status: 'documented', sources: localSources, retrieval: trace };
  }
  if (intent) {
    trace.webAttempted = intent.pages.map(page => page.url);
    const results = (await searchOfficial(intent)).filter(result => result !== null);
    trace.webRetrieved = results.map(result => result.url);
    if (results.length) {
      const context = intent.clarification ??
        'Estos son los apartados relevantes recuperados de la fuente oficial. Revisa en el enlace el procedimiento completo y el supuesto aplicable.';
      return {
        response: context + '\n\n' + results.map(result =>
          result.title + '\n' + result.excerpts.map(text => '• ' + text).join('\n')
        ).join('\n\n'),
        status: 'official',
        sources: results.map(result => ({
          id: intent.name, title: result.title, url: result.url,
          consultedAt: result.consultedAt, origin: result.origin,
        })),
        retrieval: trace,
      };
    }
    return {
      response: (intent.clarification ?? 'Falta evidencia oficial suficiente para confirmar los requisitos o pasos de tu caso.') +
        '\n\nNo pude recuperar texto oficial suficiente en esta consulta. ' +
        (best?.vigencia === 'pendiente_verificacion' ? 'El documento local relacionado está pendiente de verificación. ' : '') +
        'Puedes revisar los enlaces de orientación sugeridos. Su contenido no se verificó en esta consulta.',
      status: 'not_found',
      sources: intent.pages.map(page => ({ ...page, id: intent.name, origin: 'suggested' as const })),
      retrieval: trace,
    };
  }
  return {
    ...empty,
    response: empty.response + ' Falta identificar el trámite concreto. Puedes consultar el portal oficial de orientación.',
    sources: [{ id: 'orientation', title: 'Orientación SUNAT', url: 'https://orientacion.sunat.gob.pe/', origin: 'suggested' as const }],
    retrieval: trace,
  };
}


