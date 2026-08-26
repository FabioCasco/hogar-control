# Arquitectura y seguridad

## Diagrama lógico

```text
Navegador / teléfono
        │
        ├── React + TypeScript
        │     ├── Dashboard
        │     ├── Inventario
        │     ├── Compras
        │     ├── Revisión rápida
        │     ├── Historial
        │     └── Ajustes y miembros
        │
        ▼
Supabase
├── Auth
│   └── cuentas, sesiones y recuperación de contraseña
├── PostgreSQL
│   ├── hogares
│   ├── miembros y roles
│   ├── categorías y ubicaciones
│   ├── productos
│   ├── movimientos
│   └── invitaciones
├── Storage privado
│   └── product-images/<household_id>/<archivo>
└── Realtime
    └── eventos de cambios de PostgreSQL
```

## Unidad de separación

El dato principal es `household_id`. Cada categoría, ubicación, producto, movimiento, miembro e invitación pertenece a un hogar.

La aplicación no depende únicamente de ocultar botones. PostgreSQL verifica la membresía y el rol mediante políticas RLS y funciones de autorización.

## Roles

| Acción | Administrador | Familiar | Asesora |
|---|---:|---:|---:|
| Ver inventario | Sí | Sí | Sí |
| Aumentar o disminuir existencias | Sí | Sí | Sí |
| Usar revisión rápida | Sí | Sí | Sí |
| Registrar compra | Sí | Sí | Sí |
| Crear o editar productos | Sí | Sí | No |
| Cambiar manualmente la lista de compras | Sí | Sí | No |
| Importar productos | Sí | Sí | No |
| Archivar productos | Sí | No | No |
| Cambiar nombre del hogar | Sí | No | No |
| Crear/revocar invitaciones | Sí | No | No |
| Cambiar roles o retirar miembros | Sí | No | No |

## Operaciones transaccionales

Las siguientes operaciones se ejecutan en PostgreSQL como una sola transacción:

- Crear hogar, administrador y catálogos iniciales.
- Aceptar invitación y consumir uno de sus usos.
- Ajustar una existencia y registrar su movimiento.
- Convertir Hay/Poco/No hay en una cantidad coherente.
- Registrar una compra.
- Cambiar el estado manual de la lista de compras.

El ajuste usa bloqueo de fila (`FOR UPDATE`) para evitar que dos teléfonos calculen la nueva cantidad sobre el mismo valor anterior.

## Fotografías

- El bucket es privado.
- La ruta empieza con el identificador del hogar.
- La base de datos impide asociar a un producto una ruta de otro hogar.
- El navegador comprime la imagen a un máximo de 1280 px antes de subirla.
- La interfaz usa enlaces temporales y los renueva al volver a la pestaña o después de 45 minutos.

## Claves

El frontend utiliza la URL pública del proyecto y una clave publishable. La seguridad real se apoya en la sesión del usuario, los grants, las políticas RLS y las funciones de la base de datos.

Nunca debe incluirse una clave `secret` o `service_role` en:

- `.env.local` con prefijo `VITE_`;
- el repositorio Git;
- código JavaScript o TypeScript del navegador;
- variables visibles durante la compilación del frontend.

## Invitaciones

- Código aleatorio de ocho caracteres.
- Rol limitado a Familiar o Asesora.
- Vigencia predeterminada de siete días.
- Límite configurable entre 1 y 10 usos.
- Revocación inmediata por el administrador.
- La aceptación se bloquea y actualiza de forma transaccional.

## Historial

Cada cambio de cantidad guarda:

- producto;
- tipo de movimiento;
- diferencia aplicada;
- cantidad resultante;
- nota;
- usuario;
- fecha y hora.

El nombre mostrado se resuelve a partir de la membresía actual. Si un miembro es retirado, los movimientos conservan su `created_by`, pero la interfaz puede mostrar un nombre genérico si ya no existe la membresía.
