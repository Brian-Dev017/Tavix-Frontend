# Ocultar temporalmente Suministros del panel administrativo

## Objetivo

Ocultar temporalmente la sección **Suministros** del menú lateral del panel administrativo.

## Diseño

- Retirar del arreglo `navSections` de `AdminLayout.vue` el grupo con la etiqueta `SUMINISTROS`.
- Al desaparecer el grupo, tampoco se mostrarán sus accesos a **Stock** y **Proveedores**.
- Mantener intactas las rutas `/admin/stock` y `/admin/proveedores`, así como sus vistas y demás código, para facilitar su restauración posterior.
- No utilizar estilos CSS ni una bandera de configuración, ya que el alcance actual solo requiere ocultar temporalmente las opciones de navegación.

## Comportamiento esperado

- El menú lateral administrativo no muestra la etiqueta **Suministros**.
- El menú lateral no muestra los enlaces **Stock** ni **Proveedores**.
- Las demás secciones conservan su orden y funcionamiento.
- Las rutas de suministros siguen funcionando si se accede directamente mediante su URL.

## Verificación

- Ejecutar la compilación del proyecto.
- Confirmar en el código que el grupo ya no forma parte de `navSections`.
- Verificar que las rutas de Stock y Proveedores permanecen registradas.
