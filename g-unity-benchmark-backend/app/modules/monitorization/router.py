"""Router de monitorización — endpoints y métricas simples.

Implementa endpoints para listar y filtrar posts (usa la tabla `posts`
definida en el bounded context `market_intelligence`). También incluye
funciones métricas que devuelven un único número para mostrar en UI.

Rutas propuestas (registrar bajo `/api/v1` en `main.py`):
- GET  /monitorization/posts              -> lista con filtros (sentiment, platform, bug)
- GET  /monitorization/posts/{id}         -> detalle de un post
- GET  /monitorization/posts/sentiment/{sentiment} -> lista por sentimiento

Métricas (devuelven número o lista simple):
- GET /monitorization/monitored_forums
- GET /monitorization/monitored_bugs
- GET /monitorization/count_posts

Las implementaciones usan dependencias y modelos existentes y son
intencionalmente conservadoras (sin optimizaciones avanzadas).
"""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from core.database import get_postgres_db
from app.modules.monitorization.crud import (
	count_monitored_posts,
	get_last_update_time,
	get_monitored_bugs,
	get_monitored_forums,
	get_monitorization_post_by_id,
	get_sources_count,
	list_business_category_posts as crud_list_business_category_posts,
	list_monitorization_posts as crud_list_monitorization_posts,
	list_posts_by_sentiment as crud_list_posts_by_sentiment,
	_transform_to_detailed_response,
)
from app.modules.monitorization.schemas import (
	MonitorizationBusinessCategoryDetailResponse,
	MonitorizationPostDetailResponse,
)

router = APIRouter(prefix="/monitorization", tags=["Monitorization"])


class MonitorizationPostResponse(BaseModel):
	id: int
	title: str
	summary: Optional[str] = None
	url: Optional[str] = None
	date: datetime
	platform: str
	sentiment: str
	business_category: str
	bug: Optional[str] = None
	performance: Optional[str] = None
	churn_risk: bool
	churn_percentage: Optional[float] = None
	promoter: int
	detractor: int
	alert_type: str
	created_at: datetime

	model_config = {"from_attributes": True}


class MonitorizationBusinessCategoryResponse(BaseModel):
	category: str
	posts: List[MonitorizationPostResponse]


class CountResponse(BaseModel):
	count: int


class LastUpdateResponse(BaseModel):
	last_update: str | None = None


class DbStatusResponse(BaseModel):
	connected: bool


@router.get(
	"/posts",
	response_model=List[MonitorizationPostDetailResponse],
	summary="List monitorization posts",
	description="Returns monitorization posts with optional filters and pagination.",
)
def list_monitorization_posts(
	pg_db: Annotated[Session, Depends(get_postgres_db)],
	sentiment: Optional[str] = Query(None, description="Sentiment filter: positive or negative."),
	platform: Optional[str] = Query(None, description="Platform filter."),
	bug: Optional[str] = Query(None, description="Bug type filter."),
	business: Optional[str] = Query(
		None,
		description=(
			"Strategic pillar filter: general | producto | finanzas | ecosistema | posicionamiento. "
			"Uses the same rules as Analytics (?business=)."
		),
	),
	skip: int = Query(0, ge=0),
	limit: int = Query(20, ge=1, le=100),
):
	"""Lista posts de monitorización con filtros básicos y paginación."""
	try:
		posts = crud_list_monitorization_posts(
			pg_db,
			sentiment=sentiment,
			platform=platform,
			bug=bug,
			business=business,
			skip=skip,
			limit=limit,
		)
		return [_transform_to_detailed_response(p) for p in posts]
	except Exception as exc:
		raise HTTPException(status_code=500, detail=f"Error leyendo posts: {exc}")

@router.get(
	"/posts/sentiment/{sentiment}",
	response_model=List[MonitorizationPostDetailResponse],
	summary="List posts by sentiment",
	description="Returns monitorization posts filtered by the sentiment path parameter.",
)
def list_posts_by_sentiment(
	sentiment: str,
	pg_db: Annotated[Session, Depends(get_postgres_db)],
	limit: int = Query(50, ge=1, le=500),
):
	"""Devuelve posts filtrados por sentimiento (con límite razonable)."""
	try:
		posts = crud_list_posts_by_sentiment(pg_db, sentiment, limit=limit)
		return [_transform_to_detailed_response(p) for p in posts]
	except Exception as exc:
		raise HTTPException(status_code=500, detail=f"Error leyendo posts por sentimiento: {exc}")

@router.get(
	"/posts/categories",
	response_model=List[MonitorizationBusinessCategoryDetailResponse],
	summary="List posts grouped by business category",
	description="Returns monitorization posts grouped by business_category.",
)
def list_business_category_posts(
	pg_db: Annotated[Session, Depends(get_postgres_db)],
	sentiment: Optional[str] = Query(None, description="Sentiment filter: positive or negative."),
	platform: Optional[str] = Query(None, description="Platform filter."),
	bug: Optional[str] = Query(None, description="Bug type filter."),
	skip: int = Query(0, ge=0),
	limit: int = Query(20, ge=1, le=100),
):
	try:
		grouped = crud_list_business_category_posts(
			pg_db,
			sentiment=sentiment,
			platform=platform,
			bug=bug,
			skip=skip,
			limit=limit,
		)
		return [
			{
				"category": group["category"],
				"posts": [_transform_to_detailed_response(p) for p in group["posts"]],
			}
			for group in grouped
		]
	except Exception as exc:
		raise HTTPException(status_code=500, detail=f"Error agrupando posts: {exc}")


@router.get(
	"/posts/{post_id}",
	response_model=MonitorizationPostDetailResponse,
	summary="Get monitorization post by ID",
	description="Returns one monitorization post by its numeric identifier.",
)
def get_monitorization_post(
	post_id: int, pg_db: Annotated[Session, Depends(get_postgres_db)]
):
	"""Devuelve un post por su ID."""
	post = get_monitorization_post_by_id(pg_db, post_id)
	if not post:
		raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post no encontrado")
	return _transform_to_detailed_response(post)


@router.get(
	"/monitored_forums",
	response_model=CountResponse,
	summary="Get monitored websites count",
	description="Returns how many websites/domains are configured in the search service.",
)
def api_monitored_forums(pg_db: Annotated[Session, Depends(get_postgres_db)]):
	"""Endpoint que devuelve la cantidad de webs monitoreadas por búsqueda."""
	try:
		return CountResponse(count=int(get_monitored_forums(pg_db)))
	except Exception as exc:
		raise HTTPException(status_code=500, detail=f"Error obteniendo foros: {exc}")


@router.get(
	"/monitored_bugs",
	response_model=CountResponse,
	summary="Get monitored bugs count",
	description="Returns the total number of monitored posts that contain a bug tag.",
)
def api_monitored_bugs(pg_db: Annotated[Session, Depends(get_postgres_db)]):
	"""Endpoint que devuelve la cantidad de bugs en la misma ventana del fetch."""
	try:
		return CountResponse(count=int(get_monitored_bugs(pg_db, skip=0, limit=20)))
	except Exception as exc:
		raise HTTPException(status_code=500, detail=f"Error contando bugs: {exc}")


@router.get(
	"/monitored_bugs_windowed",
	response_model=CountResponse,
	summary="Get monitored bugs count in fetch window",
	description="Returns the number of monitored posts with bugs within the latest fetched window.",
)
def api_monitored_bugs_windowed(
	pg_db: Annotated[Session, Depends(get_postgres_db)],
	sentiment: Optional[str] = Query(None, description="Sentiment filter used by the fetch window."),
	platform: Optional[str] = Query(None, description="Platform filter used by the fetch window."),
	bug: Optional[str] = Query(None, description="Bug filter used by the fetch window."),
	skip: int = Query(0, ge=0),
	limit: int = Query(20, ge=1, le=100),
):
	try:
		return CountResponse(count=int(get_monitored_bugs(pg_db, sentiment=sentiment, platform=platform, bug=bug, skip=skip, limit=limit)))
	except Exception as exc:
		raise HTTPException(status_code=500, detail=f"Error contando bugs en ventana: {exc}")


@router.get(
	"/count_posts",
	response_model=CountResponse,
	summary="Count competitor platforms",
	description=(
		"Returns the number of distinct competitor platforms present in the DB (excludes 'unity'). "
		"This is a temporary behavior: date query parameters were removed and are ignored."
	),
)
def api_count_posts(pg_db: Annotated[Session, Depends(get_postgres_db)]):
	"""Cuenta plataformas competidoras distintas detectadas en la base de datos.

	Nota: los parámetros de rango de fecha se han eliminado temporalmente.
	"""
	try:
		return CountResponse(count=int(count_monitored_posts(pg_db)))
	except Exception as exc:
		raise HTTPException(status_code=500, detail=f"Error contando plataformas: {exc}")


@router.get(
	"/sources_count",
	response_model=CountResponse,
	summary="Total analyzed posts count",
	description="Returns the total number of rows in analyzed_posts for the header Live Data indicator.",
)
def api_sources_count(pg_db: Annotated[Session, Depends(get_postgres_db)]):
	try:
		return CountResponse(count=int(get_sources_count(pg_db)))
	except Exception as exc:
		raise HTTPException(status_code=500, detail=f"Error contando posts: {exc}")


@router.get(
	"/last_update",
	response_model=LastUpdateResponse,
	summary="Latest post timestamp",
	description="Returns the time (HH:MM:SS) of the most recent post in analyzed_posts.",
)
def api_last_update(pg_db: Annotated[Session, Depends(get_postgres_db)]):
	try:
		return LastUpdateResponse(last_update=get_last_update_time(pg_db))
	except Exception as exc:
		raise HTTPException(status_code=500, detail=f"Error obteniendo última actualización: {exc}")


@router.get(
	"/db_status",
	response_model=DbStatusResponse,
	summary="PostgreSQL connection status",
	description="Returns whether the application can reach PostgreSQL (SELECT 1).",
)
def api_db_status(pg_db: Annotated[Session, Depends(get_postgres_db)]):
	try:
		pg_db.execute(text("SELECT 1"))
		return DbStatusResponse(connected=True)
	except Exception:
		try:
			pg_db.rollback()
		except Exception:
			pass
		return DbStatusResponse(connected=False)