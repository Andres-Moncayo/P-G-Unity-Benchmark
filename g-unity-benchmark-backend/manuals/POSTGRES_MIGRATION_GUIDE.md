# PostgreSQL — Guía de setup y ejecución

Guía para configurar y levantar el backend con PostgreSQL.
**Sigue los pasos en orden.**

> Si ya tienes un Postgres corriendo (Aiven, Neon, RDS, etc.), salta el paso 1
> y apunta `DATABASE_URL` a tu instancia. Lo demás aplica igual.

---

## 1. PostgreSQL

Necesitas PostgreSQL 16+ corriendo. Opciones:

- **Instancia local** instalada directamente.
- **Servicio cloud**: Aiven, Neon, Supabase, RDS, etc.
- **Contenedor**: el proyecto incluye un `docker-compose.yml` de referencia si se quiere usar Podman/Docker.

Configura las credenciales en `.env` (ver paso 2).

## 2. Configurar entorno

```powershell
copy .env.example .env
```

Editar `.env` con tus valores. Variables clave:

| Variable | Ejemplo |
|----------|---------|
| `DATABASE_URL` | `postgresql+psycopg://user:pwd@localhost:5432/dbname` |
| `SECRET_KEY` | String aleatorio largo |
| `INITIAL_ADMIN_EMAIL` | `admin@globant.com` |
| `INITIAL_ADMIN_PASSWORD` | `Admin123Change!` |

## 3. Crear y activar el venv

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 4. Aplicar migraciones

La migración `001` crea **7 tablas** (`roles`, `users`, `logs`, `posts`,
`metric_history`, `chat_history`, `alerts`) + extensiones `pgcrypto` y
`citext` + índices GIN para JSONB.

La migración `002` siembra los roles base (`admin`, `user`) y el primer
administrador con las credenciales de `.env` (`INITIAL_ADMIN_*`).
Es **idempotente**: la puedes correr múltiples veces.

```powershell
alembic upgrade head
```

Verificación rápida (ajusta usuario/db según tu config):

```powershell
psql -U <user> -d <dbname> -c "\dt"
psql -U <user> -d <dbname> -c "SELECT email, full_name FROM users;"
```

Deberías ver 7 tablas y un usuario admin.

## 5. Levantar la API

```powershell
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Endpoints disponibles inmediatamente:

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | Liveness |
| POST | `/api/v1/identity/auth/login` | Login (form-data: `username` + `password`) |
| POST | `/api/v1/identity/auth/refresh` | Renovar tokens |
| GET | `/api/v1/identity/auth/me` | Usuario actual |
| GET | `/api/v1/identity/users` | Listar usuarios (admin) |
| POST | `/api/v1/identity/users` | Crear usuario (admin) |
| GET | `/api/v1/identity/users/{id}` | Detalle (admin) |
| PATCH | `/api/v1/identity/users/{id}` | Editar (admin) |
| POST | `/api/v1/identity/users/{id}/activate` | Activar (admin) |
| POST | `/api/v1/identity/users/{id}/deactivate` | Desactivar (admin) |
| GET | `/api/v1/identity/roles` | Listar roles (admin) |

Los otros 6 módulos (`metrics`, `intelligence`, `opportunities`,
`simulation`, `assistant`, `alerts`) están registrados pero sin endpoints
todavía. Cada programador los va llenando siguiendo el patrón de
`app/modules/identity/`.

## 6. Smoke test end-to-end

```powershell
# 1. Login con el admin del seed
$resp = curl.exe -s -X POST `
  -d "username=admin@globant.com&password=Admin123Change!" `
  http://localhost:8000/api/v1/identity/auth/login | ConvertFrom-Json

$token = $resp.access_token

# 2. Ver usuario actual
curl.exe -H "Authorization: Bearer $token" http://localhost:8000/api/v1/identity/auth/me

# 3. Crear un nuevo usuario
curl.exe -X POST `
  -H "Authorization: Bearer $token" `
  -H "Content-Type: application/json" `
  -d '{"email":"alice@globant.com","full_name":"Alice","password":"Alice123!","role_slug":"user"}' `
  http://localhost:8000/api/v1/identity/users

# 4. Listar
curl.exe -H "Authorization: Bearer $token" http://localhost:8000/api/v1/identity/users
```

Si el paso 6 funciona, **el setup terminó con éxito**.

## 7. Cómo agregar un endpoint en otro módulo

Sigue el patrón de Identity. Por ejemplo, para Metrics:

1. Define los schemas en `app/modules/metrics/schemas.py`.
2. Escribe queries en `app/modules/metrics/crud.py` (solo SELECT/INSERT, sin reglas).
3. Implementa la lógica en `app/modules/metrics/service.py`.
4. Expón endpoints en `app/modules/metrics/router.py`.
5. **No toques `main.py`** — el router ya está registrado.
6. Si agregas modelos nuevos, asegúrate de importarlos en `app/db/base.py`.
7. Genera migración:
   ```powershell
   alembic revision --autogenerate -m "add metric X"
   alembic upgrade head
   ```

## 8. Troubleshooting

**`could not translate host name "postgres"`** → DATABASE_URL apunta a `postgres`
pero estás corriendo localmente. Usa `localhost`.

**`relation "users" does not exist`** → No corriste `alembic upgrade head`.

**`type "citext" does not exist`** → La migración 001 falló al crear la
extensión. Conéctate como superuser y ejecuta `CREATE EXTENSION citext;`.

**`gen_random_uuid does not exist`** → Igual que arriba pero con `pgcrypto`.

**Login devuelve 401 con el admin del seed** → Verifica que las variables
`INITIAL_ADMIN_*` en tu `.env` coinciden con lo que pones en el body del login.
Si las cambiaste DESPUÉS de correr `alembic upgrade head`, tienes que rehacer:
```powershell
alembic downgrade base
alembic upgrade head
```

## 9. Checklist de criterios de éxito

- [x] El backend corre con PostgreSQL.
- [x] La estructura modular existe y es clara (`app/modules/<contexto>`).
- [x] Los nuevos endpoints están versionados bajo `/api/v1`.
- [x] La lógica de negocio vive en `service.py`, no en routers.
- [x] Existen migraciones Alembic (001 schema + 002 seed).
- [x] Identity (login/refresh/me/admin-CRUD-users/activate/deactivate/roles) operativo.
- [x] ORM models alineados con las 7 tablas de la migración 001.
- [ ] Tests mínimos (pendiente — siguiente iteración).
- [ ] Endpoints de Market Intelligence (módulo `market_intelligence` por implementar).
- [ ] Endpoints de Metrics/Dashboard (módulo `metrics` por implementar).
- [ ] Endpoints de Assistant (módulo `assistant` por implementar).
- [ ] Endpoints de Alerts (módulo `alerts` por implementar).
- [ ] Endpoints de Opportunities (módulo `opportunities` por implementar).
- [ ] Endpoints de Simulation (módulo `simulation` por implementar).
