# Ocultar Suministros del panel administrativo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ocultar temporalmente la sección Suministros del menú administrativo sin eliminar sus rutas ni vistas.

**Architecture:** La navegación lateral se define mediante el arreglo local `navSections` de `AdminLayout.vue`. El cambio elimina exclusivamente el objeto de navegación de Suministros; el router continúa registrando Stock y Proveedores para preservar el acceso directo y facilitar su restauración.

**Tech Stack:** Vue 3, TypeScript, Vue Router, Vite

---

### Task 1: Retirar Suministros de la navegación administrativa

**Files:**
- Modify: `src/modules/admin/views/AdminLayout.vue`
- Verify: `src/shared/router/index.ts`

- [ ] **Step 1: Confirmar el estado inicial**

Run:

```powershell
rg -n 'label: "SUMINISTROS"|path: "stock"|path: "proveedores"' src/modules/admin/views/AdminLayout.vue
```

Expected: aparecen la etiqueta `SUMINISTROS` y los enlaces `stock` y `proveedores`.

- [ ] **Step 2: Eliminar el grupo de navegación**

Retirar de `navSections` este bloque completo:

```ts
{
  label: "SUMINISTROS",
  items: [
    { label: "Stock", path: "stock", icon: "pi-box" },
    { label: "Proveedores", path: "proveedores", icon: "pi-truck" },
  ],
},
```

- [ ] **Step 3: Verificar que el menú ya no contiene Suministros**

Run:

```powershell
rg -n 'SUMINISTROS|path: "stock"|path: "proveedores"' src/modules/admin/views/AdminLayout.vue
```

Expected: sin coincidencias y código de salida `1`.

- [ ] **Step 4: Verificar que las rutas se conservan**

Run:

```powershell
rg -n "path: 'stock'|path: 'proveedores'" src/shared/router/index.ts
```

Expected: aparecen las rutas administrativas `stock` y `proveedores`.

- [ ] **Step 5: Compilar el proyecto**

Run:

```powershell
npm run build
```

Expected: TypeScript y Vite terminan correctamente, sin errores.

- [ ] **Step 6: Revisar el alcance del diff**

Run:

```powershell
git diff -- src/modules/admin/views/AdminLayout.vue
```

Expected: el diff elimina únicamente el grupo `SUMINISTROS`.

- [ ] **Step 7: Confirmar el cambio**

```powershell
git add -- src/modules/admin/views/AdminLayout.vue
git commit -m "chore: hide supplies from admin navigation"
```
