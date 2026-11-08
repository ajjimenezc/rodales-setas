# Design

## Context

Proyecto nuevo. La motivación y el alcance están en `proposal.md` y los requisitos en `specs/`. Restricciones que condicionan el enfoque:

- Hosting estático gratuito (GitHub Pages): sin backend, sin secretos en servidor, repositorio público.
- Dispositivo objetivo: iPhone con la PWA instalada. Safari tiene particularidades: el almacenamiento de la PWA instalada está aislado del de Safari, puede purgar datos de webs no instaladas y la geolocalización puede volver a pedir permiso en modo standalone.
- La geolocalización exige contexto seguro; GitHub Pages sirve por HTTPS.
- Sin cobertura en el monte: la captura no puede depender de la red.
- Uso personal en un único dispositivo: no hay contraseña de app ni cifrado de datos (decisión del usuario, ver D4).

## Goals / Non-Goals

**Goals:**
- Captura de un rodal en pocos toques con una mano, sin depender de la red.
- Los datos viven solo en el dispositivo: sin cuentas, sin servidor y sin peticiones que los contengan.
- Mantenimiento mínimo: sin servidor, con pocas dependencias y despliegue automático.

**Non-Goals:**
- Proteger los datos frente a quien tenga el iPhone desbloqueado o acceda a su almacenamiento: no hay contraseña de la app ni cifrado.
- Cifrar el archivo de copia de seguridad.
- Mapa offline, fotos, sincronización o multiusuario.

## Decisions

### D1. Vite con JavaScript sin framework (módulos ES)
Vite da dev server, build con `base` configurable para la subruta de Pages y un plugin PWA. La UI son pocas pantallas (lista, formulario, mapa, copia) que no justifican un framework.
- Alternativa: HTML y JS sin build. Más simple, pero el service worker con precache y el `base` se vuelven manuales y propensos a errores.
- Alternativa: React o Svelte. Más estructura de la necesaria para pocas pantallas; mayor peso y superficie de dependencias.

### D2. Leaflet para el mapa, con teselas de OpenStreetMap
Leaflet es pequeño, estable y suficiente para marcadores y arrastre. Basta con teselas raster bajo demanda, y el mapa online ya fue aceptado como alcance de v1.
- Alternativa: MapLibre GL. Mejor para mapas vectoriales y futuro mapa offline (PMTiles), pero más pesado y necesita WebGL. Si en el futuro se añade mapa offline se reevaluará.
- Teselas: la política de uso de OSM permite uso ligero bajo demanda con atribución, pero no la descarga masiva. Es válido para uso personal; si crece el uso se cambiará a un proveedor con clave.
- Ninguna petición lleva datos de rodales; solo las coordenadas de las teselas visibles.
- El contenedor del mapa se observa con `ResizeObserver`: el mapa se crea antes de que el nodo esté en el DOM y Leaflet mediría 0×0 (teselas solo en una esquina).

### D3. IndexedDB con una capa fina de acceso (`idb`)
Los datos viven en IndexedDB, más robusta y con más cuota que `localStorage`. Los rodales se guardan **en claro**, un registro por rodal con su `id` como clave.
- Alternativa: `localStorage`. Síncrono, límite pequeño y más fácil de purgar.
- El esquema lleva número de versión. La versión 2 (esta) elimina los almacenes cifrados de las versiones de prueba, ver Migration Plan.

### D4. Sin contraseña ni cifrado
La app abre directamente y guarda los rodales en claro. Decisión del usuario: es de uso personal, en un único iPhone, y la protección frente a terceros es la del propio móvil (código o Face ID).
- La versión inicial del diseño cifraba con PBKDF2 y AES-GCM y pedía contraseña al arrancar. Se retira entera: pantalla de contraseña, derivación de clave, verificador, bloqueo manual y por inactividad, y cambio de contraseña.
- Alternativa descartada: cifrado «transparente» con una clave aleatoria guardada en el propio navegador. La clave estaría junto a los datos, así que daría una falsa sensación de protección.
- Alternativa descartada: mantener contraseña opcional. Más código y más estados (primer uso, bloqueo, cambio) para un caso de uso personal.
- Consecuencia asumida: quien use el iPhone desbloqueado, o acceda a su copia de seguridad del sistema, puede ver los rodales.
- Se elimina el riesgo de perder los datos por olvidar la contraseña.

### D5. Formato de la copia de seguridad
Un archivo JSON legible `{formato, version, exportadoEn, rodales}`. Sin cifrado ni contraseña.
- Cada rodal tiene un `id` UUID generado al crearlo. La fusión al importar es por `id`; ante un mismo `id`, gana el de `actualizadoEn` más reciente.
- `formato` identifica el archivo; `version` es 2 porque la versión 1 estaba cifrada. Al importar, una copia con otra versión (incluida la 1, cifrada) se rechaza como no compatible sin tocar los datos.
- Exportar usa `navigator.share({files})` si `canShare` lo permite y, si no, descarga mediante enlace temporal. Cerrar la hoja de compartir no cuenta como exportación.
- Al importar se valida todo (formato y cada rodal) antes de escribir, y la escritura es una única transacción.
- La pantalla de copia avisa de que el archivo no está cifrado y de que no debe publicarse.
- El archivo se llama `rodales-AAAA-MM-DD.json` y está en `.gitignore`; el CI además falla si hay copias versionadas.

### D6. Modelo de datos
```
Rodal {
  id: uuid
  lat, lng: number
  precision: metros
  creadoEn, actualizadoEn: ISO 8601
  especies: string[]   // al menos una
  notas: string
}
Ajustes: { ultimaExportacion, persistenciaConcedida }
```
Todo se guarda en claro. El texto de especies para autocompletado se deriva de los rodales guardados.

### D7. Captura de ubicación
`watchPosition` con alta precisión mientras el formulario está abierto: se muestra la mejor lectura y se mejora hasta que la precisión sea aceptable o el usuario guarde. Se limpia el `watch` al cerrar. Si falla, se ofrece entrada manual.
- El formulario guarda sin esperar a la red en ningún momento.
- El permiso de geolocalización puede volver a pedirse en standalone; la interfaz lo tolera y explica el estado.

### D8. Vista sin conexión: distancia y rumbo
Distancia por fórmula de Haversine y rumbo inicial calculado con las coordenadas, ordenados por cercanía. No requiere red. Sin posición, solo se muestran las coordenadas.

### D9. Service worker y persistencia
Precache del shell de la aplicación mediante el plugin PWA de Vite (Workbox) con estrategia de actualización que avisa al usuario. Las teselas no se cachean: guardarlas dejaría en el dispositivo un rastro de las zonas consultadas.
- `navigator.storage.persist()` al arrancar la app, registrando el resultado.
- Detección de modo standalone por `navigator.standalone` y `display-mode` para el aviso de iOS.

### D10. Despliegue
Workflow de GitHub Actions: instalar dependencias, probar, `vite build` con `base` igual al nombre del repositorio y publicación con `actions/deploy-pages`. Repositorio público; `.gitignore` excluye las copias de seguridad (`rodales-*.json`, `*.rodales`) y el workflow falla si alguna está versionada, porque ahora son legibles.

### D11. Pruebas
Pruebas unitarias con Vitest de las partes puras: fusión de importación, Haversine y rumbo, validación del formulario y del archivo de copia. IndexedDB se prueba con `fake-indexeddb`. La verificación en iPhone (geolocalización, instalación, compartir) es manual y está listada en las tareas.

## Risks / Trade-offs

- **Quien use el iPhone desbloqueado ve todos los rodales** → Aceptado por el usuario; la protección es el código o Face ID del móvil. El README lo dice con claridad.
- **El archivo de copia es legible y puede acabar en un sitio público** → Aviso en la pantalla de copia, `.gitignore` y comprobación en el CI para que no se versione.
- **Los datos quedan en claro en el almacenamiento del navegador y en las copias de seguridad del sistema del iPhone** → Aceptado; no hay mitigación técnica sin cifrado.
- **iOS purga el almacenamiento o los datos quedan en Safari y no en la app instalada** → Aviso en Safari, `persist()`, instrucciones de instalación antes del primer rodal y exportación sencilla.
- **GPS impreciso bajo arbolado** → Mostrar y guardar la precisión, avisar si es mala y permitir ajustar el punto en el mapa.
- **Las teselas de OSM revelan al proveedor la zona consultada** → Aceptado en v1 y documentado; los rodales no se envían.
- **Código público** → El repositorio nunca contiene datos ni copias de seguridad.
- **Re-solicitud de permiso de ubicación en standalone** → Se prueba en el dispositivo y se explica en la interfaz; sin solución técnica propia.

## Migration Plan

Los datos de las versiones de prueba anteriores (cifrados con contraseña) se descartan sin migrar: el usuario confirmó que eran solo pruebas. El esquema de IndexedDB sube a la versión 2 y, al actualizar, se vacían los almacenes antiguos para que la app arranque limpia sin pedir contraseña. Una copia cifrada generada por la versión anterior no se puede importar.

Despliegue: push a la rama principal y el workflow publica. Retroceso: volver a desplegar el commit anterior; los datos locales no dependen del servidor. El campo `version` en la copia y el número de versión del esquema de IndexedDB permiten migraciones futuras.

## Open Questions

- Idioma de la interfaz: se asume español.
