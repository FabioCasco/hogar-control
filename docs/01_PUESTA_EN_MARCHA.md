# Puesta en marcha de Hogar Control v0.3

## Objetivo

Pasar de una aplicación local a un espacio compartido donde varias personas consulten y actualicen el mismo hogar.

## Ruta recomendada

### Fase A — Demostración local

1. Instalar Node.js compatible.
2. Ejecutar `npm install`.
3. Ejecutar `npm run dev` sin crear `.env.local`.
4. Probar inventario, compras, revisión rápida, fotografías y exportación.

**Criterio de salida:** la dinámica básica se comprende y no requiere instrucciones extensas.

### Fase B — Proyecto de Supabase

Esta fase ya fue completada en el proyecto conectado. Para reconstruir otro entorno:

1. Ejecuta las siete migraciones de `supabase/migrations/` en orden.
2. Revisa que existan las tablas:
   - `households`
   - `household_members`
   - `categories`
   - `locations`
   - `products`
   - `movements`
   - `household_invites`
3. Revisa que el bucket privado `product-images` exista.
4. Confirma que RLS esté activo en todas las tablas públicas creadas.
5. Confirma que las seis tablas configuradas estén dentro de `supabase_realtime`.

**Criterio de salida:** las migraciones terminan sin errores y el esquema aparece completo.

### Fase C — Conexión local

1. Copiar `.env.example` como `.env.local`.
2. Pegar la URL del proyecto.
3. Pegar la clave publishable.
4. Configurar `http://localhost:5173` como URL permitida en Auth.
5. Reiniciar `npm run dev`.

**Criterio de salida:** aparece la pantalla de registro, no la puerta de demostración.

### Fase D — Prueba multiusuario

Usar dos perfiles de navegador diferentes.

**Administrador**

1. Crear cuenta.
2. Crear hogar.
3. Crear dos productos.
4. Generar código para Asesora del hogar.

**Segunda cuenta**

1. Crear cuenta.
2. Entrar mediante el código.
3. Abrir Revisión rápida.
4. Marcar un producto como Poco y otro como No hay.

**Administrador**

1. Verificar que los cambios aparezcan sin recargar manualmente.
2. Revisar que el historial muestre el nombre de la segunda cuenta.
3. Confirmar que los faltantes aparezcan en Compras.

**Criterio de salida:** los dos perfiles observan cantidades coherentes y las acciones respetan los permisos.

### Fase E — Migración de datos reales

1. Exportar la v0.1 antes de cambiar cualquier dato.
2. Conservar una copia intacta del JSON.
3. Importar inicialmente en un hogar de prueba.
4. Comparar número de productos, cantidades, mínimos, ideales y fotografías.
5. Repetir en el hogar definitivo únicamente cuando la comparación sea correcta.

### Fase F — Compilación

```bash
npm run typecheck
npm run build
npm run preview
```

Revisar la aplicación compilada en `http://localhost:4173`.

### Fase G — Publicación

Sigue `docs/05_PUBLICACION_GITHUB_PAGES.md`. El workflow incluye las variables públicas de Supabase, compila el proyecto y publica `dist/`. Después agrega el dominio final a Supabase Auth y ejecuta nuevamente la matriz crítica del plan de pruebas.
