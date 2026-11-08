# Proposal

## Why

Quien recolecta setas necesita anotar en el momento dónde encuentra cada rodal, normalmente en el monte y sin cobertura. Hoy no hay una forma rápida y privada de hacerlo: las apps de mapas generales exigen red o cuenta, y los rodales son información sensible que no debe salir del dispositivo. Como la app es de uso personal en un único iPhone, la privacidad se logra no enviando nada a ningún servidor; la protección del acceso al dispositivo es la del propio iPhone.

## What Changes

- Nueva PWA estática, alojada en GitHub Pages e instalable en iPhone, para registrar y consultar rodales de setas.
- Captura rápida de un rodal: geolocalización del dispositivo (lat, lng y precisión), fecha y hora automáticas, una o varias especies (con autocompletado a partir de las ya usadas) y notas de texto libre.
- Guardar un rodal funciona siempre, sin cobertura. Solo el mapa base necesita red.
- Almacenamiento solo local en IndexedDB, **sin contraseña ni cifrado**: la app abre directamente. La protección frente a terceros es la del propio iPhone (código o Face ID); quien use el móvil desbloqueado puede ver los rodales.
- Listado y mapa online de los rodales guardados. Con red se ven sobre el mapa. Sin red se ve el listado con coordenadas, y la distancia y el rumbo hasta cada rodal desde la posición actual.
- Exportación e importación de una copia de seguridad en un archivo JSON legible y **sin cifrar** (Web Share API en iOS), como protección frente a pérdida del dispositivo o purga del almacenamiento. La app avisa de que el archivo no está cifrado y de que no debe publicarse.
- Solicitud de almacenamiento persistente (`navigator.storage.persist()`) y avisos sobre las particularidades de iOS: el almacenamiento de Safari y el de la PWA instalada están separados, y el permiso de geolocalización puede volver a pedirse en modo standalone.
- Despliegue automático a GitHub Pages con GitHub Actions desde un repositorio público que nunca contiene datos de usuario.

Fuera de alcance en esta versión: mapas offline, fotos, sincronización entre dispositivos, cuentas de usuario, y contraseña o cifrado de los datos de la app (decisión del usuario: la protección es la del iPhone).

## Capabilities

### New Capabilities
- `registro-rodales`: creación, edición, borrado y listado de rodales (ubicación, precisión, fecha, especies, notas) y autocompletado de especies, con funcionamiento sin conexión.
- `copia-seguridad`: exportación e importación de un archivo JSON legible, sin cifrar, con todos los rodales, y aviso de que el archivo no está protegido.
- `mapa-rodales`: visualización de los rodales sobre un mapa online y alternativa sin red con distancia y rumbo.
- `pwa-despliegue`: instalabilidad en iPhone, service worker para uso sin conexión de la app, almacenamiento persistente y despliegue en GitHub Pages.

### Modified Capabilities
<!-- Ninguna: el proyecto no tiene specs previas. -->

## Impact

- Proyecto nuevo sin código previo: se crea toda la aplicación web (HTML, JS, manifest, service worker).
- Dependencias previstas: librería de mapas (Leaflet o MapLibre), proveedor de teselas online y una librería ligera para IndexedDB.
- Infraestructura: repositorio público en GitHub, GitHub Pages y un workflow de GitHub Actions. No hay backend ni base de datos remota.
- Privacidad: la ubicación y las especies nunca salen del dispositivo, salvo en la copia de seguridad (sin cifrar) que decida compartir el usuario. Los datos locales están en claro, así que dependen de la protección del iPhone. Las teselas del mapa se piden a un proveedor externo, que puede ver la zona consultada pero no los rodales.
- Datos de versiones de prueba anteriores (cifrados con contraseña) se descartan, sin migración: eran solo pruebas.
