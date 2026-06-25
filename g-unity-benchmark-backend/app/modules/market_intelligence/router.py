"""Router de Market Intelligence (placeholder).

Pendiente: implementar siguiendo el patrón de identity/router.py:
    router -> service -> crud -> models

Endpoints objetivo (ver DDD_LIGHT_IMPLEMENTATION_PLAN.md):
- POST   /api/v1/intelligence/sources
- POST   /api/v1/intelligence/documents
- POST   /api/v1/intelligence/insights
- GET    /api/v1/intelligence/insights
- GET    /api/v1/intelligence/insights/{id}
"""

from fastapi import APIRouter

router = APIRouter(prefix="/intelligence", tags=["Market Intelligence"])
