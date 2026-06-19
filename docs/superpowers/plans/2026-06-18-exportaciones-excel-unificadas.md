# Exportaciones Excel Unificadas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar Dashboard, Ventas, Arqueo, Pagos e Historial en libros Excel válidos, tabulados, con gráficos y leyendas.

**Architecture:** Un constructor compartido de Apache POI centralizará estilos, tablas, metadatos y gráficos. `ReportesController` compondrá los cinco libros con datos existentes; Vue solo enviará filtros y descargará blobs usando `Content-Disposition`.

**Tech Stack:** Java 21, Spring Boot, Apache POI 5.2.5, Vue 3, TypeScript, Vitest.

---

### Task 1: Blindar compatibilidad de estilos y gráficos

**Files:**
- Create: `backend/src/main/java/com/restaurante/modules/reportes/infrastructure/excel/ExcelReportBuilder.java`
- Create: `backend/src/test/java/com/restaurante/modules/reportes/infrastructure/excel/ExcelReportBuilderTest.java`

- [ ] Crear pruebas que generen un libro con tabla, moneda, porcentaje, gráfico de barras y gráfico circular.
- [ ] Comprobar que la máscara monetaria sea `"S/" #,##0.00`.
- [ ] Comprobar que los ejes del gráfico de barras tengan IDs positivos, únicos y referencias cruzadas correctas.
- [ ] Comprobar que los dibujos tengan identificadores no nulos y positivos.
- [ ] Comprobar títulos de serie y leyendas visibles.
- [ ] Implementar estilos compartidos, tabla, metadatos y gráficos.
- [ ] Ejecutar `mvn -Dtest=ExcelReportBuilderTest test`.

### Task 2: Migrar Dashboard y Ventas

**Files:**
- Modify: `backend/src/main/java/com/restaurante/modules/reportes/infrastructure/web/ReportesController.java`
- Modify: `backend/src/test/java/com/restaurante/modules/reportes/infrastructure/web/ReportesControllerExcelTest.java`

- [ ] Reemplazar helpers locales de Excel por `ExcelReportBuilder`.
- [ ] Mantener hojas existentes y añadir metadatos, leyendas, filas alternadas y formatos.
- [ ] No crear gráficos cuando no existan filas.
- [ ] Inspeccionar `styles.xml`, dibujos y gráficos dentro del ZIP generado.
- [ ] Ejecutar `mvn -Dtest=ReportesControllerExcelTest test`.

### Task 3: Añadir Pagos y Arqueo en Excel

**Files:**
- Modify: `backend/src/main/java/com/restaurante/modules/reportes/infrastructure/web/ReportesController.java`
- Modify: `backend/src/main/java/com/restaurante/modules/caja/infrastructure/persistence/ArqueoJpaRepo.java`
- Modify: `backend/src/test/java/com/restaurante/modules/reportes/infrastructure/web/ReportesControllerExcelTest.java`

- [ ] Crear `GET /api/reportes/pagos/excel`.
- [ ] Crear `GET /api/reportes/arqueos/excel`.
- [ ] Exportar resumen, detalle y gráficos definidos en la especificación.
- [ ] Probar hojas, tablas, indicadores y gráficos.

### Task 4: Añadir Historial filtrado en Excel

**Files:**
- Modify: `backend/src/main/java/com/restaurante/modules/reportes/infrastructure/web/ReportesController.java`
- Modify: `backend/src/test/java/com/restaurante/modules/reportes/infrastructure/web/ReportesControllerExcelTest.java`

- [ ] Crear `GET /api/reportes/historial/excel?estado=...`.
- [ ] Exportar todos los registros coincidentes, no solo la página visible.
- [ ] Crear hojas `Resumen`, `Comprobantes`, `Métodos de pago`, `Estados` y `Tipos`.
- [ ] Probar filtro opcional y contenido agregado.

### Task 5: Migrar botones frontend

**Files:**
- Modify: `frontend/src/modules/admin/api/reportesApi.ts`
- Modify: `frontend/src/modules/admin/views/ArqueoView.vue`
- Modify: `frontend/src/modules/admin/views/PagosView.vue`
- Modify: `frontend/src/modules/admin/views/HistorialView.vue`

- [ ] Añadir métodos blob para Pagos, Arqueo e Historial.
- [ ] Sustituir `Exportar CSV` por `Exportar Excel`.
- [ ] Enviar fecha local en Pagos y estado seleccionado en Historial.
- [ ] Descargar con el nombre de `Content-Disposition`.
- [ ] Mantener mensajes de error específicos.
- [ ] Ejecutar `npm test` y `npm run build`.

### Task 6: Verificación integral

**Files:**
- Review: todos los archivos anteriores

- [ ] Ejecutar `mvn test`.
- [ ] Ejecutar `npm test` y `npm run build`.
- [ ] Ejecutar `git diff --check` en ambos repositorios.
- [ ] Generar los cinco libros y validar su ZIP interno.
- [ ] Abrir los libros con Apache POI sin errores.
- [ ] Confirmar que el cambio ajeno en `src/App.vue` no se incluya.
