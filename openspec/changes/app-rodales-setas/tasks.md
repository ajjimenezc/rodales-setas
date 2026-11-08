# Tasks

## 1. Andamiaje del proyecto

- [ ] 1.1 Inicializar el proyecto Vite con JavaScript, estructura `src/` por módulos (`crypto`, `db`, `ui`, `geo`, `mapa`) y `.gitignore` que excluya `node_modules`, `dist` y `*.rodales`; verificar que `npm run dev` arranca y sirve una página vacía
- [x] 1.2 Añadir dependencias (`leaflet`, `idb`, `vite-plugin-pwa`, `vitest`, `fake-indexeddb`) y verificar que `npm install` y `npm test` (sin pruebas aún) terminan sin errores
- [x] 1.3 Configurar `base` de Vite desde una variable de entorno para la subruta de Pages y verificar que `npm run build` genera rutas relativas a esa base en `dist/index.html`

## 2. Cifrado y almacenamiento local

- [x] 2.1 Implementar derivación de clave (PBKDF2, sal aleatoria) y cifrado y descifrado AES-GCM con IV aleatorio por registro; verificar con pruebas Vitest de ida y vuelta, de contraseña incorrecta y de IV distinto en cada cifrado
- [x] 2.2 Implementar el verificador de contraseña (valor conocido cifrado) y las funciones de crear y desbloquear; verificar con pruebas que la contraseña correcta desbloquea y la incorrecta se rechaza sin guardar la contraseña ni la clave
- [x] 2.3 Implementar la capa IndexedDB con almacenes `ajustes` y `rodales` (registros cifrados con `id`) y CRUD; verificar con pruebas sobre `fake-indexeddb` que lo almacenado no contiene texto en claro de especies ni notas
- [x] 2.4 Implementar el cambio de contraseña con re-cifrado de todos los rodales y verificar con pruebas que la antigua deja de funcionar y que un fallo a mitad no deja datos corruptos
- [ ] 2.5 Medir el tiempo de PBKDF2 en un iPhone real y fijar el número de iteraciones; documentar el valor y el tiempo medido en `README.md`

## 3. Pantalla de bloqueo

- [x] 3.1 Implementar la pantalla de primer uso (crear y confirmar contraseña, longitud mínima de 8 caracteres, advertencia de pérdida de datos) y verificar con pruebas de interfaz que las contraseñas distintas o cortas no continúan
- [x] 3.2 Implementar la pantalla de contraseña al iniciar y verificar que, bloqueada, el DOM no contiene datos de rodales y que una contraseña incorrecta permite reintentar
- [x] 3.3 Implementar bloqueo manual y bloqueo tras más de 5 minutos en segundo plano (`visibilitychange`) y verificar con pruebas con reloj simulado que se descarta la clave y se vuelve a pedir la contraseña
- [x] 3.4 Implementar la pantalla de cambio de contraseña usando la tarea 2.4 y verificar el flujo correcto y el de contraseña actual incorrecta

## 4. Registro de rodales

- [x] 4.1 Implementar el módulo de geolocalización (`watchPosition` de alta precisión, limpieza del `watch`, manejo de permiso denegado y entrada manual de coordenadas); verificar con pruebas con la API simulada, incluido el aviso con precisión peor de 50 m
- [x] 4.2 Implementar el formulario de nuevo rodal (ubicación y precisión visibles, múltiples especies, notas, fecha automática, mínimo una especie) y verificar con pruebas de validación y de guardado con una y varias especies
- [x] 4.3 Implementar el autocompletado de especies a partir de los rodales descifrados en memoria y verificar con pruebas la sugerencia por prefijo y la incorporación de una especie nueva
- [x] 4.4 Implementar el listado ordenado de más reciente a más antiguo con estado vacío, y verificar con pruebas el orden y el estado vacío
- [x] 4.5 Implementar la edición de especies y notas (conservando `creadoEn` y actualizando `actualizadoEn`) y el borrado con confirmación; verificar con pruebas los casos de confirmar y cancelar
- [ ] 4.6 Verificar manualmente en modo avión que crear, editar y borrar un rodal funciona sin errores de red

## 5. Mapa y vista sin conexión

- [ ] 5.1 Implementar la vista de mapa con Leaflet, teselas de OpenStreetMap con atribución, marcadores de los rodales y detalle al pulsar; verificar manualmente que cada rodal aparece en su posición con fecha, especies y notas
- [ ] 5.2 Mostrar la posición actual en el mapa con botón de centrar y verificar manualmente con y sin permiso de ubicación
- [x] 5.3 Implementar Haversine y rumbo inicial y la lista por cercanía como alternativa sin red; verificar con pruebas de valores conocidos y con la vista sin red, con y sin posición
- [x] 5.4 Implementar el ajuste de posición arrastrando el marcador con confirmación y verificar que se guardan las nuevas coordenadas sin tocar el resto de campos
- [ ] 5.5 Verificar en la pestaña de red del navegador que las únicas peticiones externas son teselas y que no incluyen coordenadas de rodales, especies ni notas

## 6. Copia de seguridad

- [x] 6.1 Implementar la exportación al formato `{version, sal, iteraciones, iv, datos}` cifrado, con `navigator.share({files})` y descarga como alternativa; verificar con pruebas que el contenido no es legible y que ambas vías se eligen según `canShare`
- [x] 6.2 Implementar la importación con petición de contraseña, validación de formato antes de tocar datos y fusión por `id` con preferencia por `actualizadoEn`; verificar con pruebas contraseña incorrecta, archivo corrupto, doble importación sin duplicados e importación en una base vacía
- [x] 6.3 Guardar la fecha de última exportación y mostrar el aviso tras más de 30 días con rodales nuevos; verificar con pruebas con reloj simulado
- [ ] 6.4 Verificar manualmente en el iPhone que la hoja de compartir guarda el archivo en Archivos y que se importa en una instalación limpia

## 7. PWA y despliegue

- [ ] 7.1 Crear el manifiesto (nombre, iconos, `display: standalone`, color de tema) e iconos para iOS (incluido `apple-touch-icon`); verificar con Lighthouse que la app es instalable
- [ ] 7.2 Configurar el service worker con precache del shell y aviso de nueva versión; verificar que, tras una visita con red, la app carga en modo avión
- [x] 7.3 Solicitar `navigator.storage.persist()` tras el primer desbloqueo, registrar el resultado y mostrar la indicación de copia si no se concede; verificar con pruebas con la API simulada
- [ ] 7.4 Implementar la detección de Safari no instalado en iOS con instrucciones de instalación y aviso de almacenamiento; verificar con pruebas de la lógica de detección y manualmente en el iPhone
- [ ] 7.5 Crear el workflow de GitHub Actions (instalar, probar, construir con `base`, `actions/deploy-pages`) y verificar que un push a la rama principal publica la versión
- [ ] 7.6 Documentar en `README.md` la instalación en iPhone, el uso, la advertencia de contraseña y copia, y las limitaciones de iOS; verificar que los pasos se pueden seguir tal cual en una instalación limpia

## 8. Verificación integral

- [ ] 8.1 Recorrer en un iPhone real, con la app instalada desde Pages, todos los escenarios de las specs (primer uso, bloqueo, crear sin cobertura, mapa con red, exportar e importar), anotando el resultado
- [ ] 8.2 Probar la re-solicitud de permiso de ubicación en modo standalone y documentar el comportamiento observado en `README.md`
- [ ] 8.3 Revisar el repositorio y el sitio publicado para confirmar que no contienen rodales, contraseñas ni claves, y que `openspec validate app-rodales-setas --strict` pasa

## Workflow follow-up

- Archivar el change tras la revisión y la verificación en dispositivo.
