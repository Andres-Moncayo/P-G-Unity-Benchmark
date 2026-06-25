# Git Pre-Push Hook Configuration

## Overview
Este proyecto tiene un `pre-push` hook configurado para proteger las ramas `main` y `master` de pushes directos.

## 🚀 Instalación Automática

Después de clonar el repositorio, ejecuta:

```bash
./install-hooks.sh
```

Esto instalará automáticamente los hooks locales en tu `.git/hooks/`.

## Configuración Manual

Si prefieres instalar manualmente:

```bash
# Copiar hooks al directorio local
cp scripts/hooks/pre-push .git/hooks/
cp scripts/hooks/pre-push.ps1 .git/hooks/

# Hacer ejecutable el script (Unix/Linux/macOS)
chmod +x .git/hooks/pre-push
```

## Ubicación del Hook
- **Hooks compartidos**: `scripts/hooks/` (en el repositorio)
- **Hooks locales**: `.git/hooks/` (solo en tu máquina)

### Cómo Funciona
El hook se ejecuta automáticamente cuando ejecutas:
```bash
git push origin <rama>
```

### Reglas
✅ **Permitido**: Push a cualquier rama excepto `main` o `master`
```bash
git push origin dev          # ✅ Permitido
git push origin feature-xyz  # ✅ Permitido
```

❌ **Bloqueado**: Push directo a `main` o `master`
```bash
git push origin main         # ❌ Bloqueado
git push origin master       # ❌ Bloqueado
```

### Mensaje de Error (cuando se intenta pushear a main)
```
====================================================
ERROR: No se permite hacer push directo a main/master.
Por favor, crea una rama y haz un pull request.
====================================================
```

## Flujo Correcto de Trabajo

1. **Después de clonar**: Ejecuta `./install-hooks.sh`
2. **Crear una rama** desde `dev`:
   ```bash
   git checkout dev
   git checkout -b feature/tu-feature
   ```

3. **Hacer commits** en tu rama:
   ```bash
   git add .
   git commit -m "tu mensaje"
   ```

4. **Pushear a tu rama** (siempre permitido):
   ```bash
   git push origin feature/tu-feature
   ```

5. **Crear un Pull Request** en GitHub de tu rama hacia `main`

6. **Review y merge** en GitHub

## Notas Técnicas

- El hook está escrito como un **shell script wrapper** (`.git/hooks/pre-push`) que detecta el SO
- En **Windows**, se ejecuta un script **PowerShell** (`.git/hooks/pre-push.ps1`)
- En **Unix/Linux/macOS**, se ejecuta directamente desde shell
- El hook es **local** (no se vuelve a subir al repositorio)
- Se debe instalar manualmente en nuevas clonaciones usando `./install-hooks.sh`

## Desactivar el Hook (No Recomendado)

Si necesitas desactivarlo temporalmente:
```bash
git push origin main --no-verify
```

⚠️ **Nota**: Usar `--no-verify` es desaconsejado excepto en situaciones de emergencia.
