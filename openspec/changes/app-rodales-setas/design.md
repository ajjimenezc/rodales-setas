# Design

## Context

Proyecto nuevo sin código. La motivación y el alcance están en `proposal.md` y los requisitos en `specs/`. Restricciones que condicionan el enfoque:

- Hosting estático gratuito (GitHub Pages): sin backend, sin secretos en servidor, repositorio público.
- Dispositivo objetivo: iPhone con la PWA instalada. Safari tiene particularidades: el almacenamiento de la PWA instalada está aislado del de Safari, puede purgar datos de webs no instaladas y la geolocalización puede volver a pedir permiso en modo standalone.
- La geolocalización y WebCrypto exigen contexto seguro; GitHub Pages sirve por HTTPS.
- Sin cobertura en el monte: la captura no puede depender de la red.

## Goals / Non-Goals

**Goals:**
- Captura de un rodal en pocos toques con una mano, sin depender de la red.
- Datos ilegibles en el dispositivo sin la contraseña.
- Mantenimiento mínimo: sin servidor, con pocas dependencias y despliegue automático.

**Non-Goals:**
- Proteger frente a un atacante que ya controla el dispositivo desbloqueado con la app abierta.
- Recuperar datos si se pierde la contraseña.
- Mapa offline, fotos, sincronización o multiusuario.

## Decisions

### D1. Vite con JavaScript sin framework (módulos ES)
Vite da dev server, build con `base` configurable para la subruta de Pages y un plugin PWA. La UI son pocas pantallas (bloqueo, lista, formulario, mapa, ajustes) que no justifican un framework.
- Alternativa: HTML y JS sin build. Más simple, pero el service worker con precache y el `base` se vuelven manuales y propensos a errores.
- Alternativa: React o Svelte. Más estructura de la necesaria para cinco pantallas; mayor peso y superficie de dependencias.

### D2. Leaflet para el mapa, con teselas de OpenStreetMap
Leaflet es pequeño, estable y suficiente para marcadores y arrastre. Basta con teselas raster bajo demanda, y el mapa online ya fue aceptado como alcance de v1.
- Alternativa: MapLibre GL. Mejor para mapas vectoriales y futuro mapa offline (PMTiles), pero más pesado y necesita WebGL. Si en el futuro se añade mapa offline se reevaluará.
- Teselas: la política de uso de OSM permite uso ligero bajo demanda con atribución, pero no la descarga masiva. Es válido para uso personal; si crece el uso se cambiará a un proveedor con clave.
- Ninguna petición lleva datos de rodales; solo las coordenadas de las teselas visibles.

### D3. IndexedDB con una capa fina de acceso (`idb`)
Los datos viven en IndexedDB, más robusta y con más cuota que `localStorage`, y accesible desde el service worker si hiciera falta.
- Alternativa: `localStorage`. Síncrono, límite pequeño y más fácil de purgar.

### D4. Cifrado con WebCrypto: PBKDF2 y AES-GCM
```
 contraseña --PBKDF2(sal, N iteraciones)--> clave AES-GCM 256 (en memoria)
                                                  |
 rodal (JSON) --AES-GCM(IV aleatorio)--> {iv, ciphertext} --> IndexedDB
```
- La sal se guarda en claro junto a un «verificador»: un valor conocido cifrado con la clave. Descifrarlo comprueba la contraseña sin guardarla.
- Un registro cifrado por rodal, cada uno con su IV aleatorio de 12 bytes. Así se guarda y se edita sin re-cifrar todo.
- Iteraciones de PBKDF2: lo más alto que dé un arranque tolerable en iPhone (objetivo del orden de 600 000 con SHA-256, a medir en el dispositivo).
- La clave solo existe en memoria como `CryptoKey` no extraíble; se descarta al bloquear.
- Alternativa: Argon2 por WASM. Mejor resistencia, pero añade una dependencia y complejidad para un caso con un único usuario y un atacante que ya tiene el dispositivo físico. Se deja como mejora posible.
- Alternativa: solo pantalla de contraseña sin cifrado. Descartada: el código es público y los datos serían legibles desde las herramientas del navegador.
- El texto de especies para autocompletado se deriva de los rodales descifrados en memoria, nunca se guarda en claro.

### D5. Formato de la copia de seguridad
Un archivo JSON con `{version, sal, iteraciones, iv, datos}`, donde `datos` es el conjunto de rodales cifrado con AES-GCM. La clave se deriva de la contraseña actual con su propia sal.
- Cada rodal tiene un `id` UUID generado al crearlo. La fusión al importar es por `id`; ante un mismo `id`, gana el de `actualizadoEn` más reciente.
- El campo `version` permite evolucionar el formato.
- Exportar usa `navigator.share({files})` si `canShare` lo permite y, si no, descarga mediante enlace temporal.
- Se cifra con la clave de la app ya derivada y en memoria; el archivo lleva la sal y las iteraciones de la app para poder derivar la misma clave al importar. Así «Exportar» abre la hoja de compartir sin volver a pedir la contraseña (decisión tomada en la implementación; sustituye a la idea inicial de una sal propia por exportación).
- La contraseña del archivo es la de la app en el momento de exportar. Al importar se pide por si cambió después.
- Al importar se valida todo (formato, descifrado y cada rodal) antes de escribir, y la escritura es una única transacción.
- El archivo se llama `rodales-AAAA-MM-DD.json` y está en `.gitignore`.

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
Ajustes (en claro): { sal, iteraciones, verificador, ultimaExportacion, persistenciaConcedida }
```
Solo el contenido de los rodales va cifrado. Los ajustes no contienen datos sensibles. `ultimaExportacion` se guarda sin cifrar por simplicidad.

### D7. Captura de ubicación
`watchPosition` con alta precisión mientras el formulario está abierto: se muestra la mejor lectura y se mejora hasta que la precisión sea aceptable o el usuario guarde. Se limpia el `watch` al cerrar. Si falla, se ofrece entrada manual.
- El formulario guarda sin esperar a la red en ningún momento.
- El permiso de geolocalización puede volver a pedirse en standalone; la interfaz lo tolera y explica el estado.

### D8. Vista sin conexión: distancia y rumbo
Distancia por fórmula de Haversine y rumbo inicial calculado con las coordenadas, ordenados por cercanía. No requiere red. Sin posición, solo se muestran las coordenadas.

### D9. Service worker y persistencia
Precache del shell de la aplicación mediante el plugin PWA de Vite (Workbox) con estrategia de actualización que avisa al usuario. Las teselas no se precachean en v1; se pueden mantener en caché de ejecución limitada para reducir peticiones repetidas, sin garantías de offline.
- `navigator.storage.persist()` tras el primer desbloqueo, registrando el resultado.
- Detección de modo standalone por `navigator.standalone` y `display-mode` para el aviso de iOS.

### D10. Bloqueo por inactividad
`visibilitychange`: al pasar a segundo plano se guarda la hora; al volver, si han pasado más de 5 minutos, se descarta la clave y se vuelve a la pantalla de contraseña.

### D11. Despliegue
Workflow de GitHub Actions: instalar dependencias, `vite build` con `base` igual al nombre del repositorio y publicación con `actions/deploy-pages`. Repositorio público; `.gitignore` excluye exportaciones locales (`*.rodales`) por seguridad.

### D12. Pruebas
Pruebas unitarias con Vitest de las partes puras: cifrado y descifrado, fusión de importación, Haversine y rumbo, validación del formulario. IndexedDB se prueba con `fake-indexeddb`. La verificación en iPhone (geolocalización, instalación, compartir) es manual y está listada en las tareas.

## Risks / Trade-offs

- **Olvidar la contraseña pierde los datos** → Advertencia clara al crearla, copia de seguridad cifrada recomendada y recordatorio a los 30 días.
- **iOS purga el almacenamiento o los datos quedan en Safari y no en la app instalada** → Aviso en Safari, `persist()`, instrucciones de instalación antes del primer rodal y exportación sencilla.
- **GPS impreciso bajo arbolado** → Mostrar y guardar la precisión, avisar si es mala y permitir ajustar el punto en el mapa.
- **PBKDF2 es menos resistente que Argon2 frente a ataques con GPU** → Contraseña robusta recomendada y número alto de iteraciones; Argon2 queda como mejora futura.
- **La contraseña con pocos caracteres es vulnerable a fuerza bruta sobre una copia exportada** → Exigir una longitud mínima de 8 caracteres y avisar de que la copia exportada se protege solo por ella.
- **Las teselas de OSM revelan al proveedor la zona consultada** → Aceptado en v1 y documentado; los rodales no se envían.
- **Código público** → El cifrado no depende del secreto del código, y el repositorio nunca contiene datos.
- **Re-solicitud de permiso de ubicación en standalone** → Se prueba en el dispositivo y se explica en la interfaz; sin solución técnica propia.

## Migration Plan

No hay datos previos que migrar. Despliegue inicial: crear el repositorio público, activar Pages con origen «GitHub Actions» y hacer el primer push. Retroceso: volver a desplegar el commit anterior; los datos locales no dependen del servidor. El campo `version` en la copia y un número de versión del esquema de IndexedDB permiten migraciones futuras.

## Open Questions

- Nombre del repositorio y, por tanto, la subruta de Pages (afecta solo a la configuración de `base`).
- Idioma de la interfaz: se asume español.
