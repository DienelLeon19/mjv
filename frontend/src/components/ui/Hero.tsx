import { MessageSquare, CalendarDays, Landmark, CircleDollarSign } from 'lucide-react';

export default function Hero({ onOpenChat }: { onOpenChat: () => void }) {
  return (
    <section id="inicio" className="campaign">
      <Landmark className="campaign-watermark" aria-hidden="true" />
      <div className="campaign-copy">
        <div className="badges">
          <span>CAMPAÑA DE RENTA · DEMOSTRACIÓN</span>
          <span>Personas Naturales y Empresas</span>
          <span>● Experiencia educativa</span>
        </div>
        <h1>Declaración Anual de Renta</h1>
        <p>Explora una recreación del portal de orientación tributaria. Consulta los temas de renta, comprobantes y trámites con el asistente de demostración SOFÍA 2.0.</p>
        <div className="campaign-actions">
          <button onClick={onOpenChat}><MessageSquare size={17} /> Orientación sobre Renta</button>
          <a href="#recursos"><CalendarDays size={17} /> Información de vencimientos</a>
          <button onClick={onOpenChat}><CircleDollarSign size={17} /> Consultar sobre devoluciones</button>
        </div>
      </div>
      <aside className="campaign-aside">
        <span>ORIENTACIÓN EN ESTA DEMOSTRACIÓN</span>
        <strong>SOFÍA 2.0</strong>
        <div className="campaign-line" />
        <p>Trámites, renta y procedimientos aduaneros</p>
      </aside>
    </section>
  );
}

