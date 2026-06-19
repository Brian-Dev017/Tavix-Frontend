# Exportaciones Excel unificadas y compatibles

Fecha: 2026-06-18

## Objetivo

Unificar las exportaciones de Dashboard, Ventas, Arqueo, Pagos e Historial de
comprobantes en libros Excel `.xlsx` con una identidad visual común, tablas
legibles, formatos numéricos correctos, gráficos y leyendas.

El cambio también corregirá los archivos de Dashboard y Ventas que Microsoft
Excel abre actualmente mostrando mensajes de reparación.

## Diagnóstico confirmado

### Reparación de estilos

El formato monetario actual se genera como:

```text
S/ #,##0.00
```

El texto literal `S/` no está escapado dentro de la máscara numérica. Excel
repara `xl/styles.xml` al abrir el libro.

La máscara compatible será:

```text
"S/" #,##0.00
```

### Eliminación de dibujos

Los gráficos de barras actuales se generan con identificadores de eje `0` y
`1`. Excel considera inválidos esos identificadores y elimina el dibujo que
contiene el gráfico.

Esto explica los mensajes:

```text
Parte quitada: Parte /xl/drawings/drawing1.xml.
Parte quitada: Parte /xl/drawings/drawing4.xml.
```

Los gráficos circulares no usan ejes y no presentan el mismo problema.

Los nuevos gráficos de barras usarán identificadores positivos y únicos para
cada par de ejes. También configurarán nombre de serie, título, posición de
leyenda y referencias de datos completas.

## Formato visual común

Todos los libros usarán:

- nombre del negocio y título del reporte en una franja superior;
- rango o fecha consultada;
- fecha y hora de generación;
- moneda `Soles (PEN)`;
- indicadores principales en una hoja `Resumen`;
- encabezados oscuros con texto blanco;
- filas alternadas;
- bordes discretos;
- formatos monetarios, porcentuales, enteros y de fecha;
- columnas con anchos adecuados;
- paneles congelados;
- filtros automáticos;
- gráficos con título y leyenda visible;
- textos `Sin datos` cuando una sección no tenga registros.

La paleta aprobada será:

- vino oscuro para títulos;
- azul grisáceo para encabezados de tablas;
- rosa vino para series principales;
- colores secundarios consistentes para métodos, estados o categorías.

## Arquitectura

El backend centralizará la construcción de libros en un componente compartido
del módulo de reportes. Este componente será responsable de:

- crear estilos válidos y reutilizables;
- crear encabezados y metadatos;
- escribir tablas;
- aplicar tipos de celda y formatos;
- crear gráficos de barras y circulares compatibles;
- configurar leyendas;
- generar la respuesta de descarga.

Los controladores aportarán únicamente:

- título del reporte;
- nombre de hojas;
- indicadores;
- columnas;
- filas;
- tipo de gráfico;
- columna de categoría y columna de valores.

Las vistas Vue dejarán de generar CSV para Arqueo, Pagos e Historial y
descargarán los nuevos blobs Excel desde el backend.

## Libros por sección

### Dashboard

Hojas:

- `Resumen`;
- `Ventas por día`;
- `Métodos de pago`;
- `Categorías`;
- `Platos`.

Gráficos:

- barras para ventas por día;
- circular para métodos de pago;
- circular para categorías;
- barras para platos vendidos.

### Ventas

Hojas:

- `Resumen`;
- `Ventas por día`;
- `Métodos de pago`.

Gráficos:

- barras para ventas por día;
- circular para métodos de pago.

### Pagos

El reporte cubrirá la fecha local mostrada en la vista.

Hojas:

- `Resumen`;
- `Métodos de pago`.

Indicadores:

- venta total;
- cantidad total de transacciones;
- método con mayor importe.

La hoja de métodos tendrá:

- método;
- transacciones;
- total;
- participación porcentual.

Gráfico:

- circular con importe por método y leyenda visible.

### Arqueo

El reporte exportará los registros disponibles para administración, no solo el
arqueo actualmente abierto.

Hojas:

- `Resumen`;
- `Arqueos`;
- `Estados`.

Indicadores:

- cantidad total;
- abiertos;
- pre-cierres;
- cerrados;
- total de ventas;
- diferencia acumulada.

La tabla de arqueos incluirá:

- ID;
- cajero;
- apertura;
- cierre;
- monto de apertura;
- monto de cierre;
- total de ventas;
- efectivo;
- pagos digitales;
- redondeo;
- monto esperado;
- diferencia;
- estado;
- notas.

Gráficos:

- circular por estado;
- barras de total de ventas por cajero o arqueo.

### Historial de comprobantes

La exportación respetará el filtro de estado seleccionado en la vista y
exportará todos los registros que coincidan, no solamente la página visible.

Hojas:

- `Resumen`;
- `Comprobantes`;
- `Métodos de pago`;
- `Estados`;
- `Tipos`.

Indicadores:

- cantidad de comprobantes;
- total monetario;
- completados;
- anulados;
- pendientes.

La tabla incluirá:

- ID;
- pedido;
- tipo;
- serie;
- número;
- método;
- total;
- estado;
- fecha de pago;
- fecha de creación.

Gráficos:

- circular por método de pago;
- circular por estado;
- barras por tipo de comprobante.

## Endpoints

Se conservarán:

```text
GET /api/reportes/dashboard/excel
GET /api/reportes/ventas/excel
```

Se añadirán:

```text
GET /api/reportes/pagos/excel?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
GET /api/reportes/arqueos/excel
GET /api/reportes/historial/excel?estado=COMPLETADO
```

El parámetro `estado` de Historial será opcional. Si está vacío, se exportarán
todos los estados.

Todos los endpoints responderán:

- MIME de Excel;
- `Content-Disposition` con nombre descriptivo;
- mensajes de negocio claros ante parámetros inválidos;
- libros válidos aunque no existan filas.

## Compatibilidad técnica

Los libros deberán:

- abrir sin reparaciones en Microsoft Excel;
- poder abrirse nuevamente con Apache POI;
- contener relaciones de dibujos y gráficos válidas;
- usar IDs positivos y únicos en ejes;
- usar nombres de serie explícitos;
- usar máscaras monetarias escapadas;
- no crear gráficos con rangos invertidos o inexistentes.

Cuando una tabla no tenga datos, se escribirá una fila `Sin datos`, pero el
gráfico no se creará con una referencia ficticia. La hoja seguirá siendo
válida.

## Pruebas

Las pruebas backend comprobarán para cada libro:

- nombres de hojas;
- títulos y metadatos;
- encabezados y filtros;
- formatos monetarios válidos;
- tablas con tipos numéricos reales;
- leyendas habilitadas;
- gráficos esperados;
- IDs de ejes positivos y distintos;
- ausencia de gráficos cuando no haya datos;
- reapertura del libro generado mediante Apache POI;
- contenido exportado de Arqueo, Pagos e Historial.

También se inspeccionará el ZIP interno de los libros para verificar:

- `xl/styles.xml`;
- `xl/drawings/*.xml`;
- `xl/charts/*.xml`;
- relaciones entre hojas, dibujos y gráficos.

En frontend se verificará:

- botones renombrados a `Exportar Excel`;
- descarga mediante `Blob`;
- nombre obtenido desde `Content-Disposition`;
- filtro de estado enviado en Historial;
- fecha local enviada en Pagos;
- mensajes de éxito y error.

## Verificación manual

Se descargarán los cinco libros y se abrirán en Microsoft Excel. Ninguno deberá
mostrar mensajes de reparación.

En cada libro se comprobarán:

- alineación y ancho de tablas;
- formatos de moneda, fecha y porcentaje;
- filtros y paneles congelados;
- títulos de gráficos;
- leyendas;
- correspondencia entre tabla y gráfico;
- legibilidad de hojas con y sin datos.
