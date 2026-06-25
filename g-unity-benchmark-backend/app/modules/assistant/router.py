"""Router de Assistant (placeholder).

Endpoints objetivo:
- POST /api/v1/assistant/threads
- GET  /api/v1/assistant/threads/{id}
- POST /api/v1/assistant/threads/{id}/messages
- GET  /api/v1/assistant/threads/{id}/messages
"""

from fastapi import APIRouter

router = APIRouter(prefix="/assistant", tags=["Assistant"])
