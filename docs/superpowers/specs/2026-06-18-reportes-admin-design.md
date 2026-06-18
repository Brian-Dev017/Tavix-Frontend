# Suite de reportes administrativos

Fecha: 2026-06-18

## Objetivo

Completar y unificar moderadamente los reportes administrativos existentes del
frontend: Dashboard, Pagos, Ventas, Historial de comprobantes, Arqueo de caja y
documentos PDF. La solución utilizará únicamente los endpoints que las vistas
ya consumen actualmente y conservará el diseño visual existente.

## Alcance funcional

### Dashboard

- Consultar datos por rango de fechas.
- Validar que la fecha inicial no sea posterior a la fecha final.
- Mostrar estados de carga, datos vacíos y errores del backend.
- Exportar un CSV resumen con ventas por día, métodos de pago, categorías y
  platos vendidos usando los datos ya cargados.

### Pagos

- Consultar el desglose diario de pagos.
- Mostrar total monetario y cantidad total de transacciones.
- Exportar el detalle por método de pago a CSV.
- Mantener el botón de actualización y los estados de carga/vacío/error.

### Ventas

- Consultar ventas por rango de fechas.
- Mantener los indicadores, gráficos y tabla actuales.
- Exportar un CSV compatible con Excel en Windows mediante BOM UTF-8.
- Incluir en el archivo el resumen general, ventas por día y ventas por método.

### Historial de comprobantes

- Mantener filtro por estado, paginación, detalle y vista previa de PDF.
- Añadir descarga explícita del PDF además de la vista previa.
- Exportar a CSV la página de resultados actualmente cargada.
- Consultar siempre el detalle administrativo actual antes de generar un PDF,
  evitando usar una copia local desactualizada.

### Arqueo de caja

- Mantener apertura, cierre, estado activo e historial.
- Exportar el historial de arqueos actualmente cargado a CSV.
- Mostrar mensajes del backend cuando una operación falle.
- No utilizar `getArqueoReporte`, porque ese endpoint no está conectado hoy a
  ninguna vista y queda fuera del alcance acordado.

### PDF de comprobantes

- Conservar la descarga automática al emitir desde Caja.
- Compartir la transformación de `HistorialDetalle` a datos PDF entre
  Historial y Anulaciones.
- Exponer acciones consistentes de vista previa y descarga.
- Mantener el generador PDF actual sin agregar dependencias.

## Arquitectura

### `src/shared/utils/reportExport.ts`

Centralizará:

- Escape de celdas CSV.
- Creación de CSV con BOM UTF-8.
- Descarga segura de `Blob`.
- Normalización de nombres de archivo.

Las vistas construirán sus filas según su dominio y delegarán la descarga al
helper. No se creará una capa genérica de definición de reportes porque
añadiría complejidad sin aportar valor al alcance actual.

### `src/shared/api/apiError.ts`

Ofrecerá `getApiErrorMessage(error, fallback)` para extraer de forma segura el
mensaje devuelto por Axios o utilizar un texto de respaldo. Se aplicará a las
vistas de reportes modificadas.

### `src/shared/utils/comprobantePdf.ts`

Se ampliará con:

- Una transformación compartida desde `HistorialDetalle` hacia
  `PdfComprobanteData`.
- Descarga y apertura pública del mismo documento.

La transformación aceptará una estructura mínima compatible para evitar que
el módulo compartido dependa directamente del módulo administrativo.

## Diseño de interfaz

Se conservarán los componentes PrimeVue, tarjetas, tablas, tipografía, colores,
espaciado y jerarquía actuales. Las nuevas acciones se ubicarán en los
encabezados de cada pantalla con botones pequeños:

- `Consultar` o `Actualizar` para cargar.
- `Exportar CSV` para datos tabulares.
- Iconos separados de ojo y descarga en filas con PDF.

Los botones de exportación estarán deshabilitados cuando no haya datos. El
usuario recibirá un `Toast` de éxito al generar un archivo y un `Toast` de error
con el mensaje real del backend cuando una consulta falle.

## Flujo de datos

1. La vista valida filtros locales.
2. La vista consulta su endpoint actual.
3. Los datos se almacenan en el estado reactivo existente.
4. Gráficos, tablas y exportaciones usan exactamente ese mismo estado.
5. La exportación arma filas de dominio y llama a `downloadCsv`.
6. Para PDF administrativo, la vista solicita el detalle actualizado, lo
   transforma con el helper compartido y abre o descarga el documento.

## Manejo de errores

- Los errores HTTP usarán `getApiErrorMessage`.
- Una exportación vacía no ejecutará ninguna descarga.
- Los rangos inválidos se detendrán antes de consultar el backend.
- Si el navegador bloquea una vista previa PDF, la descarga seguirá disponible
  como acción separada.
- La URL temporal de cada archivo se revocará después de iniciar la acción.

## Verificación

- Ejecutar `npm run build`.
- Verificar manualmente cada ruta administrativa:
  `/admin/dashboard`, `/admin/pagos`, `/admin/ventas`, `/admin/historial` y
  `/admin/caja`.
- Comprobar nombres, contenido y caracteres especiales de cada CSV en Excel o
  un editor compatible con UTF-8.
- Comprobar vista previa y descarga PDF desde Historial y Anulaciones.
- Comprobar que Caja continúa descargando el PDF al emitir un comprobante.

## Fuera de alcance

- Nuevos endpoints o cambios en backend.
- Exportación XLSX.
- Librerías nuevas para PDF, hojas de cálculo o pruebas.
- Rediseño general del panel administrativo.
- Cambios de autenticación señalados en la auditoría.
