# Hogar Control — Etapa 2 compartida (v0.3.0)

Aplicación web para administrar inventario doméstico, alertas de stock, lista automática de compras, revisiones rápidas y trazabilidad de movimientos entre varios usuarios.

## Estado de esta entrega

El backend ya fue instalado en el proyecto Supabase conectado y quedó compuesto por siete migraciones:

```text
hogar_control_core
hogar_control_operations
hogar_control_security
hogar_control_storage_realtime
hogar_control_hardening
fix_invite_code_generation
harden_invite_entropy
```

La aplicación está conectada a ese proyecto mediante su URL pública y su clave `publishable`. El código incluye un workflow de GitHub Actions que valida TypeScript, compila Vite y publica automáticamente en GitHub Pages.

El conector de GitHub disponible en esta conversación permite leer y escribir en repositorios existentes, pero no expone una acción para crear un repositorio nuevo. El único repositorio visible era ajeno a Hogar Control, por lo que no se modificó. La creación del repositorio y la primera carga quedaron preparadas y documentadas en `docs/05_PUBLICACION_GITHUB_PAGES.md`.

## Funciones incluidas

- Registro, inicio de sesión y recuperación por correo.
- Hogares compartidos con roles Administrador, Familiar y Asesora, incluida promoción de un segundo administrador.
- Acceso por códigos aleatorios de 12 caracteres, con vencimiento, usos máximos y revocación.
- Inventario con categorías, ubicaciones, fotografías y semáforo de existencias.
- Stock actual, mínimo e ideal.
- Lista de compras automática y reposición sugerida.
- Revisión rápida: Hay, Poco y No hay.
- Historial de compras, consumos, ajustes y revisiones.
- Operaciones transaccionales para evitar pérdidas en cambios simultáneos.
- Fotografías privadas en Supabase Storage.
- Sincronización mediante Supabase Realtime.
- Importación del respaldo JSON de la v0.1.
- Modo demostración cuando no existen variables de Supabase.
- Despliegue automático en GitHub Pages.

## Arquitectura

```text
GitHub
├── repositorio y control de versiones
├── GitHub Actions
│   ├── instala dependencias
│   ├── valida TypeScript
│   ├── compila Vite
│   └── publica dist/
└── GitHub Pages
          │
          ▼
Supabase
├── Auth
├── PostgreSQL + RLS
├── Storage privado
└── Realtime
```

## Requisitos locales

- Node.js 22 o posterior.
- npm.
- Git, para subir el proyecto desde Terminal.

## Ejecutar localmente

Las credenciales públicas de producción están en `.env.production`. Para desarrollo local crea `.env.local` a partir de `.env.example` o usa las mismas variables públicas del proyecto.

```bash
npm install
npm run dev
```

Abre:

```text
http://localhost:5173
```

Para validar y compilar:

```bash
npm run typecheck
npm run build
npm run preview
```

## Publicar en GitHub Pages

La ruta detallada está en:

```text
docs/05_PUBLICACION_GITHUB_PAGES.md
```

Con el nombre recomendado `hogar-control`, la dirección final será:

```text
https://fabiocasco.github.io/hogar-control/
```

El workflow calcula automáticamente la ruta base a partir del nombre real del repositorio, por lo que también funciona con otro nombre.

## Configuración manual indispensable de Supabase Auth

Después de conocer la URL final, abre **Authentication → URL Configuration** y registra:

```text
Site URL
https://fabiocasco.github.io/hogar-control/

Redirect URLs
http://localhost:5173/**
https://fabiocasco.github.io/hogar-control/
```

El conector utilizado para instalar la base no expone la modificación de estas URL de Auth.

## Seguridad implementada

- RLS activo en las siete tablas públicas.
- Lectura limitada a miembros del mismo hogar.
- Escrituras sensibles realizadas mediante funciones transaccionales con controles de sesión y rol.
- Operaciones directas de escritura revocadas al cliente.
- Helpers internos de autorización fuera del esquema expuesto.
- Bucket `product-images` privado y separado por `household_id`.
- Clave `service_role` ausente del frontend.
- Dependencias directas fijadas a versiones exactas.
- Acciones de GitHub fijadas por SHA.

Los avisos restantes del asesor de seguridad corresponden a RPC `SECURITY DEFINER` que deben ser ejecutables por usuarios autenticados. Son endpoints intencionales: tienen `search_path` fijado, bloquean `anon` y validan sesión, pertenencia al hogar y/o rol antes de modificar datos.

## Estructura

```text
.github/workflows/deploy-pages.yml
public/
src/
├── components/
├── contexts/
├── hooks/
├── lib/
├── pages/
├── services/
├── App.tsx
└── types.ts
supabase/
├── migrations/
└── tests/
docs/
```

## Prueba de aceptación

La simulación transaccional del backend con los tres roles ya pasó y no dejó datos de prueba. Antes de cargar el inventario definitivo, completa las pruebas reales de navegador de `docs/03_PLAN_DE_PRUEBAS.md`, en particular:

1. crear dos cuentas;
2. crear dos hogares separados;
3. verificar aislamiento de datos;
4. probar roles Administrador, Familiar y Asesora;
5. comprobar cambios simultáneos de existencias;
6. subir y reemplazar fotografías;
7. probar recuperación de contraseña desde la URL publicada.


## Licencia

Código distribuido bajo licencia MIT. Consulta `LICENSE`.
