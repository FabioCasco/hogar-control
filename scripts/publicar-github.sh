#!/usr/bin/env bash
set -euo pipefail

REMOTE="${1:-https://github.com/FabioCasco/hogar-control.git}"

if [ -d .git ]; then
  echo "Esta carpeta ya contiene un repositorio Git; no se modificó."
  exit 1
fi

git init
git branch -M main
git add .
git commit -m "Instalar Hogar Control v0.3"
git remote add origin "$REMOTE"
git push -u origin main
