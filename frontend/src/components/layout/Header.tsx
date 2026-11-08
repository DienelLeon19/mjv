import { KeyRound } from 'lucide-react';

export default function Header() {
  return (
    <header>
      <div className="institution-bar">
        <span>RECREACIÓN EDUCATIVA • Portal tributario y aduanero</span>
        <span>Proyecto académico independiente</span>
      </div>
      <div className="site-navigation">
        <a className="brand reference-brand" href="#inicio" aria-label="Inicio de la recreación educativa">
          <img src="/assets/sunat-referencia.png" width={164} height={43} alt="SUNAT, referencia visual del proyecto académico" />
          <small>RECREACIÓN NO OFICIAL</small>
        </a>
        <nav aria-label="Navegación principal">
          <a className="selected" href="#servicios">Personas</a>
          <a href="#segmentos">Empresas</a>
          <a href="#servicios">Aduanas</a>
          <a href="#recursos">Tributos</a>
          <a href="#nosotros">Orientación</a>
        </nav>
        <a className="sol-demo" href="#servicios"><KeyRound size={17} /> Operaciones en Línea · Demo</a>
      </div>
      <p className="education-notice">Plataforma de demostración desarrollada exclusivamente con fines educativos. Proyecto académico independiente, no afiliado ni respaldado por SUNAT. No ingresar datos personales, tributarios ni credenciales reales.</p>
    </header>
  );
}

