# Spec Delta

## Purpose

Permite sacar los rodales del dispositivo en un archivo JSON legible y recuperarlos después, para protegerse de la pérdida del móvil, la reinstalación o la purga del almacenamiento por parte del sistema. El archivo no está cifrado.

## ADDED Requirements

### Requirement: Exportar copia de seguridad
El sistema SHALL generar un archivo JSON legible con todos los rodales y ofrecerlo para guardar o compartir mediante la hoja de compartir del sistema o, si no está disponible, como descarga.

#### Scenario: Exportación con hoja de compartir
- **GIVEN** que el sistema ofrece compartir archivos
- **WHEN** el usuario pulsa exportar
- **THEN** se abre la hoja de compartir con el archivo de copia

#### Scenario: Exportación sin hoja de compartir
- **GIVEN** que el sistema no ofrece compartir archivos
- **WHEN** el usuario pulsa exportar
- **THEN** el navegador descarga el archivo de copia

#### Scenario: Contenido legible
- **WHEN** se abre el archivo exportado con un editor de texto
- **THEN** se ven los rodales con su ubicación, fecha, especies y notas

#### Scenario: Exportación cancelada
- **WHEN** el usuario cierra la hoja de compartir sin guardar el archivo
- **THEN** el sistema no registra la copia como realizada

### Requirement: Aviso de archivo sin cifrar
El sistema SHALL advertir en la pantalla de copia de seguridad de que el archivo no está cifrado, que cualquiera que lo reciba verá los rodales y que no debe publicarse ni guardarse en lugares públicos.

#### Scenario: Aviso visible
- **WHEN** el usuario abre la pantalla de copia de seguridad
- **THEN** el sistema muestra la advertencia de que el archivo no está cifrado

### Requirement: Importar copia de seguridad
El sistema SHALL importar un archivo de copia de seguridad sin pedir contraseña, y MUST validar su formato y cada rodal antes de modificar los datos existentes.

#### Scenario: Importación correcta
- **WHEN** el usuario selecciona un archivo válido
- **THEN** los rodales del archivo se incorporan a la app

#### Scenario: Archivo no válido
- **WHEN** el usuario selecciona un archivo corrupto o de otro formato
- **THEN** el sistema informa del error y no modifica los datos existentes

#### Scenario: Rodal inválido dentro del archivo
- **WHEN** el archivo contiene algún rodal con datos no válidos, como coordenadas fuera de rango
- **THEN** el sistema rechaza toda la importación y no modifica los datos existentes

#### Scenario: Copia cifrada de una versión anterior
- **WHEN** el usuario selecciona una copia cifrada generada por una versión anterior de la app
- **THEN** el sistema informa de que el formato no es compatible y no modifica los datos existentes

### Requirement: Fusión sin duplicados
El sistema SHALL fusionar los rodales importados con los existentes sin duplicar los que ya estén presentes, y MUST conservar el más reciente cuando un mismo rodal esté en ambos.

#### Scenario: Importar dos veces el mismo archivo
- **GIVEN** que ya se ha importado un archivo
- **WHEN** el usuario lo importa de nuevo
- **THEN** el número de rodales no cambia

#### Scenario: Importar en un dispositivo nuevo
- **GIVEN** que la app no tiene rodales
- **WHEN** el usuario importa un archivo válido
- **THEN** todos los rodales del archivo quedan disponibles

#### Scenario: Mismo rodal modificado después
- **GIVEN** un rodal presente en la app y en el archivo, modificado más tarde en el archivo
- **WHEN** el usuario importa el archivo
- **THEN** la app conserva la versión más reciente

### Requirement: Recordatorio de copia
El sistema SHALL indicar la fecha de la última exportación y avisar si han pasado más de 30 días con rodales nuevos sin exportar.

#### Scenario: Aviso de copia antigua
- **GIVEN** que existen rodales creados después de la última exportación y han pasado más de 30 días
- **WHEN** el usuario abre la app
- **THEN** el sistema muestra un aviso para exportar una copia
