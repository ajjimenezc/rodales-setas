import 'leaflet/dist/leaflet.css';
import './estilos.css';
import { abrirAlmacen } from './db/almacen.js';
import { iniciarApp } from './app.js';
import { registrarServiceWorker } from './pwa/registro.js';
import { necesitaAvisoInstalacion } from './pwa/plataforma.js';

const almacen = await abrirAlmacen();
await iniciarApp(document.getElementById('app'), almacen, {
  geo: navigator.geolocation,
  avisoInstalacion: necesitaAvisoInstalacion(navigator, window.matchMedia?.bind(window)),
});
registrarServiceWorker();
