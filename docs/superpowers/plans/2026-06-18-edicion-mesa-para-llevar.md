# Edición de Mesa para Llevar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir al administrador editar la capacidad y cambiar el estado de la mesa para llevar sin permitir renombrarla ni eliminarla.

**Architecture:** El frontend separará los permisos de edición, estado y eliminación mediante reglas puras comprobables. El backend reconocerá `PARA_LLEVAR` como una mesa administrable, conservará su nombre y aplicará las restricciones autoritativas de ocupación y eliminación.

**Tech Stack:** Vue 3, TypeScript, Vitest, Spring Boot, Java 21, JUnit 5 y Mockito.

---

### Task 1: Reglas de permisos del frontend

**Files:**
- Create: `src/shared/utils/adminTableRules.ts`
- Create: `src/shared/utils/adminTableRules.test.ts`
- Modify: `src/modules/admin/views/MesasAdminView.vue`

- [ ] **Step 1: Escribir pruebas para identificar y autorizar la mesa para llevar**

Cubrir que una mesa llamada `Para llevar` solo puede editarse en estado
`DISPONIBLE`, puede cambiar de estado en `DISPONIBLE` o `INACTIVA` y nunca puede
eliminarse.

- [ ] **Step 2: Ejecutar las pruebas y confirmar que fallan**

Run:

```powershell
npm test -- src/shared/utils/adminTableRules.test.ts
```

Expected: FAIL porque el helper todavía no existe.

- [ ] **Step 3: Implementar reglas puras**

Exportar:

```ts
isTakeoutAdminTable(mesa)
canEditAdminTable(mesa)
canToggleAdminTable(mesa)
canDeleteAdminTable(mesa)
```

- [ ] **Step 4: Adaptar el formulario**

Al editar la mesa para llevar, mostrar `Para llevar` en un campo deshabilitado,
enviar ese mismo nombre al backend y permitir modificar solamente capacidad.
Usar permisos separados para cada botón.

- [ ] **Step 5: Verificar frontend**

Run:

```powershell
npm test
npm run build
```

Expected: PASS.

### Task 2: Reglas autoritativas del backend

**Files:**
- Modify: `backend/src/main/java/com/restaurante/modules/admin/infrastructure/web/AdminController.java`
- Modify: `backend/src/test/java/com/restaurante/modules/admin/infrastructure/web/AdminControllerTest.java`

- [ ] **Step 1: Escribir pruebas backend**

Cubrir:

- actualización de capacidad conservando `Para llevar`;
- transición `DISPONIBLE` a `INACTIVA`;
- transición `INACTIVA` a `DISPONIBLE`;
- rechazo cuando está `OCUPADA`;
- rechazo permanente de eliminación.

- [ ] **Step 2: Ejecutar las pruebas y confirmar que fallan**

Run:

```powershell
mvn -Dtest=AdminControllerTest test
```

Expected: FAIL por el bloqueo actual de `PARA_LLEVAR`.

- [ ] **Step 3: Permitir edición protegida**

En `actualizarMesa`, conservar el nombre existente cuando
`mesa.isParaLlevar()` y actualizar únicamente capacidad. Mantener el rechazo
cuando la mesa esté ocupada.

- [ ] **Step 4: Permitir cambio de estado protegido**

Retirar el rechazo por tipo y conservar la regla que bloquea estados
`OCUPADA` y `RESERVADA`, permitiendo únicamente `DISPONIBLE` e `INACTIVA`.

- [ ] **Step 5: Conservar eliminación bloqueada**

Mantener el rechazo explícito de `eliminarMesa` para `PARA_LLEVAR`.

- [ ] **Step 6: Verificar backend y conjunto completo**

Run:

```powershell
mvn test
```

Expected: PASS.

### Task 3: Verificación final

**Files:**
- Review: todos los archivos anteriores

- [ ] Ejecutar `git diff --check` en frontend y backend.
- [ ] Confirmar que el nombre de la mesa para llevar nunca se envía vacío.
- [ ] Confirmar que editar y cambiar estado se deshabilitan cuando está ocupada.
- [ ] Confirmar que eliminar permanece deshabilitado siempre.

### Task 4: Bloquear pedidos para llevar cuando la mesa está inactiva

**Files:**
- Create: `src/shared/utils/takeoutTableRules.ts`
- Create: `src/shared/utils/takeoutTableRules.test.ts`
- Modify: `src/modules/caja/views/CajaView.vue`
- Modify: `src/modules/pedidos/views/PedidoView.vue`

- [ ] Comprobar con una regla pura que solo `DISPONIBLE` permite el acceso.
- [ ] Consultar `/api/mesas` desde Caja y deshabilitar el botón si la mesa para
  llevar está inactiva, ausente o no pudo verificarse.
- [ ] Revalidar el estado al entrar directamente a `/pedido-para-llevar` y
  volver a `/caja` cuando no esté disponible.
- [ ] Actualizar el estado junto con la recarga manual, periódica y en tiempo
  real de Caja.
