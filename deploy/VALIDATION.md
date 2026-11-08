# Validación local de producción

- Entorno: Windows, Node 24.11.0, pnpm 11.25.0.
- `pnpm check`: lint frontend, TypeScript frontend/backend y build Vite correctos.
- Lockfiles raíz, frontend y backend comprobados con `install --lockfile-only --offline --frozen-lockfile`.
- `pnpm test:production`: arranque con NODE_ENV=production, health 200, entrada inválida 400, JSON malformado 400, límite de cuerpo 413; cierre del proceso de prueba.
- RUC: respuesta de fuente oficial gob.pe; IGV 2026 y envío de factura: respuestas documentadas cuyo contenido coincide exactamente con JSON vigentes.
- 26 documentos temáticos cargados. Los 33 archivos totales de knowledge-base (incluidos índices, lotes y metadatos) coinciden por SHA-256 con la copia empaquetada.
- Build React usa `/api/chat`; sin dirección de backend fija en el bundle. Diseño y textos de aviso educativo conservados, sin cambios en componentes React.
- Empaquetado por lista explícita, sin `.env`, node_modules ni source maps; manifiesto SHA256SUMS.

Pendiente en destino: instalar dependencias Linux con lockfile congelado, repetir pruebas con Node 24.22.2, validar Nginx con `nginx -t`, unidad con `systemd-analyze verify`, DNS, firewall, certificado y HTTPS Full (strict). No se ejecutaron comandos SSH/SCP, commits, push ni despliegues. No hay Nginx/systemd nativos disponibles en el entorno Windows para validar su ejecución.

El test ocupa 127.0.0.1:3001 temporalmente: ejecutarlo sin otro backend en ese puerto. No se presenta como prueba de carga; los límites de memoria/conexiones requieren observación real en la E2-micro.
