# Pruebas SQL

Después de ejecutar las siete migraciones en orden:

1. Ejecuta `20260825_schema_smoke.sql` para validar tablas, RLS, RPC, privilegios, Storage y Realtime.
2. En un proyecto nuevo o de pruebas, ejecuta `20260825_functional_rollback.sql` para simular Administrador, Familiar y Asesora. La transacción termina con `ROLLBACK`, por lo que no conserva usuarios, hogares ni productos QA.

La prueba funcional fue ejecutada satisfactoriamente en el proyecto conectado el 25 de agosto de 2026. Las pruebas reales de correo, navegador, concurrencia HTTP y dispositivos continúan en `docs/03_PLAN_DE_PRUEBAS.md`.
