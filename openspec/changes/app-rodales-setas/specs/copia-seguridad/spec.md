# Spec Delta

## Purpose

Permite sacar los rodales del dispositivo en un archivo cifrado y recuperarlos después, para protegerse de la pérdida del móvil, la reinstalación o la purga del almacenamiento por parte del sistema.

## ADDED Requirements

### Requirement: Exportar copia de seguridad cifrada
El sistema SHALL generar un archivo de copia de seguridad con todos los rodales, cifrado con la contraseña de la app, y ofrecerlo para guardar o compartir mediante la hoja de compartir del sistema o, si no está disponible, como descarga.

#### Scenario: Exportación con hoja de compartir
- **GIVEN** que la app está desbloqueada y el sistema ofrece compartir archivos
- **WHEN** el usuario pulsa exportar
- **THEN** se abre la hoja de compartir con el archivo cifrado

#### Scenario: Exportación sin hoja de compartir
- **GIVEN** que el sistema no ofrece compartir archivos
- **WHEN** el usuario pulsa exportar
- **THEN** el navegador descarga el archivo cifrado

#### Scenario: Contenido no legible
- **WHEN** se abre el archivo exportado con un editor de texto
- **THEN** los datos de los rodales no son legibles sin la contraseña

### Requirement: Importar copia de seguridad
El sistema SHALL importar un archivo de copia de seguridad tras pedir la contraseña con la que fue cifrado, y MUST validar su formato antes de modificar los datos existentes.

#### Scenario: Importación correcta
- **WHEN** el usuario selecciona un archivo válido e introduce su contraseña
- **THEN** los rodales del archivo se incorporan a la app

#### Scenario: Contraseña del archivo incorrecta
- **WHEN** la contraseña no corresponde al archivo
- **THEN** el sistema rechaza la importación y no modifica los datos existentes

#### Scenario: Archivo no válido
- **WHEN** el usuario selecciona un archivo corrupto o de otro formato
- **THEN** el sistema informa del error y no modifica los datos existentes

### Requirement: Fusión sin duplicados
El sistema SHALL fusionar los rodales importados con los existentes sin duplicar los que ya estén presentes.

#### Scenario: Importar dos veces el mismo archivo
- **GIVEN** que ya se ha importado un archivo
- **WHEN** el usuario lo importa de nuevo
- **THEN** el número de rodales no cambia

#### Scenario: Importar en un dispositivo nuevo
- **GIVEN** que la app no tiene rodales
- **WHEN** el usuario importa un archivo válido
- **THEN** todos los rodales del archivo quedan disponibles

### Requirement: Recordatorio de copia
El sistema SHALL indicar la fecha de la última exportación y avisar si han pasado más de 30 días con rodales nuevos sin exportar.

#### Scenario: Aviso de copia antigua
- **GIVEN** que existen rodales creados después de la última exportación y han pasado más de 30 días
- **WHEN** el usuario abre la app desbloqueada
- **THEN** el sistema muestra un aviso para exportar una copia
