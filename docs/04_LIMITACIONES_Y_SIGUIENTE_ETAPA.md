# Limitaciones actuales y siguiente etapa

## Resuelto en esta entrega

- Backend compartido instalado en Supabase.
- Autenticación, hogares, roles e invitaciones.
- Inventario sincronizado y lista automática de compras.
- Operaciones concurrentes de stock con bloqueo de fila.
- Fotografías privadas.
- Historial de movimientos.
- Migración desde la v0.1.
- RLS, índices, Storage y Realtime configurados.
- Frontend preparado para GitHub Pages.
- Workflow automático de validación, compilación y publicación.

## Pendiente fuera del alcance del conector

1. Crear el repositorio nuevo en GitHub y subir los archivos.
2. Seleccionar **GitHub Actions** como fuente de GitHub Pages.
3. Registrar la URL final en Supabase Auth.
4. Completar pruebas reales con cuentas, correos y teléfonos. La simulación SQL de roles ya está aprobada.

## Limitaciones funcionales deliberadas

- No existe modo offline.
- No hay notificaciones push.
- Categorías y ubicaciones no se editan todavía desde la interfaz.
- El historial visible está limitado a los 500 movimientos más recientes.
- La importación v0.1 debe probarse primero en un hogar temporal.
- La manifestación PWA está incluida, pero no hay service worker ni estrategia de caché offline.
- No se incluyen escáner de códigos, comparación de precios, IA ni lectura de facturas.

## Próxima iteración recomendada

La Etapa 2.1 debe enfocarse en estabilidad:

1. ejecutar la publicación y observar el primer workflow;
2. completar el plan de pruebas;
3. corregir diferencias entre Safari y Chrome;
4. añadir pruebas automatizadas de RLS;
5. paginar el historial;
6. añadir administración de categorías y ubicaciones;
7. mejorar la importación por lotes con reporte de errores;
8. instalar una estrategia PWA únicamente después del piloto.
