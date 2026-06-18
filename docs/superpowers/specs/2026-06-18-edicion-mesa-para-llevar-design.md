# Edición administrativa de la mesa para llevar

Fecha: 2026-06-18

## Objetivo

Permitir que un administrador gestione la mesa para llevar desde el panel de
mesas sin eliminar las protecciones necesarias para su uso operativo.

## Comportamiento

- La mesa para llevar podrá abrir el formulario de edición.
- Su nombre seguirá siendo `Para llevar`; no podrá cambiarse desde el formulario.
- El administrador podrá modificar únicamente su capacidad.
- Su estado podrá alternarse entre `DISPONIBLE` e `INACTIVA`.
- No podrá editarse ni cambiar de estado mientras esté `OCUPADA`.
- La mesa para llevar no podrá eliminarse.
- Los errores del backend explicarán si la acción fue rechazada porque la mesa
  está ocupada.

## Cambios técnicos

### Frontend

- Separar las reglas de permiso para editar, cambiar estado y eliminar.
- Detectar la mesa para llevar por su nombre actual.
- Mostrar su número como un campo bloqueado al editar.
- Mantener habilitado el botón de estado cuando esté `DISPONIBLE` o `INACTIVA`.
- Mantener siempre deshabilitado el botón de eliminación.

### Backend

- Retirar el bloqueo general de edición y cambio de estado para la mesa de tipo
  `PARA_LLEVAR`.
- Ignorar o rechazar cambios de nombre para conservar `Para llevar`.
- Permitir cambios de capacidad cuando no esté ocupada.
- Permitir únicamente la transición `DISPONIBLE` ↔ `INACTIVA`.
- Conservar el bloqueo de eliminación.

## Verificación

- Probar edición de capacidad de una mesa para llevar disponible.
- Probar que el nombre no cambia.
- Probar transición de disponible a inactiva y viceversa.
- Probar rechazo de edición y cambio de estado cuando está ocupada.
- Probar que continúa sin poder eliminarse.
- Ejecutar pruebas frontend, pruebas backend y compilación del frontend.
