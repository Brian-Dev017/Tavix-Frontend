# Correcciones integrales de operación y reportes

Fecha: 2026-06-18

## Objetivo

Corregir de extremo a extremo los flujos administrativos, de pedidos, cocina,
caja, comprobantes y reportes. Las reglas críticas se validarán tanto en la
interfaz como en el backend para que no puedan evitarse mediante llamadas
directas a la API.

## Alcance

### 1. Administración

#### Dashboard y mesas

- El indicador de mesas usará la cantidad real de mesas físicas recibidas del
  backend.
- La mesa de tipo `PARA_LLEVAR` no contará como mesa física.
- Se eliminará el total fijo `/ 10`.
- Las fechas de consulta tendrán como máximo la fecha local actual. El
  18/06/2026, por ejemplo, no se podrá seleccionar una fecha posterior a
  `2026-06-18`.
- La validación rechazará rangos futuros aunque el valor sea manipulado fuera
  del selector.
- En administración, todas las mesas se mostrarán como `Mesa {número}`.
- La mesa para llevar usará la misma tipografía, tamaño y jerarquía visual que
  las demás, pero conservará su denominación `Mesa para llevar`.

#### Avisos y errores

- Habrá una sola instancia global de `Toast`.
- Se retirarán las instancias locales que actualmente duplican cada aviso y
  obligan a cerrar dos notificaciones superpuestas.
- Los errores HTTP usarán un helper compartido para mostrar el mensaje del
  backend y un respaldo específico de la acción.
- Los mensajes locales explicarán la condición incumplida, no solo indicarán
  que ocurrió un error.

#### Productos y precios

- Eliminar un producto ejecutará una eliminación real en el backend.
- Cambiar la disponibilidad seguirá siendo una operación separada.
- Si un producto no puede eliminarse porque está referenciado por operaciones
  históricas, el backend responderá con un conflicto claro que explique la
  relación que impide eliminarlo; no cambiará silenciosamente su
  disponibilidad.
- El precio de un producto nuevo iniciará vacío.
- El campo se titulará `Precio en Soles (Ejemplo 20.50)`.
- Solo se admitirán valores mayores que cero con máximo dos decimales.
- La validación se aplicará en frontend y backend.
- Crear o editar un producto de la categoría exacta `Bebidas frías`
  establecerá `requiereCocina = false`; el resto establecerá
  `requiereCocina = true`.

#### Caja administrativa

- Si un administrador pulsa `Abrir Caja`, no se abrirá el formulario.
- Se mostrará inmediatamente: `El administrador no puede abrir caja`.
- El backend conservará la misma restricción como validación autoritativa.

#### Datos del negocio

- Se implementará el boceto A aprobado.
- Los campos estarán deshabilitados inicialmente.
- El botón `Editar` estará en el encabezado.
- Al editar aparecerán `Guardar cambios` y `Cancelar`.
- Guardar correctamente actualizará la copia base y volverá a bloquear los
  campos.
- Cancelar restaurará los datos cargados y volverá a bloquearlos.

### 2. Mesero y cocina

#### Formulario de selección

- Elegir categoría no reiniciará la cantidad indicada.
- Elegir o cambiar producto no reiniciará la cantidad.
- Cambiar producto sí limpiará la observación, porque la observación pertenece
  al producto seleccionado.
- Cambiar categoría limpiará el producto seleccionado solo si ese producto no
  pertenece a la nueva categoría; también limpiará su observación.
- El orden categoría, cantidad y producto será intercambiable sin perder los
  valores compatibles ya ingresados.

#### Confirmación y conteo

- Los textos de confirmación y éxito usarán la suma de cantidades, no la
  cantidad de tipos o filas.
- Para pedidos de mesa se distinguirán:
  - unidades enviadas a cocina;
  - unidades de `Bebidas frías` entregadas directamente por el mesero.
- Si no hay unidades destinadas a cocina, el mensaje no afirmará que se
  enviaron ítems a cocina.

#### Bebidas frías

- La categoría se identificará mediante comparación normalizada del nombre
  exacto `Bebidas frías`, ignorando mayúsculas y tildes para tolerar datos
  equivalentes.
- Sus productos quedarán `LISTO` al agregarse.
- No se publicarán en la cola ni en el canal WebSocket de Cocina.
- La regla se aplicará en el backend mediante `requiereCocina`, no mediante un
  filtro visual posterior.

### 3. Caja y comprobantes

#### Pre-cierre

- El cajero no podrá abrir el modal de pre-cierre si existen pedidos pendientes
  de pago.
- El aviso indicará cuántos pedidos quedan pendientes.
- El backend volverá a comprobar la condición al registrar el pre-cierre y
  responderá con conflicto si aún existen pedidos cobrables.

#### Datos fiscales

- Para boleta, DNI aceptará únicamente dígitos y máximo ocho caracteres.
- La validación final exigirá exactamente ocho dígitos.
- Nombre y apellido aceptarán solamente letras y espacios.
- Para factura, RUC aceptará únicamente dígitos y máximo once caracteres.
- La validación final exigirá exactamente once dígitos.

#### Efectivo y vuelto

- El valor del efectivo recibido actualizará el estado en cada edición del
  campo, sin requerir Enter ni perder el foco.
- El vuelto se recalculará y mostrará inmediatamente.

#### Ticket y comprobantes

- Se eliminará la línea `Impresora térmica 80mm` y cualquier referencia a
  impresoras en el documento de venta.
- Las observaciones operativas de preparación no se imprimirán en ticket,
  boleta ni factura.
- Las observaciones seguirán disponibles para Mesero y Cocina.

### 4. Exportación de reportes

La selección visual aprobada sustituye la exportación solicitada como CSV por
un libro Excel `.xlsx`, ya que CSV no soporta hojas, estilos ni gráficos.

#### Dashboard

- Se descargará un libro con hojas:
  - `Resumen`;
  - `Ventas por día`;
  - `Métodos de pago`;
  - `Categorías`;
  - `Platos`.
- Cada hoja tendrá título, rango consultado, tabla tabulada, anchos adecuados,
  formatos numéricos y gráfico pertinente.

#### Ventas

- Se descargará un libro con hojas:
  - `Resumen`;
  - `Ventas por día`;
  - `Métodos de pago`.
- Cada hoja tendrá tablas ordenadas, totales y gráficos.

#### Implementación

- Se reutilizará Apache POI, que ya está instalado en el backend.
- Los endpoints recibirán `desde` y `hasta`, validarán el rango y devolverán el
  archivo con tipo MIME de Excel.
- El frontend descargará el `Blob` y mostrará el nombre de archivo correcto.
- Los botones se denominarán `Exportar Excel`.

## Arquitectura

### Frontend

- `src/App.vue` será el único host de `Toast`.
- `src/shared/api/apiError.ts` centralizará la extracción de mensajes.
- Las vistas conservarán sus estados y endpoints actuales salvo las nuevas
  descargas Excel.
- Se añadirán helpers pequeños para fecha local, normalización de categoría,
  conteo de unidades y descarga de archivos cuando eviten duplicación.

### Backend

- Administración validará precios, eliminación real y derivación de
  `requiereCocina`.
- Pedidos seguirá usando `requiereCocina` para estado y publicación a Cocina.
- Arqueo validará pagos pendientes antes de pre-cierre.
- Reportes generará los libros con Apache POI.

## Manejo de errores

- Toda regla de negocio tendrá un mensaje concreto.
- Las validaciones de frontend evitarán abrir modales o enviar solicitudes
  inválidas.
- Las mismas reglas críticas se repetirán en backend.
- Los errores de integridad al eliminar productos se convertirán en un mensaje
  de negocio y no expondrán trazas SQL.
- Las exportaciones vacías generarán hojas con encabezados y estado `Sin datos`
  o impedirán la descarga con un aviso explicativo, según la vista.

## Verificación

- Añadir pruebas unitarias backend para:
  - categoría `Bebidas frías`;
  - eliminación real y conflicto por referencias;
  - bloqueo de pre-cierre con pedidos pendientes;
  - libros Excel, hojas y gráficos esperados.
- Añadir pruebas puras de frontend donde la configuración actual lo permita;
  para componentes sin infraestructura de pruebas se extraerá lógica a helpers
  comprobables y se verificará mediante compilación y recorrido manual.
- Ejecutar `mvn test` en backend.
- Ejecutar `npm run build` en frontend.
- Verificar manualmente los roles Administrador, Mesero y Cajero.
- Abrir los dos archivos `.xlsx` y comprobar hojas, tablas, formatos y gráficos.

## Orden de entrega

1. Infraestructura compartida, mensajes y Toast.
2. Administración: dashboard, mesas, productos, caja y negocio.
3. Mesero y cocina.
4. Caja y comprobantes.
5. Excel de Dashboard y Ventas.
6. Pruebas completas y recorrido final.

## Fuera de alcance

- Rediseño general del sistema.
- Cambios en autenticación no relacionados con estas correcciones.
- Migración de datos históricos distinta a sincronizar
  `requiere_cocina` para la categoría `Bebidas frías`.
