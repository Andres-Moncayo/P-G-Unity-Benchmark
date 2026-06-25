"""Router de Alerts (placeholder).

Endpoints objetivo:
- GET   /api/v1/alerts
- PATCH /api/v1/alerts/{id}/read
- WS    /api/v1/alerts/ws (opcional)
"""

from fastapi import APIRouter

router = APIRouter(prefix="/alerts", tags=["Alerts"])
