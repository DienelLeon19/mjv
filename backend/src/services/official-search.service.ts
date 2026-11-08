export interface SearchIntent {
  name: string;
  pattern: RegExp;
  terms: string;
  ids: string[];
  pages: { title: string; url: string }[];
  clarification?: string;
}

export function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

export const intents: SearchIntent[] = [
  {
    name: 'declaracion_anual',
    pattern: /\b(anual|anuales|709|710)\b/,
    terms: 'declaracion anual renta',
    ids: [],
    clarification: 'Para indicarte el trámite y vencimiento que corresponden, falta precisar el ejercicio fiscal y si declaras como persona natural sin negocio o como empresa. Los enlaces recuperados pueden referirse a ejercicios distintos.',
    pages: [
      { title: 'Declaración anual de rentas de trabajo — SUNAT en gob.pe', url: 'https://www.gob.pe/institucion/sunat/pages/12274-declarar-y-pagar-impuesto-anual-para-rentas-de-trabajo-4ta-y-5ta-categoria' },
      { title: 'Renta anual de empresas — SUNAT', url: 'https://www.sunat.gob.pe/renta/renta.html' },
    ],
  },
  {
    name: 'inscripcion_ruc',
    pattern: /\b(ruc|inscribirme|inscripcion|registrarme)\b/,
    terms: 'ruc inscripcion registro contribuyentes',
    ids: ['ruc-001', 'ruc-002', 'ruc-003'],
    pages: [{ title: 'Inscripción en el RUC — SUNAT en gob.pe', url: 'https://www.gob.pe/284-inscripcion-a-ruc-persona-natura' }],
  },
  {
    name: 'credito_fiscal',
    pattern: /\b(credito fiscal|descontar igv|compras.*igv|igv.*compras)\b/,
    terms: 'credito fiscal igv',
    ids: ['igv-002'],
    pages: [{ title: 'Crédito fiscal — SUNAT', url: 'https://orientacion.sunat.gob.pe/3111-06-credito-fiscal' }],
  },
  {
    name: 'igv',
    pattern: /\b(igv|ipm|impuesto general.*ventas)\b/,
    terms: 'igv tasa impuesto ventas',
    ids: ['igv-001'],
    pages: [{ title: 'Impuesto General a las Ventas — SUNAT en gob.pe', url: 'https://www.gob.pe/7910-impuesto-general-a-las-ventas-igv' }],
  },
  {
    name: 'envio_factura',
    pattern: /(?:plazo|dias|enviar|envio|mandar|remitir).*(?:factura|comprobante)|(?:factura|comprobante).*(?:plazo|dias|envio|enviar)/,
    terms: 'plazo envio factura electronica',
    ids: ['cpe-006'],
    pages: [{ title: 'Emisión desde sistemas del contribuyente — SUNAT', url: 'https://cpe.sunat.gob.pe/sistema_emision/see_contribuyente' }],
  },
  {
    name: 'facturacion',
    pattern: /\b(factura|facturas|facturar|facturacion|boleta|comprobantes?)\b/,
    terms: 'factura electronica emision comprobantes',
    ids: ['cpe-001', 'cpe-002', 'cpe-005'],
    pages: [{ title: 'Emitir factura electrónica en SOL — SUNAT en gob.pe', url: 'https://www.gob.pe/7309' }, { title: 'Factura electrónica SEE SOL — SUNAT', url: 'https://orientacion.sunat.gob.pe/04-preguntas-frecuentes-factura-electronica-see-sol-portal' }],
  },
];

function decode(text: string): string {
  return text.replace(/&#(x[0-9a-f]+|\d+);/gi, (_, value: string) => {
    const code = value.startsWith('x') ? parseInt(value.slice(1), 16) : Number(value);
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
  }).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

// Only fixed public pages are fetched. User text never becomes a URL or request parameter.
export async function searchOfficial(intent: SearchIntent) {
  return Promise.all(intent.pages.map(async page => {
    try {
      const response = await fetchPublicPage(page.url, {
        signal: AbortSignal.timeout(7000),
        redirect: 'error',
        headers: { Accept: 'text/html' },
      });
      if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) return null;
      const html = await response.text();
      if (html.length > 3_000_000) return null;
      const clean = html.replace(/<(script|style|nav|header|footer)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
      const terms = intent.terms.split(' ');
      const sections = [...clean.matchAll(/<(p)\b[^>]*>([\s\S]*?)<\/\1>/gi)]
        .map(match => decode(match[2].replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim())
        .filter(text => text.length >= 45 && text.length <= 1600)
        .map((text, position) => ({ text, position, score: terms.filter(term => normalize(text).includes(term)).length + (/^(ingresa|accede|selecciona|completa|haz clic|ten a la mano|revisa)/.test(normalize(text)) ? 5 : 0) }))
        .filter(item => item.score >= 2);
      const selected = sections.sort((a, b) => b.score - a.score || a.position - b.position)
        .slice(0, 3).sort((a, b) => a.position - b.position);
      // Keep extracts short, verbatim and attributable. No inferred requirements.
      let words = 0;
      const excerpts = selected.filter(item => {
        const count = item.text.split(/\s+/).length;
        if (words + count > 180) return false;
        words += count;
        return words <= 180;
      }).map(item => item.text);
      if (!excerpts.length) return null;
      return { ...page, excerpts, consultedAt: new Date().toISOString(), origin: 'official_web' as const };
    } catch {
      return null;
    }
  }));
}

async function fetchPublicPage(url: string, options: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.port || !['www.gob.pe', 'renta.sunat.gob.pe', 'www.sunat.gob.pe', 'orientacion.sunat.gob.pe', 'cpe.sunat.gob.pe'].includes(parsed.hostname)) {
      throw new Error('Destino no permitido');
    }
    const response = await fetch(url, { ...options, redirect: 'manual' });
    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    await response.body?.cancel();
    if (!location) throw new Error('Redirección sin destino');
    url = new URL(location, url).href;
  }
  throw new Error('Demasiadas redirecciones');
}

