from fastapi import WebSocket, WebSocketDisconnect
from typing import List
import json
import asyncio
import uuid
from datetime import datetime


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_text(json.dumps(message))


manager = ConnectionManager()


async def simulate_ticket_stream():
    """
    DEMO STREAM
    Replace with DB / queue / event bus later
    """
    while True:
        await asyncio.sleep(6)

        ticket = {
            "id": f"TCK-{uuid.uuid4().hex[:6].upper()}",
            "subject": "API timeout error",
            "summary": "Customer reports intermittent 504 errors",
            "priority": "Urgent",
            "status": "Open",
            "timestamp": datetime.utcnow().isoformat()
        }

        await manager.broadcast({
            "type": "NEW_TICKET",
            "payload": ticket
        })


async def ticket_websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)

    try:
        while True:
            await websocket.receive_text()  # keep alive
    except WebSocketDisconnect:
        manager.disconnect(websocket)
