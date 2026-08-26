# Auditoría de instalación — 25 de agosto de 2026

## Proyecto conectado

- Referencia: `nwxiwnggqzebrefabdxo`
- Estado observado: activo y saludable
- PostgreSQL: 17
- Región: `us-east-2`
- Usuarios reales al cerrar la instalación: `0`
- Filas QA persistentes: `0`

## Migraciones instaladas

| Versión | Nombre |
|---|---|
| 20260825221758 | hogar_control_core |
| 20260825222032 | hogar_control_operations |
| 20260825222056 | hogar_control_security |
| 20260825222113 | hogar_control_storage_realtime |
| 20260825222330 | hogar_control_hardening |
| 20260825222909 | fix_invite_code_generation |
| 20260825223600 | harden_invite_entropy |

## Prueba estructural

La comprobación automática confirmó:

- 7 tablas públicas y RLS activo en las 7;
- 7 políticas públicas de lectura;
- 4 políticas de Storage;
- bucket privado `product-images`, límite de 8 MiB y cuatro tipos MIME permitidos;
- 6 tablas publicadas en Realtime;
- 13 RPC disponibles para `authenticated`;
- 13 RPC bloqueados para `anon`;
- lectura autenticada sujeta a RLS;
- inserción/actualización directa de productos bloqueada;
- inserción directa de movimientos bloqueada;
- 3 helpers de autorización en `app_private`;
- 0 funciones privilegiadas relevantes sin `search_path` fijado.

## Prueba funcional con reversión

Se simuló dentro de una sola transacción:

1. creación de un hogar por Administrador;
2. creación automática de 9 categorías y 11 ubicaciones;
3. invitación y adhesión de un Familiar;
4. invitación y adhesión de una Asesora;
5. creación de producto;
6. consumo y lista de compras;
7. revisión rápida `No hay`;
8. rechazo de creación/edición no autorizada por Asesora;
9. rechazo de archivado por Familiar;
10. archivado válido por Administrador.

El resultado fue satisfactorio. La transacción finalizó con `ROLLBACK`; no quedó ningún usuario, hogar, producto, invitación ni movimiento QA.

También se ejecutaron dos pruebas transaccionales adicionales:

- generación de invitaciones de 12 caracteres con formato válido;
- promoción de un Familiar a Administrador, degradación controlada y rechazo de cambios de rol intentados por una Asesora.

Ambas pasaron y terminaron con `ROLLBACK`, sin filas persistentes.

## Defecto detectado y corregido

La primera prueba encontró que `gen_random_bytes` debía referenciarse como `extensions.gen_random_bytes` en este proyecto. Se corrigió y la prueba completa pasó. Luego los códigos de invitación se ampliaron a 12 caracteres hexadecimales para aumentar la entropía.

## Hallazgos de los asesores

### Seguridad

Supabase conserva advertencias informativas para RPC `SECURITY DEFINER` ejecutables por usuarios autenticados. En esta arquitectura son endpoints intencionales: cada RPC valida `auth.uid()`, hogar y/o rol; `anon` no puede ejecutarlos; y todas fijan `search_path`. Los helpers internos se movieron al esquema no expuesto `app_private`.

### Rendimiento

Se agregaron índices de cobertura para todas las claves foráneas señaladas. El asesor solo marca como no utilizados los índices de una base todavía vacía, lo cual es esperable antes del piloto.

## Límite de validación del frontend

El entorno de preparación no pudo resolver DNS hacia `registry.npmjs.org`; por ello no fue posible descargar dependencias ni producir `dist/` localmente. El workflow de GitHub Actions realiza esa instalación, ejecuta `npm run build` y solo publica si la compilación termina correctamente.

Quedan como pruebas manuales: entrega real de correos de Auth, redirecciones desde GitHub Pages, concurrencia HTTP, fotografías desde navegador y compatibilidad en teléfonos.
