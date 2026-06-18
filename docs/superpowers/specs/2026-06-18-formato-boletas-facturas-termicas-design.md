# Formato térmico de boletas y facturas

Fecha: 2026-06-18

## Objetivo

Rediseñar la representación PDF de boletas y facturas para que siga el formato
visual térmico aprobado, utilizando los datos reales del negocio, del cliente,
del comprobante y de los productos vendidos.

Los tickets simples conservarán su formato actual. El cambio se aplicará
únicamente a boletas y facturas.

## Estructura del comprobante

### Encabezado del negocio

El comprobante mostrará, centrados:

- nombre comercial;
- RUC;
- dirección.

La información se obtendrá de la configuración vigente del negocio. Si un dato
opcional no está disponible, no se imprimirá una línea vacía ni un valor de
ejemplo.

### Identificación del comprobante

Después de un separador se mostrará:

- `BOLETA DE VENTA ELECTRÓNICA` para boletas;
- `FACTURA ELECTRÓNICA` para facturas;
- serie y número con el correlativo completado a ocho dígitos.

Ejemplos:

```text
BOLETA DE VENTA ELECTRÓNICA
B001-00000042
```

```text
FACTURA ELECTRÓNICA
F001-00000017
```

### Datos del cliente

Se usará la ubicación visual A aprobada: los datos del cliente aparecerán
debajo del número del comprobante y antes del detalle de productos.

Para boleta:

```text
DNI: 12345678
CLIENTE: MARÍA JOSÉ PÉREZ
```

Para factura:

```text
RUC: 20123456789
CLIENTE: EMPRESA PRUEBA SAC
DIRECCIÓN: AV. PRINCIPAL 123
```

Las líneas largas se ajustarán al ancho disponible sin cortar palabras siempre
que sea posible.

### Detalle de productos

El detalle tendrá cuatro columnas conceptuales:

```text
Descripción          Cant.   Precio    Total
```

Cada producto usará su nombre real como descripción. Se mostrarán:

- nombre del producto;
- cantidad;
- precio unitario;
- subtotal de la línea.

Los nombres largos podrán ocupar más de una línea. Las observaciones operativas
de preparación no se imprimirán.

Después del detalle se mostrará la suma total de unidades:

```text
4 UNIDAD(ES)
```

## Resumen fiscal

El bloque fiscal mostrará:

```text
Op. Exonerada                         S/ 0.00
Op. Inafecta                          S/ 0.00
Op. Gravada                          S/ 18.22
I.G.V. (18%)                          S/ 3.28
Importe Total                        S/ 21.50
```

En el modelo actual todos los productos forman parte de la operación gravada.
Por tanto:

- `Op. Exonerada` será `S/ 0.00`;
- `Op. Inafecta` será `S/ 0.00`;
- `Op. Gravada` usará el subtotal sin IGV devuelto por el comprobante;
- `I.G.V.` usará el importe de IGV devuelto por el comprobante;
- `Importe Total` usará el total final cobrado.

El porcentaje mostrado se tomará de la configuración del negocio cuando esté
disponible; el valor actual esperado es 18%.

Si existe descuento, se añadirá una línea explícita antes del importe total:

```text
Descuento                            -S/ 2.00
```

## Total y pago

El total principal aparecerá destacado:

```text
TOTAL A PAGAR                        S/ 21.50
```

Debajo se mostrará el importe en letras:

```text
VEINTIUNO Y 50/100 SOLES
```

La conversión admitirá importes entre `S/ 0.00` y `S/ 999999.99`, que coincide
con el rango monetario aceptado actualmente por el frontend.

Para pagos en efectivo se mostrarán:

```text
SOLES                                S/ 30.00
VUELTO                                S/ 8.50
```

Para pagos no efectivos se mostrará el método:

```text
MÉTODO                                  YAPE
```

No se inventarán valores de efectivo o vuelto cuando el método no sea efectivo.

## Fecha y hora

El comprobante terminará con la fecha y hora de emisión obtenidas de
`pagadoEn`, usando la zona horaria local del navegador:

```text
18.06.26  |  11:33
```

El formato será `DD.MM.AA | HH:MM`.

## Arquitectura

### Generación de líneas

`src/shared/utils/comprobantePdf.ts` continuará siendo la fuente única para:

- transformar datos de comprobante a líneas térmicas;
- distribuir columnas dentro del ancho disponible;
- convertir el total a letras;
- generar y descargar el PDF.

Se separarán helpers puros para:

- formatear fecha y hora;
- convertir montos a letras;
- ajustar columnas de productos;
- construir el bloque fiscal;
- construir los datos del cliente.

`buildComprobanteLines` conservará dos rutas:

- tickets simples con el formato existente;
- boletas y facturas con el nuevo formato aprobado.

### Datos requeridos

`PdfComprobanteData` incorporará el porcentaje de IGV del negocio. Los datos
seguirán obteniéndose desde:

- configuración del negocio: nombre comercial, RUC, dirección e IGV;
- respuesta de emisión o detalle histórico: serie, número, totales, cliente,
  método de pago y fecha;
- pedido: nombres, cantidades, precios y subtotales de productos.

La generación realizada inmediatamente después del cobro y la regeneración
desde Historial o Anulaciones deberán producir el mismo formato.

## Manejo de casos límite

- Los nombres de productos largos se envolverán sin desalinear los importes.
- Los valores monetarios siempre tendrán dos decimales.
- Si `pagadoEn` no está disponible, se mostrará `--` en lugar de usar la hora
  actual.
- Si faltan datos obligatorios del negocio, se imprimirán únicamente los datos
  disponibles; no se usarán valores fiscales ficticios.
- Los datos del cliente solo se imprimirán en boletas y facturas.
- Las observaciones de cocina no aparecerán.
- El PDF crecerá verticalmente según la cantidad de productos y líneas
  envueltas.

## Pruebas

Se añadirán pruebas unitarias para comprobar:

- encabezado con datos del negocio;
- títulos y correlativos de boleta y factura;
- ubicación de los datos del cliente antes de los productos;
- columnas de descripción, cantidad, precio y total;
- nombres largos de productos;
- suma de unidades;
- operaciones exonerada, inafecta y gravada;
- IGV configurable;
- descuento opcional;
- total en letras con enteros, decimales y centenas de millar;
- efectivo y vuelto;
- método de pago no efectivo;
- fecha y hora `DD.MM.AA | HH:MM`;
- ausencia de observaciones operativas;
- conservación del formato actual de ticket.

También se ejecutarán:

```text
npm test
npm run build
```

Finalmente se generarán manualmente una boleta y una factura con varios
productos para comprobar el ajuste visual del PDF.
