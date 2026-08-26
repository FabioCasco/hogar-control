# Publicación automática con GitHub Pages

La cuenta conectada es `FabioCasco`. El conector puede escribir en repositorios existentes, pero no ofrece creación de repositorios y el único repositorio visible actualmente es ajeno a Hogar Control. Por eso no se modificó.

El frontend está preparado para un repositorio llamado `hogar-control`, aunque la configuración de Vite calcula automáticamente la ruta base para cualquier nombre de repositorio.

## 1. Crear el repositorio

En la cuenta `FabioCasco`, crea un repositorio público vacío llamado:

```text
hogar-control
```

No agregues README, licencia ni `.gitignore` desde GitHub, porque el paquete ya los contiene.

## 2. Subir el proyecto desde Terminal

Dentro de la carpeta descomprimida ejecuta:

También puedes ejecutar el script incluido con `./scripts/publicar-github.sh`. El procedimiento equivalente es:

```bash
git init
git add .
git commit -m "feat: instalar Hogar Control Etapa 2"
git branch -M main
git remote add origin https://github.com/FabioCasco/hogar-control.git
git push -u origin main
```

La primera ejecución del workflow genera `package-lock.json`, instala exactamente ese árbol con `npm ci`, ejecuta `npm run build` —que valida TypeScript y compila Vite— y publica `dist/`. Si el token de Actions permite escritura, también guarda automáticamente el lockfile; si una regla de rama lo impide, la publicación continúa y el archivo puede subirse después.

## 3. Activar GitHub Pages

En GitHub abre:

```text
Settings → Pages → Build and deployment → Source → GitHub Actions
```

Después abre:

```text
Actions → Validar y publicar Hogar Control
```

La ejecución debe finalizar con las tareas `build` y `deploy` en verde.

La dirección esperada es:

```text
https://fabiocasco.github.io/hogar-control/
```

## 4. Autorizar la URL en Supabase Auth

En el proyecto de Supabase abre:

```text
Authentication → URL Configuration
```

Configura:

```text
Site URL
https://fabiocasco.github.io/hogar-control/
```

Agrega estas Redirect URLs:

```text
http://localhost:5173/**
https://fabiocasco.github.io/hogar-control/
```

Si cambias el nombre del repositorio, sustituye `hogar-control` en estas direcciones.

## 5. Primera prueba

1. Abre la web publicada.
2. Registra la cuenta del administrador.
3. Confirma el correo si Supabase lo solicita.
4. Crea el primer hogar.
5. Registra un producto.
6. Genera un código de invitación.
7. Prueba una segunda cuenta desde una ventana privada.

No cargues el inventario definitivo hasta completar las pruebas de roles y separación entre hogares incluidas en `docs/03_PLAN_DE_PRUEBAS.md`.
