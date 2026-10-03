from fastapi import APIRouter
from app.models.playbook import Playbook
from app.database import async_session

router = APIRouter(prefix="/playbooks", tags=["Playbooks"])

@router.get("/")
async def list_playbooks():
    async with async_session() as session:
        result = await session.execute(Playbook.__table__.select())
        return result.fetchall()

@router.post("/")
async def create_playbook(payload: dict):
    async with async_session() as session:
        playbook = Playbook(**payload)
        session.add(playbook)
        await session.commit()
        return playbook
