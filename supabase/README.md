# Supabase — Hogar Control

El proyecto conectado contiene estas siete migraciones, en el mismo orden que los archivos de esta carpeta:

```text
20260825221758_hogar_control_core.sql
20260825222032_hogar_control_operations.sql
20260825222056_hogar_control_security.sql
20260825222113_hogar_control_storage_realtime.sql
20260825222330_hogar_control_hardening.sql
20260825222909_fix_invite_code_generation.sql
20260825223600_harden_invite_entropy.sql
```

## Resultado instalado

- siete tablas públicas;
- RLS activo en todas;
- funciones transaccionales de inventario y administración;
- códigos de invitación aleatorios de 12 caracteres;
- bucket privado `product-images`;
- políticas de Storage por hogar;
- seis tablas en la publicación `supabase_realtime`;
- índices de cobertura para todas las claves foráneas;
- helpers de autorización separados del esquema expuesto.

No vuelvas a ejecutar estas migraciones sobre el proyecto conectado salvo que estés reconstruyendo una base vacía. Los archivos se conservan como historial reproducible para otros entornos.

Nunca agregues una clave `secret` o `service_role` a archivos `VITE_*`. El frontend usa exclusivamente la clave `publishable`.
