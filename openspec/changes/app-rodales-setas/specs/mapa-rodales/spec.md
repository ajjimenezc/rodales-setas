# Spec Delta

## Purpose

Permite ver dónde están los rodales guardados sobre un mapa cuando hay conexión, y orientarse hacia ellos desde la posición actual cuando no la hay.

## ADDED Requirements

### Requirement: Mapa online con los rodales
El sistema SHALL mostrar los rodales guardados como marcadores sobre un mapa base cuando hay conexión a internet.

#### Scenario: Ver marcadores
- **GIVEN** que hay conexión y existen rodales guardados
- **WHEN** el usuario abre la vista de mapa
- **THEN** cada rodal aparece como un marcador en su posición

#### Scenario: Detalle desde el marcador
- **WHEN** el usuario pulsa un marcador
- **THEN** el sistema muestra la fecha, las especies y las notas de ese rodal

### Requirement: Posición actual en el mapa
El sistema SHALL mostrar la posición actual del usuario en el mapa cuando el permiso de ubicación esté concedido.

#### Scenario: Mostrar posición
- **WHEN** el usuario abre el mapa con permiso de ubicación
- **THEN** el mapa muestra su posición y permite centrarse en ella

### Requirement: Vista sin conexión
El sistema SHALL mostrar, cuando no hay conexión o el mapa base no carga, los rodales como lista con la distancia y el rumbo desde la posición actual hasta cada uno, sin mostrar errores bloqueantes.

#### Scenario: Sin red
- **GIVEN** que el dispositivo no tiene conexión y hay permiso de ubicación
- **WHEN** el usuario abre la vista de mapa
- **THEN** el sistema avisa de que el mapa no está disponible y muestra los rodales ordenados por cercanía con distancia y rumbo

#### Scenario: Sin red ni ubicación
- **GIVEN** que no hay conexión ni posición disponible
- **WHEN** el usuario abre la vista de mapa
- **THEN** el sistema muestra los rodales con sus coordenadas, sin distancia ni rumbo

### Requirement: Ajuste de la posición de un rodal
El sistema SHALL permitir corregir la posición de un rodal moviendo su marcador en el mapa cuando hay conexión.

#### Scenario: Mover marcador
- **GIVEN** que hay conexión
- **WHEN** el usuario arrastra el marcador de un rodal y confirma
- **THEN** el rodal guarda las nuevas coordenadas y conserva el resto de datos

### Requirement: Privacidad del mapa
El sistema MUST NOT enviar a ningún servicio externo las coordenadas, las especies ni las notas de los rodales; solo las peticiones de teselas del área visible podrán salir del dispositivo.

#### Scenario: Peticiones de red
- **WHEN** el usuario usa el mapa
- **THEN** las únicas peticiones externas son las de teselas del mapa base y nunca contienen datos de los rodales
