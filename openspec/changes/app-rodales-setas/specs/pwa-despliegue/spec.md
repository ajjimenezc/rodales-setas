# Spec Delta

## Purpose

Define cómo se instala, se abre sin conexión y se publica la aplicación, incluyendo las particularidades de iPhone y la garantía de que el repositorio público no contiene datos de usuario.

## ADDED Requirements

### Requirement: Instalable como app en iPhone
El sistema SHALL poder añadirse a la pantalla de inicio de iPhone y abrirse en modo standalone, con nombre, icono y color de tema propios.

#### Scenario: Instalación
- **WHEN** el usuario usa «Añadir a pantalla de inicio» desde Safari
- **THEN** la app queda instalada con su icono y se abre sin la interfaz del navegador

### Requirement: Aplicación disponible sin conexión
El sistema SHALL cargar la interfaz completa sin conexión una vez visitada con red, y MUST actualizarse a la nueva versión publicada cuando haya conexión.

#### Scenario: Apertura sin cobertura
- **GIVEN** que la app se ha abierto antes con conexión
- **WHEN** el usuario la abre sin conexión
- **THEN** la interfaz carga y permite crear y consultar rodales

#### Scenario: Nueva versión
- **GIVEN** que se ha publicado una nueva versión
- **WHEN** el usuario abre la app con conexión
- **THEN** el sistema usa la nueva versión en el siguiente arranque y avisa si hace falta recargar

### Requirement: Almacenamiento persistente
El sistema SHALL solicitar almacenamiento persistente al navegador cuando esté disponible.

#### Scenario: Solicitud de persistencia
- **WHEN** el usuario desbloquea la app por primera vez
- **THEN** el sistema solicita almacenamiento persistente y registra si se ha concedido

#### Scenario: Persistencia no concedida
- **WHEN** el navegador no concede almacenamiento persistente
- **THEN** el sistema muestra una indicación para exportar copias de seguridad con regularidad

### Requirement: Aviso de modo no instalado en iOS
El sistema SHALL avisar, cuando se ejecute en Safari sin estar instalada en iPhone, de que los datos guardados fuera de la app instalada no se compartirán con ella y de que el navegador puede borrarlos.

#### Scenario: Uso en Safari
- **GIVEN** que la app se ejecuta en una pestaña de Safari en iPhone
- **WHEN** el usuario la abre
- **THEN** el sistema muestra las instrucciones de instalación y la advertencia sobre el almacenamiento

#### Scenario: Uso instalado
- **GIVEN** que la app se ejecuta en modo standalone
- **WHEN** el usuario la abre
- **THEN** el sistema no muestra el aviso de instalación

### Requirement: Publicación en GitHub Pages
El sistema SHALL publicarse como sitio estático en GitHub Pages mediante un despliegue automático al actualizar la rama principal, funcionando bajo la ruta base del repositorio.

#### Scenario: Despliegue automático
- **WHEN** se integran cambios en la rama principal
- **THEN** el flujo de despliegue publica la nueva versión sin pasos manuales

#### Scenario: Rutas bajo subruta
- **WHEN** la app se sirve desde la subruta del repositorio
- **THEN** el manifiesto, el service worker y los recursos cargan correctamente

### Requirement: Sin datos de usuario en el repositorio
El sistema MUST NOT incluir en el código fuente ni en los artefactos publicados ningún dato de rodales, contraseñas ni claves.

#### Scenario: Revisión del repositorio
- **WHEN** se revisa el repositorio público y el sitio publicado
- **THEN** no contienen rodales, coordenadas de usuario, contraseñas ni claves
