"""Router de Opportunities (placeholder).

Endpoints objetivo:
- GET    /api/v1/opportunities
- GET    /api/v1/opportunities/{id}
- POST   /api/v1/opportunities
- POST   /api/v1/opportunities/{id}/service-draft
"""

from fastapi import APIRouter

router = APIRouter(prefix="/opportunities", tags=["Opportunities"])
