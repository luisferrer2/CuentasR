# ContaFlow Local (sitio estático para Vercel)
Sitio 100 % del lado del navegador: sin servidor, sin base de datos y sin login. Los datos se guardan en el navegador (localStorage) y se mueven entre equipos con un CSV (Datos → Descargar CSV / Importar).

## Probar en tu computador
Abre `index.html` con doble clic, o ejecuta `npx serve .` y entra a la dirección que muestre.

## Publicar en Vercel
Opción A (CLI): `npm i -g vercel`, luego dentro de esta carpeta `vercel` (primer despliegue) y `vercel --prod`. Responde "No" a cualquier build; framework "Other".
Opción B (GitHub): sube esta carpeta a un repositorio, en Vercel elige Add New → Project, importa el repositorio y deja Framework Preset en "Other", sin Build Command ni Output Directory.
`vercel.json` ya aplica cabeceras de seguridad y una política CSP con `connect-src 'none'`: la página no puede enviar datos a ningún servidor.

## Cosas que debes saber
- Los datos están por navegador y por dirección (origen). La dirección de producción y las de vista previa de Vercel NO comparten datos. Usa siempre la misma dirección.
- Si borras los datos del navegador, o usas modo incógnito, se pierden. Exporta el CSV con frecuencia (la app avisa pasados 7 días).
- La página es pública, pero tus datos nunca llegan a Vercel; el CSV no tiene cifrado: guárdalo en un lugar seguro.
- Sin usuarios ni permisos: es para un solo operador. `npm install && npm test` ejecuta las pruebas (lógica CSV e interfaz en jsdom).
