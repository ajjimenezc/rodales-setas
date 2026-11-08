# Spec Delta

## Purpose

Permite registrar, consultar, editar y borrar rodales de setas con su ubicación, fecha, especies y notas, de forma rápida y sin necesidad de cobertura.

## ADDED Requirements

### Requirement: Crear un rodal con la ubicación actual
El sistema SHALL permitir crear un rodal tomando la geolocalización del dispositivo (latitud, longitud y precisión en metros) y registrando automáticamente la fecha y hora de creación.

#### Scenario: Creación con ubicación disponible
- **WHEN** el usuario abre el formulario de nuevo rodal y concede el permiso de ubicación
- **THEN** el sistema muestra la ubicación obtenida y su precisión, y guarda el rodal con la fecha y hora actuales al confirmar

#### Scenario: Permiso de ubicación denegado
- **WHEN** el usuario deniega el permiso de ubicación o no se obtiene posición
- **THEN** el sistema informa del motivo y permite introducir las coordenadas manualmente o reintentar

#### Scenario: Precisión baja
- **WHEN** la precisión obtenida es peor de 50 metros
- **THEN** el sistema avisa de la baja precisión y permite esperar a una mejor lectura o guardar con la actual

### Requirement: Una o varias especies por rodal
El sistema SHALL permitir asociar a cada rodal una o varias especies de setas introducidas como texto, y MUST exigir al menos una especie para guardar.

#### Scenario: Varias especies
- **WHEN** el usuario añade tres especies a un rodal y lo guarda
- **THEN** el rodal queda guardado con las tres especies

#### Scenario: Sin especie
- **WHEN** el usuario intenta guardar un rodal sin ninguna especie
- **THEN** el sistema no lo guarda e indica que falta al menos una especie

### Requirement: Autocompletado de especies
El sistema SHALL sugerir al escribir una especie las que el usuario haya usado antes en otros rodales.

#### Scenario: Sugerencia de especie previa
- **GIVEN** que existe un rodal con la especie «Boletus edulis»
- **WHEN** el usuario escribe «Bol» en el campo de especie
- **THEN** el sistema sugiere «Boletus edulis»

#### Scenario: Especie nueva
- **WHEN** el usuario escribe una especie que no existe en el historial
- **THEN** el sistema la acepta como nueva y la ofrece como sugerencia en adelante

### Requirement: Notas de texto libre
El sistema SHALL permitir añadir una nota de texto libre opcional a cada rodal.

#### Scenario: Guardar nota
- **WHEN** el usuario escribe una nota y guarda el rodal
- **THEN** la nota se conserva y se muestra al consultar el rodal

### Requirement: Funcionamiento sin conexión
El sistema SHALL permitir crear, consultar, editar y borrar rodales sin conexión a internet.

#### Scenario: Guardar sin cobertura
- **GIVEN** que el dispositivo no tiene conexión
- **WHEN** el usuario crea un rodal
- **THEN** el rodal se guarda localmente sin errores de red

### Requirement: Listado de rodales
El sistema SHALL mostrar los rodales guardados ordenados del más reciente al más antiguo, con fecha, especies y coordenadas.

#### Scenario: Listado ordenado
- **GIVEN** que existen varios rodales guardados
- **WHEN** el usuario abre el listado
- **THEN** se muestran del más reciente al más antiguo

#### Scenario: Sin rodales
- **WHEN** el usuario abre el listado sin rodales guardados
- **THEN** el sistema muestra un estado vacío con la acción de crear un rodal

### Requirement: Editar y borrar un rodal
El sistema SHALL permitir editar las especies y las notas de un rodal, y borrarlo tras confirmación.

#### Scenario: Editar especies
- **WHEN** el usuario cambia las especies de un rodal y guarda
- **THEN** el rodal refleja los cambios y conserva su fecha de creación

#### Scenario: Borrado confirmado
- **WHEN** el usuario pide borrar un rodal y confirma
- **THEN** el rodal se elimina definitivamente

#### Scenario: Borrado cancelado
- **WHEN** el usuario pide borrar un rodal y cancela la confirmación
- **THEN** el rodal se conserva
