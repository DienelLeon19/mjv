const categories = [
  ['Accesibilidad e Inclusión', 'Ciencia, Tecnología e Innovación', 'Economía y Finanzas', 'Identidad y Registro', 'Medio Ambiente', 'Programas y Organizaciones Sociales', 'Transparencia'],
  ['Agricultura, ganadería y pesca', 'Comercio, Negocio y Emprendimiento', 'Educación', 'Infraestructura y Servicios Públicos', 'Migración y Turismo', 'Salud', 'Transporte y Vehículos'],
  ['Arte, Deporte y Cultura', 'Defensa, Seguridad y Justicia', 'Energía y Minas', 'Inmuebles y Vivienda', 'Participación Ciudadana', 'Trabajo y Pensiones', 'Tributación'],
];

export default function Footer() {
  return (
    <footer id="nosotros" className="portal-footer">
      <h2>Categorías</h2>
      <div className="footer-columns">
        {categories.map((items, index) => (
          <ul key={index}>{items.map(item => <li key={item}>{item}</li>)}</ul>
        ))}
      </div>
      <p className="education-notice footer-notice">Plataforma de demostración desarrollada exclusivamente con fines educativos. Proyecto académico independiente, no afiliado ni respaldado por SUNAT. No ingresar datos personales, tributarios ni credenciales reales.</p>
      <div className="footer-bottom">
        <strong>SOFÍA 2.0 · Recreación educativa</strong>
        <p>Desarrollo académico por MJV Studio</p>
        <span>Recursos visuales de referencia · SUNAT</span>
      </div>
    </footer>
  );
}

