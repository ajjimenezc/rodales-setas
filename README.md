# Rodales de setas

PWA para anotar, con tu geolocalización, los rodales donde encuentras setas. Pensada para iPhone y para el monte: **guardar un rodal funciona sin cobertura**. Los datos se quedan en tu dispositivo; no hay servidor, cuentas ni contraseña.

## Lo que debes saber antes de usarla

- **No hay contraseña ni cifrado.** La app abre directamente. La protección de tus rodales es la de tu iPhone (código o Face ID): quien use tu móvil desbloqueado puede verlos.
- **Los datos solo existen en tu iPhone.** Si lo pierdes o iOS borra los datos del navegador, sin copia de seguridad se pierden. Exporta una copia con regularidad (botón **Copia**). La app avisa si pasan más de 30 días con rodales sin exportar.
- **El archivo de copia no está cifrado.** Es un JSON legible con la ubicación de tus rodales. No lo publiques, no lo subas a este repositorio ni lo guardes en sitios públicos. Está en `.gitignore` y el despliegue falla si alguien lo versiona por error.
- El mapa necesita conexión. Sin ella la app te muestra tus rodales ordenados por cercanía, con distancia y rumbo desde tu posición.
- Las teselas del mapa las sirve OpenStreetMap, que puede ver la zona que consultas. Nunca recibe tus rodales, especies ni notas.

## Instalar en el iPhone

1. Abre la URL de la app **en Safari** (con conexión).
2. Pulsa **Compartir** y luego **Añadir a pantalla de inicio**.
3. **Abre la app desde su icono**.
4. Concede el permiso de ubicación cuando lo pida.

> Importante: Safari y la app instalada tienen **almacenamiento separado**. Lo que guardes en una pestaña de Safari no aparece en la app instalada, y Safari puede borrarlo tras unos días sin uso. Crea tus rodales siempre desde el icono. Si guardaste algo en Safari, expórtalo desde allí e impórtalo en la app instalada.

> Si usaste una versión anterior que pedía contraseña, sus datos (eran de pruebas) se borran al actualizar y las copias cifradas antiguas no se pueden importar.

## Uso

- **Nuevo rodal**: la app toma tu ubicación y su precisión, añades una o varias especies (sugiere las que ya usaste) y una nota opcional. La fecha se guarda sola.
- **Precisión**: bajo el arbolado el GPS puede ser impreciso. Si es peor de 50 m te avisa; puedes esperar a una mejor lectura, guardar igualmente, o corregir el punto después arrastrando el marcador en el mapa (con conexión).
- **Sin permiso de ubicación**: puedes introducir las coordenadas a mano.
- **Copia**: exporta todos los rodales a un archivo o impórtalo en otro dispositivo. Al importar, los rodales se fusionan con los que ya tengas sin duplicarlos.

## Desarrollo

Requiere Node 22.

```bash
npm ci          # instalar dependencias
npm test        # pruebas unitarias y de interfaz (Vitest)
npm run dev     # servidor de desarrollo
npm run build   # genera dist/ (usa BASE_PATH para la subruta)
```

Para probar el build con la subruta de GitHub Pages:

```bash
BASE_PATH=/nombre-del-repo/ npm run build && npm run preview
```

### Estructura

| Carpeta | Contenido |
|---|---|
| `src/db` | IndexedDB y lógica de rodales |
| `src/geo` | Geolocalización y validación de coordenadas |
| `src/mapa` | Mapa Leaflet, vista sin conexión, distancia y rumbo |
| `src/copia` | Exportar e importar la copia de seguridad |
| `src/pwa` | Service worker, almacenamiento persistente, detección de iOS |
| `src/ui` | Pantallas |

### Datos

- Los rodales se guardan **en claro** en IndexedDB, un registro por rodal (`id`, `lat`, `lng`, `precision`, `creadoEn`, `actualizadoEn`, `especies`, `notas`), más unos pocos ajustes (`ultimaExportacion`, `persistenciaConcedida`).
- El esquema de IndexedDB tiene número de versión (actualmente 2). Al pasar de la 1 (versión de pruebas con cifrado) se vacían los almacenes.
- La copia es un JSON `{formato: "rodales-copia", version: 2, exportadoEn, rodales}`. Al importar se valida el archivo entero y cada rodal antes de escribir nada.

## Despliegue en GitHub Pages

1. Crea un repositorio **público** y sube el código a la rama `main`.
2. En *Settings → Pages*, elige como origen **GitHub Actions**.
3. Cada push a `main` ejecuta `.github/workflows/deploy.yml`: comprueba que no hay copias versionadas, instala, pasa las pruebas, construye con la subruta del repositorio y publica.

Si el repositorio se llama `usuario.github.io` (sitio de usuario), cambia `BASE_PATH` a `/` en el workflow.

## Fuera de esta versión

Mapas sin conexión, fotos, sincronización entre dispositivos, y contraseña o cifrado de los datos.
