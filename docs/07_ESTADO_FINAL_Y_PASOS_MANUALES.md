# Estado final de la instalación

Fecha: 25 de agosto de 2026.

## Completado en Supabase

El proyecto conectado `nwxiwnggqzebrefabdxo` ya contiene:

- siete migraciones registradas;
- siete tablas públicas con RLS activo;
- hogares compartidos y tres roles;
- RPC transaccionales para inventario, compras, invitaciones y miembros;
- escrituras directas revocadas al cliente;
- bucket privado `product-images` con políticas por hogar;
- Realtime para productos, movimientos, categorías, ubicaciones, miembros e invitaciones;
- índices de claves foráneas y controles de integridad;
- URL y clave pública conectadas al frontend.

Los avisos restantes del asesor de seguridad corresponden a RPC `SECURITY DEFINER` que deben ser llamadas por usuarios autenticados. Su ejecución fue revocada a `PUBLIC` y `anon`; cada RPC verifica sesión, hogar y/o rol antes de modificar datos.

## Completado en el frontend

- React + TypeScript + Vite.
- Conexión al proyecto real de Supabase.
- Callbacks de Auth compatibles con la subruta de GitHub Pages.
- Ruta `base` calculada automáticamente desde `GITHUB_REPOSITORY`.
- Manifest e íconos con rutas relativas.
- Workflow de GitHub Actions con acciones fijadas por SHA.
- La publicación solo ocurre después de validar TypeScript y compilar.
- La primera ejecución genera `package-lock.json`; intenta guardarlo en el repositorio y continúa aunque una política de rama impida ese commit automático.

## Acciones manuales inevitables

El conector de GitHub disponible en esta conversación sí puede escribir en repositorios existentes, pero no expone una acción para crear un repositorio nuevo. Como el único repositorio visible no corresponde a Hogar Control, no se modificó. Por eso quedan únicamente estas acciones:

1. Crear en la cuenta `FabioCasco` un repositorio público vacío llamado `hogar-control`.
2. Descomprimir el paquete y ejecutar:

   ```bash
   ./scripts/publicar-github.sh
   ```

3. En GitHub, seleccionar `Settings → Pages → Source → GitHub Actions`.
4. En Supabase Auth, registrar la URL publicada:

   ```text
   Site URL
   https://fabiocasco.github.io/hogar-control/

   Redirect URLs
   http://localhost:5173/**
   https://fabiocasco.github.io/hogar-control/
   ```

5. Confirmar que GitHub Actions complete `build` y `deploy`, abrir la URL publicada y ejecutar las pruebas reales de navegador de `docs/03_PLAN_DE_PRUEBAS.md`. La simulación SQL multirol ya fue completada satisfactoriamente y revertida.

## Límite de validación actual

La descarga de paquetes npm no pudo completarse en el entorno de preparación por una falla de resolución DNS. Por ello no se afirma que exista un `dist/` validado localmente. El workflow ejecuta la instalación real y `npm run build`, que incluye `npm run typecheck` antes de `vite build`; si algo falla, GitHub Pages no se publica.
