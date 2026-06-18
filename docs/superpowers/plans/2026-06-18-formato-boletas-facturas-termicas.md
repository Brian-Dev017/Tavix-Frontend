# Formato de Boletas y Facturas Térmicas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generar boletas y facturas PDF con el formato térmico aprobado, usando datos reales del negocio, cliente, productos, impuestos, pago y fecha.

**Architecture:** `comprobantePdf.ts` seguirá siendo el generador único y separará el formato existente de ticket del nuevo formato fiscal. El porcentaje de IGV viajará dentro de `PdfComprobanteData`; el backend lo incluirá en el detalle histórico para que Caja, Historial y Anulaciones produzcan el mismo documento.

**Tech Stack:** Vue 3, TypeScript, Vitest, PDF construido con texto Courier, Spring Boot, Java 21.

---

## Mapa de archivos

- `src/shared/utils/comprobantePdf.ts`: helpers de columnas, fecha, monto en letras y líneas fiscales.
- `src/shared/utils/comprobantePdf.test.ts`: especificación automatizada del formato.
- `src/modules/caja/views/CajaView.vue`: entrega el IGV configurado al PDF inmediato.
- `src/modules/admin/api/reportesApi.ts`: contrato histórico con IGV del negocio.
- `../backend/src/main/java/com/restaurante/modules/reportes/infrastructure/web/ReportesController.java`: incluye el IGV configurado en el detalle.
- `../backend/src/test/java/com/restaurante/modules/reportes/infrastructure/web/ReportesControllerTest.java`: prueba del contrato histórico.

### Task 1: Especificar el formato térmico con pruebas fallidas

**Files:**
- Modify: `src/shared/utils/comprobantePdf.test.ts`

- [ ] **Step 1: Crear datos representativos**

Usar una boleta con dos productos, cliente, efectivo, vuelto e IGV configurable:

```ts
const data: PdfComprobanteData = {
  comprobanteId: 1,
  pedidoId: 2,
  tipoComprobante: "Boleta",
  negocioNombre: "La Flor del Tumbo",
  negocioRuc: "20608280333",
  negocioDireccion: "Cal. Cesar Morelli 139 P-3, San Borja, Lima",
  negocioIgvPorcentaje: 18,
  serie: "B001",
  numero: 42,
  metodoPago: "EFECTIVO",
  subtotal: 38.98,
  igv: 7.02,
  descuento: 0,
  total: 46,
  efectivoRecibido: 50,
  vuelto: 4,
  pagadoEn: "2026-06-18T11:33:00-05:00",
  clienteDocumento: "12345678",
  clienteNombre: "María José Pérez",
  clienteDireccion: "",
  items: [
    { producto: "Ceviche clásico", cantidad: 2, precio: 20, subtotal: 40 },
    { producto: "Chicha morada", cantidad: 1, precio: 6, subtotal: 6 },
  ],
};
```

- [ ] **Step 2: Comprobar estructura y orden**

Añadir expectativas para:

```ts
expect(text).toContain("BOLETA DE VENTA ELECTRONICA");
expect(text).toContain("B001-00000042");
expect(text.indexOf("DNI: 12345678")).toBeLessThan(text.indexOf("Descripcion"));
expect(text).toContain("Cant.");
expect(text).toContain("Precio");
expect(text).toContain("Total");
expect(text).toContain("3 UNIDAD(ES)");
```

- [ ] **Step 3: Comprobar bloque fiscal, letras, pago y fecha**

```ts
expect(text).toContain("Op. Exonerada");
expect(text).toContain("Op. Inafecta");
expect(text).toContain("Op. Gravada");
expect(text).toContain("I.G.V. (18%)");
expect(text).toContain("CUARENTA Y SEIS Y 00/100 SOLES");
expect(text).toContain("SOLES");
expect(text).toContain("VUELTO");
expect(text).toContain("18.06.26 | 11:33");
```

- [ ] **Step 4: Cubrir factura, pago digital, descuento y producto largo**

Verificar que factura imprime `RUC`, cliente y dirección antes del detalle; que
YAPE imprime `METODO` sin efectivo/vuelto; y que un nombre largo se envuelve
sin perder cantidad, precio o total.

- [ ] **Step 5: Ejecutar la prueba y confirmar el fallo**

Run:

```powershell
npm test -- --run src/shared/utils/comprobantePdf.test.ts
```

Expected: FAIL por ausencia del nuevo encabezado, columnas, monto en letras y fecha térmica.

### Task 2: Implementar el generador térmico

**Files:**
- Modify: `src/shared/utils/comprobantePdf.ts`
- Test: `src/shared/utils/comprobantePdf.test.ts`

- [ ] **Step 1: Extender los contratos**

Añadir a `PdfComprobanteData` y `ComprobantePdfSource`:

```ts
negocioIgvPorcentaje?: number | null;
```

Propagarlo en `toPdfComprobanteData`.

- [ ] **Step 2: Crear formateadores puros**

Implementar:

```ts
function fmtReceiptDate(value?: string | null): string;
function moneyToWords(value: number): string;
function itemLines(item: PdfComprobanteItem): string[];
function addClient(lines: string[], data: PdfComprobanteData): void;
function addFiscalSummary(lines: string[], data: PdfComprobanteData): void;
```

`fmtReceiptDate` devolverá `DD.MM.AA | HH:MM`; `moneyToWords` cubrirá de cero a
999999 y añadirá `YY/100 SOLES`.

- [ ] **Step 3: Construir columnas estables**

Reservar anchos dentro de los 42 caracteres:

```ts
const DESCRIPTION_WIDTH = 18;
const QUANTITY_WIDTH = 5;
const PRICE_WIDTH = 8;
const TOTAL_WIDTH = 9;
```

La primera línea del producto contendrá las cuatro columnas y las siguientes
solo continuarán la descripción.

- [ ] **Step 4: Reemplazar `buildBoletaFacturaLines`**

Generar en este orden:

```text
negocio
tipo y correlativo
cliente
cabecera y productos
unidades
resumen fiscal
TOTAL A PAGAR
importe en letras
pago o método
fecha y hora
```

Usar `BOLETA DE VENTA ELECTRONICA` o `FACTURA ELECTRONICA` según el tipo.

- [ ] **Step 5: Mantener la ruta de ticket**

No cambiar `buildTicketLines` salvo reutilizar helpers compatibles. La prueba
existente debe confirmar que el ticket conserva su contenido y no imprime
observaciones.

- [ ] **Step 6: Ejecutar pruebas**

Run:

```powershell
npm test -- --run src/shared/utils/comprobantePdf.test.ts
```

Expected: PASS.

### Task 3: Propagar el IGV configurado

**Files:**
- Modify: `src/modules/caja/views/CajaView.vue`
- Modify: `src/modules/admin/api/reportesApi.ts`
- Modify: `../backend/src/main/java/com/restaurante/modules/reportes/infrastructure/web/ReportesController.java`
- Create: `../backend/src/test/java/com/restaurante/modules/reportes/infrastructure/web/ReportesControllerTest.java`

- [ ] **Step 1: Escribir la prueba backend**

Crear una prueba de `detalle` que configure:

```java
NegocioConfigEntity negocio = new NegocioConfigEntity();
negocio.setId(1L);
negocio.setIgvPorcentaje(new BigDecimal("18.00"));
```

y compruebe:

```java
assertEquals(new BigDecimal("18.00"),
        response.getBody().data().negocioIgvPorcentaje());
```

- [ ] **Step 2: Ejecutar la prueba y confirmar el fallo**

Run:

```powershell
mvn -Dtest=ReportesControllerTest test
```

Expected: FAIL porque `PedidoDetalleReporte` todavía no expone el porcentaje.

- [ ] **Step 3: Extender el DTO histórico**

Añadir antes de `items`:

```java
BigDecimal negocioIgvPorcentaje,
```

y mapear:

```java
negocio != null ? negocio.getIgvPorcentaje() : null,
```

- [ ] **Step 4: Actualizar contratos frontend**

En `HistorialDetalle` añadir:

```ts
negocioIgvPorcentaje: number | null
```

En `CajaView.vue` incluir:

```ts
negocioIgvPorcentaje: negocio.value?.igvPorcentaje ?? 18,
```

- [ ] **Step 5: Ejecutar pruebas backend**

Run:

```powershell
mvn -Dtest=ReportesControllerTest test
```

Expected: PASS.

### Task 4: Verificación integral y visual

**Files:**
- Review: todos los archivos anteriores

- [ ] **Step 1: Ejecutar frontend completo**

```powershell
npm test
npm run build
```

Expected: 37 o más pruebas aprobadas y compilación correcta.

- [ ] **Step 2: Ejecutar backend completo**

```powershell
mvn test
```

Expected: BUILD SUCCESS.

- [ ] **Step 3: Revisar diffs**

```powershell
git diff --check
git status --short
```

Expected: sin errores de espacios ni archivos generados.

- [ ] **Step 4: Generar muestras**

Crear una boleta y una factura de prueba con varios productos y comprobar:

```text
datos del cliente antes del detalle;
descripciones completas;
columnas legibles;
importe en letras correcto;
fecha y hora al pie;
altura dinámica sin recortes.
```

- [ ] **Step 5: Commit**

Frontend:

```powershell
git add src/shared/utils/comprobantePdf.ts src/shared/utils/comprobantePdf.test.ts src/modules/caja/views/CajaView.vue src/modules/admin/api/reportesApi.ts
git commit -m "feat: redesign thermal invoices and receipts"
```

Backend:

```powershell
git add src/main/java/com/restaurante/modules/reportes/infrastructure/web/ReportesController.java src/test/java/com/restaurante/modules/reportes/infrastructure/web/ReportesControllerTest.java
git commit -m "feat: expose business tax rate in receipt details"
```
