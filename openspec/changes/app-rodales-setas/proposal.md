# Proposal

## Why

Quien recolecta setas necesita anotar en el momento dónde encuentra cada rodal, normalmente en el monte y sin cobertura. Hoy no hay una forma rápida y privada de hacerlo: las apps de mapas generales exigen red o cuenta, y los rodales son información sensible que no debe salir del dispositivo.

## What Changes

- Nueva PWA estática, alojada en GitHub Pages e instalable en iPhone, para registrar y consultar rodales de setas.
- Captura rápida de un rodal: geolocalización del dispositivo (lat, lng y precisión), fecha y hora automáticas, una o varias especies (con autocompletado a partir de las ya usadas) y notas de texto libre.
- Guardar un rodal funciona siempre, sin cobertura. Solo el mapa base necesita red.
- Almacenamiento solo local en IndexedDB, cifrado con una clave derivada de una contraseña (WebCrypto). La app pide la contraseña al iniciar. Olvidar la contraseña implica perder los datos.
- Listado y mapa online de los rodales guardados. Con red se ven sobre el mapa. Sin red se ve el listado con coordenadas, y la distancia y el rumbo hasta cada rodal desde la posición actual.
- Exportación e importación de una copia de seguridad en un archivo JSON cifrado (Web Share API en iOS), como protección frente a pérdida del dispositivo o purga del almacenamiento.
- Solicitud de almacenamiento persistente (`navigator.storage.persist()`) y avisos sobre las particularidades de iOS: el almacenamiento de Safari y el de la PWA instalada están separados, y el permiso de geolocalización puede volver a pedirse en modo standalone.
- Despliegue automático a GitHub Pages con GitHub Actions desde un repositorio público que nunca contiene datos de usuario.

Fuera de alcance en esta versión: mapas offline, fotos, sincronización entre dispositivos y cuentas de usuario.

## Capabilities

### New Capabilities
- `registro-rodales`: creación, edición, borrado y listado de rodales (ubicación, precisión, fecha, especies, notas) y autocompletado de especies, con funcionamiento sin conexión.
- `bloqueo-cifrado`: pantalla de contraseña al iniciar, derivación de clave, cifrado de los datos en reposo y bloqueo de la app.
- `copia-seguridad`: exportación e importación de un archivo cifrado con todos los rodales.
- `mapa-rodales`: visualización de los rodales sobre un mapa online y alternativa sin red con distancia y rumbo.
- `pwa-despliegue`: instalabilidad en iPhone, service worker para uso sin conexión de la app, almacenamiento persistente y despliegue en GitHub Pages.

### Modified Capabilities
<!-- Ninguna: el proyecto no tiene specs previas. -->

## Impact

- Proyecto nuevo sin código previo: se crea toda la aplicación web (HTML, JS, manifest, service worker).
- Dependencias previstas: librería de mapas (Leaflet o MapLibre), proveedor de teselas online y una librería ligera para IndexedDB.
- Infraestructura: repositorio público en GitHub, GitHub Pages y un workflow de GitHub Actions. No hay backend ni base de datos remota.
- Privacidad: la ubicación y las especies nunca salen del dispositivo, salvo en la copia de seguridad cifrada que decida compartir el usuario. Las teselas del mapa se piden a un proveedor externo, que puede ver la zona consultada pero no los rodales.
