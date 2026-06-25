#!/bin/bash
# Script para instalar git hooks locales
# Ejecutar: ./install-hooks.sh

echo "Instalando git hooks locales..."

# Crear directorio hooks si no existe
mkdir -p .git/hooks

# Copiar hooks desde scripts/hooks/ a .git/hooks/
if [ -f "scripts/hooks/pre-push" ]; then
    cp scripts/hooks/pre-push .git/hooks/
    chmod +x .git/hooks/pre-push
    echo "✓ Hook pre-push instalado"
fi

if [ -f "scripts/hooks/pre-push.ps1" ]; then
    cp scripts/hooks/pre-push.ps1 .git/hooks/
    echo "✓ Hook pre-push.ps1 instalado"
fi

echo "Hooks instalados correctamente."
echo "Ejecuta: ./install-hooks.sh después de cada git clone/pull"
