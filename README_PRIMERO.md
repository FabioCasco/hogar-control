# Leer primero — Hogar Control v0.3.0

## Ya está instalado

El backend compartido quedó instalado en el proyecto Supabase conectado:

- siete tablas de operación;
- tres roles: Administrador, Familiar y Asesora;
- RLS en todas las tablas públicas;
- funciones transaccionales para inventario, compras, revisiones, invitaciones y administración;
- bucket privado `product-images`;
- sincronización Realtime;
- siete migraciones registradas y revisadas con los asesores de Supabase.

El frontend ya contiene la URL y la clave pública `publishable` del proyecto. No contiene una clave `service_role` ni credenciales administrativas.

## Solo faltan dos grupos de acciones manuales

### 1. Crear y cargar el repositorio

Crea en la cuenta `FabioCasco` un repositorio público vacío llamado:

```text
hogar-control
```

Descomprime este paquete, abre Terminal dentro de la carpeta y ejecuta:

```bash
./scripts/publicar-github.sh
```

El script inicializa Git, crea el primer commit y lo envía a:

```text
https://github.com/FabioCasco/hogar-control.git
```

Luego abre en GitHub:

```text
Settings → Pages → Build and deployment → Source → GitHub Actions
```

La publicación esperada será:

```text
https://fabiocasco.github.io/hogar-control/
```

### 2. Autorizar la dirección en Supabase Auth

Después de publicar, abre en Supabase:

```text
Authentication → URL Configuration
```

Registra:

```text
Site URL
https://fabiocasco.github.io/hogar-control/

Redirect URLs
http://localhost:5173/**
https://fabiocasco.github.io/hogar-control/
```

## Verificación posterior

Confirma que las tareas `build` y `deploy` aparezcan en verde. Luego crea primero cuentas de prueba. No cargues todavía el inventario definitivo hasta comprobar los roles y el aislamiento entre hogares descritos en `docs/03_PLAN_DE_PRUEBAS.md`.
