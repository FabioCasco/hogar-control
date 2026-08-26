# Validación técnica — Etapa 2

Fecha de instalación: 25 de agosto de 2026.

## Validaciones completadas

- El proyecto Supabase conectado fue identificado como activo.
- Se instalaron y registraron siete migraciones.
- Se verificó la existencia de las siete tablas públicas.
- Se confirmó RLS activo en todas las tablas.
- Se verificaron claves primarias, relaciones, restricciones y enumeraciones.
- Se creó el bucket privado `product-images` con límite de 8 MB y tipos de imagen permitidos.
- Se configuró Realtime para productos, movimientos, categorías, ubicaciones, miembros e invitaciones.
- Se ejecutaron los asesores de seguridad y rendimiento de Supabase.
- Se corrigieron todos los avisos de claves foráneas sin índice.
- Se corrigió la generación de códigos de invitación calificando `extensions.gen_random_bytes` y se aumentó su longitud a 12 caracteres.
- Se conservaron los avisos de índices sin uso, normales en una base todavía vacía.
- Los helpers de autorización se endurecieron mediante un esquema interno y wrappers `SECURITY INVOKER`.
- Se revisaron los RPC públicos `SECURITY DEFINER`; su exposición a `authenticated` es intencional y cada función valida sesión, hogar y/o rol.
- Se generaron los tipos TypeScript del esquema para contrastar tablas, enumeraciones y firmas RPC.
- Se ajustó el frontend para utilizar RPCs en lugar de escrituras directas.
- Se verificó la sintaxis y estructura TypeScript con el compilador disponible y declaraciones locales mínimas; la comprobación definitiva con dependencias reales queda en GitHub Actions.
- Se validó que Vite use una ruta base dinámica para GitHub Pages.
- Se incorporó un workflow con acciones fijadas por SHA.

## Limitación del entorno de preparación

El entorno no pudo resolver DNS hacia el registro público de npm. Por esa razón no fue posible ejecutar localmente una instalación completa de dependencias ni producir `dist/` aquí.

El workflow preparado resuelve esta limitación en GitHub: genera `package-lock.json` en la primera ejecución, instala con `npm ci`, ejecuta `npm run build` y solo después publica el artefacto.

## Validaciones pendientes después de publicar

- ejecución verde del workflow de GitHub Actions;
- registro y confirmación real de correo;
- repetición en navegador con dos cuentas reales y tres roles;
- aislamiento entre dos hogares;
- prueba concurrente sobre el mismo producto;
- carga, reemplazo y eliminación de fotografías;
- recuperación de contraseña desde GitHub Pages;
- prueba en Safari de iPhone y Chrome de Android.

La simulación SQL de los tres roles ya pasó con reversión total. La matriz de aceptación en navegadores está en `docs/03_PLAN_DE_PRUEBAS.md`.
