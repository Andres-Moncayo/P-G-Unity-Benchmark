"""Router HTTP de Identity. Solo expone endpoints, NO contiene lógica."""

from __future__ import annotations

from fastapi import Body
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.modules.identity import crud, service
from app.modules.identity.models import User
from app.modules.identity.schemas import (
    LoginResponse,
    RefreshRequest,
    RoleResponse,
    UserCreate,
    UserResponse,
    UserUpdate,
    PasswordRecovery,
    UserUpdateMe,
)
from core.config import settings
from core.database import get_db
from core.limiter import limiter
from core.security import (
    get_current_active_user,
    require_admin,
    role_is_platform_admin,
    get_password_hash
)

router = APIRouter(prefix="/identity", tags=["Identity"])

# En desarrollo el front suele reintentar / Strict Mode agota 5/min muy rápido.
_AUTH_LOGIN_LIMIT = "60/minute" if settings.ENVIRONMENT == "development" else "5/minute"
_AUTH_REFRESH_LIMIT = (
    "120/minute" if settings.ENVIRONMENT == "development" else "10/minute"
)


# ────────────────────────────────────────────────────────────────────
# AUTH
# ────────────────────────────────────────────────────────────────────
@router.post(
    "/auth/login",
    response_model=LoginResponse,
    summary="Login (OAuth2)",
    description=(
        "Formulario `application/x-www-form-urlencoded`: **username** debe ser el "
        "**email completo** del usuario (el mismo que en la tabla `users.email`). "
        "En Swagger «Authorize», el campo *username* no es un alias corto: usa p. ej. "
        "`admin@unitynexus.com` o `analista@unitynexus.com`."
    ),
)
@limiter.limit(_AUTH_LOGIN_LIMIT)
def login(
    request: Request,
    form: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: Annotated[Session, Depends(get_db)],
):
    """Login estándar OAuth2 (form-data: username=email, password)."""
    return service.authenticate(db, email=form.username, password=form.password)


@router.post("/auth/refresh", response_model=LoginResponse)
@limiter.limit(_AUTH_REFRESH_LIMIT)
def refresh(
    request: Request,
    body: RefreshRequest,
    db: Annotated[Session, Depends(get_db)],
):
    return service.refresh_tokens(db, body.refresh_token)


@router.get("/auth/me", response_model=UserResponse)
def me(current_user: Annotated[User, Depends(get_current_active_user)]):
    """Devuelve el usuario autenticado actual."""
    return current_user

@router.post(
    "/password-recovery",
    status_code=status.HTTP_200_OK,
    summary="Recuperar contraseña",
    description="Simula el envío de un correo con instrucciones para restablecer la contraseña."
)
@limiter.limit("3/minute") # Protegemos esta ruta contra spam
def recover_password(
    request: Request,
    payload: PasswordRecovery,
    background_tasks: BackgroundTasks
):
    """
    Simula el envío de un email de recuperación.
    Siempre devuelve éxito para evitar ataques de enumeración de usuarios.
    """
    # Aquí en el futuro conectarás con SendGrid, AWS SES, etc.
    # user = crud.get_user_by_email(db, email=payload.email)
    # if user: background_tasks.add_task(send_email, user.email, token)
    
    return {"message": "Si el correo existe en nuestro sistema, recibirás un enlace de recuperación en breve."}


# ────────────────────────────────────────────────────────────────────
# ADMIN: gestión de usuarios
# ────────────────────────────────────────────────────────────────────
@router.get("/users", response_model=list[UserResponse])
def list_users(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    only_active: bool = Query(False),
):
    """Lista usuarios.

    En **development** basta con estar autenticado (Swagger / analista sin rol admin).
    En **staging** y **production** solo rol **admin**.
    """
    if settings.ENVIRONMENT != "development" and not role_is_platform_admin(
        current_user.role
    ):
        slug = (
            getattr(current_user.role, "slug", None)
            if current_user.role is not None
            else None
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "En staging/production solo rol 'admin' puede listar usuarios. "
                f"role_id={current_user.role_id!r}, slug={slug!r}."
            ),
        )
    return crud.list_users(db, skip=skip, limit=limit, only_active=only_active)


@router.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_user(
    payload: UserCreate,
    actor: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    return service.admin_create_user(db, payload=payload, actor=actor)


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user(
    user_id: uuid.UUID,
    _: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    user = crud.get_user_by_id(db, user_id)
    if user is None:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )
    return user


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: uuid.UUID,
    payload: UserUpdate,
    _: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    return service.admin_update_user(db, user_id=user_id, payload=payload)


@router.post("/users/{user_id}/activate", response_model=UserResponse)
def activate_user(
    user_id: uuid.UUID,
    _: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    return service.admin_set_active(db, user_id=user_id, is_active=True)


@router.post("/users/{user_id}/deactivate", response_model=UserResponse)
def deactivate_user(
    user_id: uuid.UUID,
    _: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    return service.admin_set_active(db, user_id=user_id, is_active=False)

@router.patch("/auth/me", response_model=UserResponse)
def update_me(
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[Session, Depends(get_db)],
    # EL FIX: Usamos tu schema importado y lo forzamos al Body
    payload: UserUpdateMe = Body(...) 
):
    """Actualiza el perfil del usuario autenticado en la base de datos real."""
    
    if payload.full_name is not None:
        current_user.full_name = payload.full_name

    if payload.new_password is not None:
        current_user.hashed_password = get_password_hash(payload.new_password)

    db.add(current_user)
    db.commit()
    db.refresh(current_user)
    
    return current_user
    """
    Actualiza el perfil del usuario autenticado en la base de datos real.
    """
    # Verificamos y actualizamos la contraseña si se envió una nueva
    if payload.newPassword:
        # ¡CRÍTICO! Hashear la contraseña antes de guardar
        current_user.hashed_password = get_password_hash(payload.newPassword)

    # Verificamos si tu modelo de BD tiene los campos 'name' y 'department'
    if payload.name and hasattr(current_user, 'name'):
        current_user.name = payload.name
        
    if payload.department and hasattr(current_user, 'department'):
        current_user.department = payload.department

    # Guardamos los cambios en la base de datos
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return current_user

# ────────────────────────────────────────────────────────────────────
# ROLES (read-only por ahora)
# ────────────────────────────────────────────────────────────────────
@router.get("/roles", response_model=list[RoleResponse])
def list_roles(
    _: Annotated[User, Depends(require_admin)],
    db: Annotated[Session, Depends(get_db)],
):
    return crud.list_roles(db)
