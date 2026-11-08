# Rodales de setas

PWA para anotar, con tu geolocalización, los rodales donde encuentras setas. Pensada para iPhone y para el monte: **guardar un rodal funciona sin cobertura**. Los datos se quedan en tu dispositivo, cifrados con una contraseña.

## Lo que debes saber antes de usarla

- **Si olvidas la contraseña, los datos no se pueden recuperar.** No existe ningún servidor ni forma de restablecerla.
- **Los datos solo existen en tu iPhone.** Si lo pierdes o iOS borra los datos del navegador, sin copia de seguridad se pierden. Exporta una copia con regularidad (botón **Copia**). La app avisa si pasan más de 30 días con rodales sin exportar.
- El archivo de copia está cifrado con la contraseña que tenías al exportarlo. Guárdalo donde quieras (Archivos, iCloud), pero **no lo subas a este repositorio**: es público.
- El mapa necesita conexión. Sin ella la app te muestra tus rodales ordenados por cercanía, con distancia y rumbo desde tu posición.
- Las teselas del mapa las sirve OpenStreetMap, que puede ver la zona que consultas. Nunca recibe tus rodales, especies ni notas.

## Instalar en el iPhone

1. Abre la URL de la app **en Safari** (con conexión).
2. Pulsa **Compartir** y luego **Añadir a pantalla de inicio**.
3. **Abre la app desde su icono** y crea la contraseña.
4. Concede el permiso de ubicación cuando lo pida.

> Importante: Safari y la app instalada tienen **almacenamiento separado**. Lo que guardes en una pestaña de Safari no aparece en la app instalada, y Safari puede borrarlo tras unos días sin uso. Crea tus rodales siempre desde el icono. Si guardaste algo en Safari, expórtalo desde allí e impórtalo en la app instalada.

## Uso

- **Nuevo rodal**: la app toma tu ubicación y su precisión, añades una o varias especies (sugiere las que ya usaste) y una nota opcional. La fecha se guarda sola.
- **Precisión**: bajo el arbolado el GPS puede ser impreciso. Si es peor de 50 m te avisa; puedes esperar a una mejor lectura, guardar igualmente, o corregir el punto después arrastrando el marcador en el mapa (con conexión).
- **Sin permiso de ubicación**: puedes introducir las coordenadas a mano.
- **Bloqueo**: se pide la contraseña al abrir, con el botón **Bloquear**, y tras más de 5 minutos en segundo plano.
- **Cambiar contraseña**: botón **Contraseña**. Re-cifra todos los datos.

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
| `src/crypto` | Derivación de clave (PBKDF2), cifrado (AES-GCM) y gestión de contraseña |
| `src/db` | IndexedDB (registros siempre cifrados) y lógica de rodales |
| `src/geo` | Geolocalización y validación de coordenadas |
| `src/mapa` | Mapa Leaflet, vista sin conexión, distancia y rumbo |
| `src/copia` | Exportar e importar la copia cifrada |
| `src/pwa` | Service worker, almacenamiento persistente, detección de iOS |
| `src/ui` | Pantallas |

### Cifrado

- Clave AES-GCM 256 derivada de la contraseña con PBKDF2-SHA-256 y sal aleatoria. La contraseña y la clave **nunca se guardan**; la clave solo vive en memoria mientras la app está desbloqueada.
- Cada rodal se cifra por separado con un IV aleatorio.
- Iteraciones de PBKDF2: **600 000** por defecto. *Pendiente de medir el tiempo de desbloqueo en un iPhone real y ajustar (tarea 2.5).*

## Despliegue en GitHub Pages

1. Crea un repositorio **público** y sube el código a la rama `main`.
2. En *Settings → Pages*, elige como origen **GitHub Actions**.
3. Cada push a `main` ejecuta `.github/workflows/deploy.yml`: comprueba que no hay copias versionadas, instala, pasa las pruebas, construye con la subruta del repositorio y publica.

Si el repositorio se llama `usuario.github.io` (sitio de usuario), cambia `BASE_PATH` a `/` en el workflow.

## Fuera de esta versión

Mapas sin conexión, fotos y sincronización entre dispositivos.
