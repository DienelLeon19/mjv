# SOFÍA 2.0 — despliegue manual

Destino: `nexrastudio.online`, `34.46.235.135`, Ubuntu 26.04 x86_64, E2-micro.
No se ha desplegado ni contactado el servidor. El diseño, aviso educativo y base documental se conservan.

## Requisitos y estructura

Necesitas acceso SSH autorizado, acceso al DNS de Cloudflare y permisos administrativos en Google Cloud para el firewall. **No se presupone sudo**: ejecuta `sudo -v` primero. Si falla, un administrador debe ejecutar los pasos marcados con `sudo`; un usuario sin privilegios no puede instalar Nginx, certificados ni systemd.

Producción usa Node 24 LTS y pnpm 11.25.0. Se compila todo en tu equipo; la VM únicamente instala dependencias de ejecución del backend. No necesita Docker, compiladores, PM2 ni servidor Vite. El backend usa 256 MB de heap y un límite systemd de 384 MB. Los límites globales de Nginx (3 solicitudes/s, ráfaga 6, 8 conexiones API) protegen la VM; varios usuarios comparten ese presupuesto.

```
/opt/sofia/releases/<release>/frontend/dist
/opt/sofia/releases/<release>/backend/{dist,knowledge-base,node_modules}
/opt/sofia/current -> releases/<release>
/etc/sofia/sofia.env
/etc/nginx/ssl/{sofia.pem,sofia.key}
```

`dist/services/chat.service.js` resuelve `../../knowledge-base/` con `import.meta.url`, independientemente del directorio de arranque. No mover esa carpeta ni publicarla con Nginx. La búsqueda web existente necesita salida HTTPS hacia fuentes oficiales; no requiere claves ni OpenAI. Los documentos pendientes mantienen su estado.

## 1. Preparar localmente (PowerShell)

Instala Node 24 LTS y pnpm 11.25.0 en tu equipo si no los tienes. El repositorio tenía lockfiles raíz/backend incompletos; se recuperaron de la instalación existente. No actualizar dependencias durante el despliegue.

```powershell
Set-Location 'E:\MJV Studio'
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm --dir frontend install --frozen-lockfile
pnpm --dir backend install --frozen-lockfile
pnpm check
pnpm package:release
$bundle = Get-ChildItem -LiteralPath './release' -Filter 'sofia-*.tar.gz' | Sort-Object LastWriteTime -Descending | Select-Object -First 1
tar -tzf $bundle.FullName
$sshUser = 'REEMPLAZAR_USUARIO_SSH'
$sshKey = 'C:\REEMPLAZAR\clave_ssh'
scp -i $sshKey $bundle.FullName "${sshUser}@34.46.235.135:~/"
ssh -i $sshKey "${sshUser}@34.46.235.135"
```

Comprueba la huella SSH por un canal confiable. Sustituye usuario y ruta por los proporcionados por tu administrador (incluido OS Login si corresponde). El paquete contiene solo builds, JSON y metadatos documentales, manifiesto/lockfile backend y configuración pública. Excluye `.env`, `node_modules`, mapas de código y fuentes de la aplicación. Incluye `SHA256SUMS`. No transfieras el repositorio completo. `package:release` empaqueta el build existente: ejecuta siempre `pnpm check` inmediatamente antes.

## 2. Preparar Ubuntu (administrador, una vez)

Los siguientes bloques usan Bash, no PowerShell:

```bash
sudo -v
cat /etc/os-release
uname -m # debe ser x86_64
sudo apt-get update
sudo apt-get install -y nginx ca-certificates curl xz-utils
```

Instala el binario oficial Node 24 LTS, sin compilar. La versión fijada a continuación es Node 24.22.2 LTS, publicada en la página oficial consultada. La comprobación local se ejecutó con Node 24.11.0: repite las comprobaciones con 24.22.2 antes de publicar y aplica futuras revisiones de seguridad de la misma rama. Consulta https://nodejs.org/en/download y conserva la versión elegida en el registro del despliegue.

```bash
NODE_VERSION=24.22.2
mkdir -p "$HOME/sofia-node-install"
cd "$HOME/sofia-node-install"
curl --fail --show-error --location --proto '=https' -O "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz"
curl --fail --show-error --location --proto '=https' -O "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt"
grep " node-v${NODE_VERSION}-linux-x64.tar.xz$" SHASUMS256.txt > selected.sha256
test -s selected.sha256 && sha256sum -c selected.sha256
# Continuar únicamente si el checksum coincide.
sudo tar -xJf "node-v${NODE_VERSION}-linux-x64.tar.xz" -C /usr/local --strip-components=1 --no-same-owner
sudo /usr/local/bin/npm install -g pnpm@11.25.0
/usr/local/bin/node --version
/usr/local/bin/pnpm --version
id sofia || sudo useradd --system --user-group --home-dir /nonexistent --shell /usr/sbin/nologin sofia
sudo install -d -m 755 /opt/sofia/releases
sudo install -d -m 750 -o root -g sofia /etc/sofia
sudo install -d -m 700 /etc/nginx/ssl
```

No ejecutes estos comandos encima de otra instalación de Node administrada sin coordinarlo. Solo se necesitan puertos de entrada TCP 80 y 443; restringe 22 a la IP administrativa o IAP según tu acceso. **No abras 3001 ni 5173**. Configura las reglas VPC de GCE y cualquier firewall local con el administrador, conservando el acceso SSH. Reserva `34.46.235.135` como IP estática si todavía es efímera. No se configura swap automáticamente ni se compila en esta VM.

## 3. Instalar el paquete como usuario SSH

```bash
cd "$HOME"
ARCHIVE=sofia-REEMPLAZAR_FECHA.tar.gz # nombre exacto transferido
RELEASE="${ARCHIVE%.tar.gz}"
test -f "$ARCHIVE" && mkdir "$HOME/$RELEASE"
tar -xzf "$ARCHIVE" -C "$HOME/$RELEASE"
cd "$HOME/$RELEASE"
sha256sum -c SHA256SUMS
# Detenerse ante cualquier fallo de integridad.
cd backend
pnpm install --prod --frozen-lockfile --ignore-scripts --network-concurrency=1
cd ..
sudo cp -a "$HOME/$RELEASE" "/opt/sofia/releases/$RELEASE"
sudo chown -R root:root "/opt/sofia/releases/$RELEASE"
sudo chmod -R u=rwX,go=rX "/opt/sofia/releases/$RELEASE"
# Primera instalación: crear entorno desde la plantilla, sin claves.
if ! sudo test -f /etc/sofia/sofia.env; then
  sudo install -m 640 -o root -g sofia .env.example /etc/sofia/sofia.env
fi
sudo ln -s "/opt/sofia/releases/$RELEASE" /opt/sofia/current.new
sudo mv -Tf /opt/sofia/current.new /opt/sofia/current
sudo install -m 644 deploy/systemd/sofia.service /etc/systemd/system/sofia.service
sudo systemctl daemon-reload
sudo systemctl enable sofia
sudo systemctl restart sofia
curl --fail http://127.0.0.1:3001/api/health
sudo ss -lntp | grep ':3001' # exclusivamente 127.0.0.1:3001
```

Cada release debe tener un nombre nuevo. Detente si ya existe `/opt/sofia/releases/$RELEASE` o `current.new`; no superpongas instalaciones. La cuenta `sofia` no puede modificar el código ni la base JSON. La instalación `--prod` no ejecuta scripts ni instala TypeScript. No ejecutes `pnpm build` en el servidor.

## 4. Cloudflare y HTTPS

En Cloudflare crea el registro A `@` → `34.46.235.135`, proxy activado (nube naranja), y elimina registros AAAA de este nombre si no tienes IPv6 configurado. Esta configuración cubre solo `nexrastudio.online`, no `www`.

En SSL/TLS → Origin Server crea un certificado Origin CA para `nexrastudio.online`. Guarda certificado y clave privada **solo en el servidor**, mediante una sesión administrativa segura:

```bash
sudo install -m 600 /dev/null /etc/nginx/ssl/sofia.key
sudo install -m 644 /dev/null /etc/nginx/ssl/sofia.pem
sudo nano /etc/nginx/ssl/sofia.key # pegar clave PEM completa
sudo nano /etc/nginx/ssl/sofia.pem # pegar certificado PEM completo
sudo openssl x509 -in /etc/nginx/ssl/sofia.pem -noout -dates -ext subjectAltName
sudo install -m 644 /opt/sofia/current/deploy/nginx/sofia.conf /etc/nginx/sites-available/sofia
sudo ln -s /etc/nginx/sites-available/sofia /etc/nginx/sites-enabled/sofia
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx
```

Si el enlace `sites-enabled/sofia` ya existe, verifica su destino y omite `ln`. No elimines otros sitios. Evita bloques duplicados para el mismo dominio. Activa **Full (strict)** en SSL/TLS y espera que el certificado de borde Universal SSL esté activo. No uses Flexible. Origin CA es confiable para Cloudflare, no para navegadores conectados directamente al origen: mantén el proxy activado. No uses `curl -k` para dar HTTPS por validado. Programa renovación antes del vencimiento del certificado. Configura una regla de caché para omitir `/api/*` y no apliques “Cache Everything” al sitio.

Referencias oficiales consultadas el 7 de noviembre de 2026: [Origin CA](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/), [Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/), [proxy_pass Nginx](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass). El `proxy_pass` no termina en `/`, para conservar `/api/chat` al reenviar.

## 5. Verificar antes de publicar

```bash
sudo systemctl status sofia nginx --no-pager
sudo systemd-analyze verify /etc/systemd/system/sofia.service
sudo nginx -t
curl --fail https://nexrastudio.online/api/health
curl --fail -H 'Content-Type: application/json' --data '{"message":"¿Qué es el RUC?"}' https://nexrastudio.online/api/chat
curl --fail -I https://nexrastudio.online/
sudo journalctl -u sofia -n 40 --no-pager
free -h
sudo systemctl show sofia -p MemoryCurrent -p MemoryPeak
```

En navegador comprueba móvil/escritorio, imágenes, aviso educativo en encabezado/footer y abrir/minimizar/cerrar/enviar chat. La pestaña Network debe mostrar `/api/chat` en el mismo dominio, nunca localhost. Comprueba RUC, IGV, declaración anual y comprobantes: deben conservar fuentes, fechas y avisos de pendientes. La disponibilidad de fuentes web externas no está garantizada; no debe convertirse un fallo de red en información confirmada. Vigila respuestas 429/502 y memoria antes de aumentar límites. Evita registrar mensajes tributarios o credenciales reales. Nginx sirve únicamente `frontend/dist`, nunca `.env` ni knowledge-base.

## Actualizar o volver atrás

Repite compilación y paquete local, transfiere un release nuevo y repite el paso 3 sin reemplazar el entorno. Conserva el release anterior y una copia protegida de `/etc/sofia/sofia.env` y certificados fuera del repositorio. Para rollback:

```bash
PREVIOUS=sofia-REEMPLAZAR_RELEASE_ANTERIOR
test -d "/opt/sofia/releases/$PREVIOUS/backend/dist"
sudo ln -s "/opt/sofia/releases/$PREVIOUS" /opt/sofia/current.rollback
sudo mv -Tf /opt/sofia/current.rollback /opt/sofia/current
sudo systemctl restart sofia
curl --fail http://127.0.0.1:3001/api/health
```

Si modificaste Nginx/systemd entre versiones, restaura también sus configuraciones anteriores y repite `nginx -t`, `daemon-reload` y los reinicios necesarios. No borres releases ni documentos automáticamente.

