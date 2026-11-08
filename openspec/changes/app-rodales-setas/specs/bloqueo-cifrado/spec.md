# Spec Delta

## Purpose

Protege los datos de los rodales exigiendo una contraseña al iniciar y cifrándolos en reposo en el dispositivo, de modo que no sean legibles sin ella.

## ADDED Requirements

### Requirement: Creación de la contraseña inicial
El sistema SHALL pedir al usuario que cree una contraseña en el primer uso y MUST advertir de que, si se olvida, los datos no se podrán recuperar.

#### Scenario: Primer uso
- **GIVEN** que no existen datos previos
- **WHEN** el usuario abre la app por primera vez
- **THEN** el sistema pide crear y confirmar una contraseña y muestra la advertencia de pérdida de datos

#### Scenario: Confirmación distinta
- **WHEN** la contraseña y su confirmación no coinciden
- **THEN** el sistema no continúa e indica el error

### Requirement: Contraseña al iniciar
El sistema SHALL mostrar una pantalla de contraseña al abrir la app y MUST NOT mostrar ni cargar ningún rodal hasta que se introduzca la correcta.

#### Scenario: Contraseña correcta
- **WHEN** el usuario introduce la contraseña correcta
- **THEN** el sistema desbloquea la app y muestra los rodales

#### Scenario: Contraseña incorrecta
- **WHEN** el usuario introduce una contraseña incorrecta
- **THEN** el sistema rechaza el acceso, no muestra datos y permite reintentar

### Requirement: Datos cifrados en reposo
El sistema SHALL almacenar los rodales cifrados en el dispositivo con una clave derivada de la contraseña, y MUST NOT guardar la contraseña ni la clave de forma persistente.

#### Scenario: Almacenamiento ilegible
- **WHEN** se inspecciona el almacenamiento local del navegador con la app bloqueada
- **THEN** los datos de los rodales no son legibles sin la contraseña

### Requirement: Bloqueo de la app
El sistema SHALL bloquear la app y descartar la clave de memoria cuando el usuario lo pida, y cuando la app pase a segundo plano durante más de 5 minutos.

#### Scenario: Bloqueo manual
- **WHEN** el usuario pulsa la acción de bloquear
- **THEN** el sistema vuelve a la pantalla de contraseña

#### Scenario: Bloqueo por inactividad
- **GIVEN** que la app está desbloqueada
- **WHEN** permanece en segundo plano más de 5 minutos y el usuario vuelve a ella
- **THEN** el sistema pide la contraseña de nuevo

### Requirement: Cambio de contraseña
El sistema SHALL permitir cambiar la contraseña introduciendo la actual y re-cifrando todos los datos con la nueva.

#### Scenario: Cambio correcto
- **WHEN** el usuario introduce la contraseña actual y una nueva válida
- **THEN** los datos pasan a estar cifrados con la nueva contraseña y la anterior deja de funcionar

#### Scenario: Contraseña actual incorrecta
- **WHEN** el usuario introduce una contraseña actual incorrecta
- **THEN** el sistema rechaza el cambio y los datos permanecen sin modificar
