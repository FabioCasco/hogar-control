# Plan de pruebas de aceptación

> Estado del backend: la simulación SQL transaccional de Administrador, Familiar y Asesora pasó el 25 de agosto de 2026 y terminó con `ROLLBACK`. Las casillas siguientes corresponden a validación real con paquetes, navegador, correo y red.

## 1. Instalación y modos

- [ ] Sin `.env.local`, la aplicación abre en modo demostración.
- [ ] Con credenciales válidas, la aplicación abre la pantalla de acceso.
- [ ] Con credenciales incompletas, no intenta conectarse parcialmente.
- [ ] `npm run typecheck` termina sin errores.
- [ ] `npm run build` genera `dist/`.

## 2. Autenticación

- [ ] Se puede registrar una cuenta válida.
- [ ] Una contraseña con menos de ocho caracteres se rechaza en la interfaz.
- [ ] Se puede iniciar y cerrar sesión.
- [ ] La recuperación de contraseña vuelve a la aplicación.
- [ ] Cancelar una recuperación cierra la sesión temporal.

## 3. Hogares e invitaciones

- [ ] La primera cuenta puede crear un hogar.
- [ ] Al crear el hogar aparecen categorías y ubicaciones predeterminadas.
- [ ] El administrador puede generar invitación Familiar.
- [ ] El administrador puede generar invitación Asesora.
- [ ] Un código válido permite entrar.
- [ ] Un código vencido, revocado o agotado se rechaza.
- [ ] Dos intentos simultáneos no superan el máximo de usos.

## 4. Separación entre hogares

Crear Usuario A/Hogar A y Usuario B/Hogar B.

- [ ] A no ve productos, miembros, movimientos ni fotografías de B.
- [ ] B no ve productos, miembros, movimientos ni fotografías de A.
- [ ] Cambiar un identificador desde las herramientas del navegador no permite leer ni modificar filas ajenas.
- [ ] Una ruta de imagen que empieza con otro `household_id` se rechaza.

## 5. Productos

- [ ] Administrador y Familiar pueden crear y editar.
- [ ] Asesora no ve el botón de agregar ni editar.
- [ ] Stock ideal igual o menor al mínimo se rechaza.
- [ ] Cantidades negativas se rechazan o se normalizan a cero.
- [ ] Un producto en cero queda Agotado y entra en Compras.
- [ ] Un producto en mínimo queda Crítico y entra en Compras.
- [ ] Un producto entre mínimo e ideal queda Bajo.
- [ ] Un producto en ideal o superior queda Suficiente.
- [ ] Solo Administrador puede archivar.

## 6. Concurrencia

Abrir el mismo producto en dos sesiones.

- [ ] Dos aumentos casi simultáneos se suman; ninguno sobrescribe al otro.
- [ ] Dos consumos nunca producen cantidad negativa.
- [ ] Cada cambio crea un movimiento independiente.
- [ ] Las dos sesiones terminan mostrando la misma cantidad.

## 7. Revisión rápida

- [ ] Hay establece el stock ideal y lo retira de Compras.
- [ ] Poco establece un valor entre mínimo e ideal.
- [ ] No hay establece cero y lo agrega a Compras.
- [ ] El historial registra el usuario que realizó la revisión.

## 8. Compras

- [ ] La sugerencia repone hasta el stock ideal.
- [ ] La cantidad sugerida puede modificarse.
- [ ] Registrar compra suma exactamente la cantidad indicada.
- [ ] Alcanzar el stock ideal retira el producto de la lista.
- [ ] Asesora puede registrar una reposición, pero no modificar manualmente la lista.

## 9. Fotografías

- [ ] JPEG, PNG, WebP y GIF válidos se procesan.
- [ ] Archivos que no son imágenes se rechazan.
- [ ] Archivos mayores de 8 MB se rechazan.
- [ ] Cambiar una fotografía elimina la anterior después de guardar.
- [ ] Quitar fotografía elimina el objeto anterior.
- [ ] El enlace privado sigue funcionando después de volver a la pestaña.

## 10. Migración v0.1

- [ ] Acepta el JSON original con objeto `data`.
- [ ] Acepta un JSON con `products` en la raíz.
- [ ] Conserva nombre, categoría, ubicación, unidad, cantidades y lista.
- [ ] Convierte fotografías embebidas a Storage.
- [ ] Un archivo sin productos se rechaza.
- [ ] La prueba se realiza primero en un hogar temporal.

## 11. Roles

- [ ] Administrador puede promover a otro miembro como Administrador.
- [ ] Familiar no puede administrar miembros ni invitaciones.
- [ ] Asesora no puede editar fichas ni cambiar el nombre del hogar.
- [ ] No se puede retirar o degradar al último administrador.
- [ ] Un cambio de rol se refleja en la sesión afectada al sincronizar.

## 12. Navegadores objetivo

- [ ] Safari en iPhone.
- [ ] Chrome en Android.
- [ ] Safari o Chrome en computadora.
- [ ] Vista móvil estrecha.
- [ ] Conexión lenta y reconexión después de suspensión.
