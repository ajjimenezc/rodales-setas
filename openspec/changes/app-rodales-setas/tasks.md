# Tasks

## 1. Andamiaje del proyecto

- [ ] 1.1 Inicializar el proyecto Vite con JavaScript, estructura `src/` por módulos (`db`, `ui`, `geo`, `mapa`) y `.gitignore` que excluya `node_modules`, `dist` y `*.rodales`; verificar que `npm run dev` arranca y sirve una página vacía
- [x] 1.2 Añadir dependencias (`leaflet`, `idb`, `vite-plugin-pwa`, `vitest`, `fake-indexeddb`) y verificar que `npm install` y `npm test` (sin pruebas aún) terminan sin errores
- [x] 1.3 Configurar `base` de Vite desde una variable de entorno para la subruta de Pages y verificar que `npm run build` genera rutas relativas a esa base en `dist/index.html`

## 2. Almacenamiento local en claro

- [x] 2.1 Eliminar el módulo `src/crypto/` (derivación de clave, cifrado y gestión de contraseña) con sus pruebas y todas sus referencias; verificar con `grep` que no quedan referencias a `crypto/`, PBKDF2 ni AES en `src/` y que `npm test` compila y pasa
- [x] 2.2 Pasar la capa IndexedDB a registros en claro (rodales con sus campos y `id` como clave; ajustes `{ultimaExportacion, persistenciaConcedida}`) y subir el esquema a la versión 2 vaciando los almacenes cifrados de las versiones de prueba; verificar con pruebas sobre `fake-indexeddb` el CRUD, el guardado de varios rodales en una única transacción y que abrir una base de la versión 1 con datos cifrados la deja vacía y utilizable

## 3. Arranque sin contraseña

- [x] 3.1 Quitar las pantallas de crear, desbloquear y cambiar contraseña, el bloqueo manual y por inactividad y los botones «Contraseña» y «Bloquear»; la app abre directamente en el listado; verificar con pruebas de interfaz que al arrancar se ve el listado sin pedir nada y que no existe ningún campo de contraseña ni botón de bloqueo
- [x] 3.2 Adaptar el controlador y las pruebas de interfaz existentes (rodales, mapa, copia, PWA) al arranque sin desbloqueo; verificar que `npm test` pasa completo y que `npm run build` compila

## 4. Registro de rodales

- [x] 4.1 Implementar el módulo de geolocalización (`watchPosition` de alta precisión, limpieza del `watch`, manejo de permiso denegado y entrada manual de coordenadas); verificar con pruebas con la API simulada, incluido el aviso con precisión peor de 50 m
- [x] 4.2 Implementar el formulario de nuevo rodal (ubicación y precisión visibles, múltiples especies, notas, fecha automática, mínimo una especie) y verificar con pruebas de validación y de guardado con una y varias especies
- [x] 4.3 Implementar el autocompletado de especies a partir de los rodales guardados y verificar con pruebas la sugerencia por prefijo y la incorporación de una especie nueva
- [x] 4.4 Implementar el listado ordenado de más reciente a más antiguo con estado vacío, y verificar con pruebas el orden y el estado vacío
- [x] 4.5 Implementar la edición de especies y notas (conservando `creadoEn` y actualizando `actualizadoEn`) y el borrado con confirmación; verificar con pruebas los casos de confirmar y cancelar
- [ ] 4.6 Verificar manualmente en modo avión que crear, editar y borrar un rodal funciona sin errores de red

## 5. Mapa y vista sin conexión

- [ ] 5.1 Implementar la vista de mapa con Leaflet, teselas de OpenStreetMap con atribución, marcadores de los rodales y detalle al pulsar; verificar manualmente que el mapa ocupa todo el recuadro y que cada rodal aparece en su posición con fecha, especies y notas
- [ ] 5.2 Mostrar la posición actual en el mapa con botón de centrar y verificar manualmente con y sin permiso de ubicación
- [x] 5.3 Implementar Haversine y rumbo inicial y la lista por cercanía como alternativa sin red; verificar con pruebas de valores conocidos y con la vista sin red, con y sin posición
- [x] 5.4 Implementar el ajuste de posición arrastrando el marcador con confirmación y verificar que se guardan las nuevas coordenadas sin tocar el resto de campos
- [ ] 5.5 Verificar en la pestaña de red del navegador que las únicas peticiones externas son teselas y que no incluyen coordenadas de rodales, especies ni notas

## 6. Copia de seguridad

- [x] 6.1 Implementar la exportación a un JSON legible `{formato, version: 2, exportadoEn, rodales}` sin cifrar, con `navigator.share({files})` y descarga como alternativa, y con el aviso en la pantalla de que el archivo no está cifrado; verificar con pruebas que el archivo contiene los rodales en claro, que ambas vías se eligen según `canShare`, que cancelar la hoja de compartir no registra la copia y que el aviso se muestra
- [x] 6.2 Implementar la importación sin contraseña, con validación del formato y de cada rodal antes de tocar datos y fusión por `id` con preferencia por `actualizadoEn`; verificar con pruebas archivo corrupto, rodal inválido que rechaza todo, copia cifrada de la versión anterior rechazada como no compatible, doble importación sin duplicados e importación en una base vacía
- [x] 6.3 Guardar la fecha de última exportación y mostrar el aviso tras más de 30 días con rodales nuevos; verificar con pruebas con reloj simulado
- [ ] 6.4 Verificar manualmente en el iPhone que la hoja de compartir guarda el archivo en Archivos y que se importa en una instalación limpia

## 7. PWA y despliegue

- [ ] 7.1 Crear el manifiesto (nombre, iconos, `display: standalone`, color de tema) e iconos para iOS (incluido `apple-touch-icon`); verificar con Lighthouse que la app es instalable
- [ ] 7.2 Configurar el service worker con precache del shell y aviso de nueva versión; verificar que, tras una visita con red, la app carga en modo avión
- [x] 7.3 Solicitar `navigator.storage.persist()` al arrancar la app, registrar el resultado y mostrar la indicación de copia si no se concede; verificar con pruebas con la API simulada
- [ ] 7.4 Implementar la detección de Safari no instalado en iOS con instrucciones de instalación y aviso de almacenamiento; verificar con pruebas de la lógica de detección y manualmente en el iPhone
- [ ] 7.5 Crear el workflow de GitHub Actions (instalar, probar, construir con `base`, `actions/deploy-pages`) y verificar que un push a la rama principal publica la versión
- [ ] 7.6 Actualizar `README.md` (instalación en iPhone, uso, aviso de que el archivo de copia no está cifrado y de que la protección es la del iPhone, limitaciones de iOS) sin referencias a contraseña ni cifrado; verificar con `grep` que no quedan y que los pasos se pueden seguir tal cual en una instalación limpia

## 8. Verificación integral

- [ ] 8.1 Recorrer en un iPhone real, con la app instalada desde Pages, todos los escenarios de las specs (arranque directo, crear sin cobertura, mapa con red, exportar e importar), anotando el resultado
- [ ] 8.2 Probar la re-solicitud de permiso de ubicación en modo standalone y documentar el comportamiento observado en `README.md`
- [ ] 8.3 Revisar el repositorio y el sitio publicado para confirmar que no contienen rodales, copias de seguridad, credenciales ni claves, y que `openspec validate app-rodales-setas --strict` pasa

## Workflow follow-up

- Archivar el change tras la revisión y la verificación en dispositivo.
