from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from jose import JWTError
from app.core.security import decode_access_token

router = APIRouter()


@router.websocket("/ws/tickets")
async def tickets_ws(websocket: WebSocket):
    """
    JWT-secured WebSocket for live ticket updates
    Token is passed as:
    ws://host/ws/tickets?token=JWT
    """

    token = websocket.query_params.get("token")

    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        user_id = decode_access_token(token)
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()

    try:
        while True:
            data = await websocket.receive_text()

            # Example response (replace with real logic)
            await websocket.send_json({
                "event": "ticket_update",
                "user_id": user_id,
                "message": data,
            })

    except WebSocketDisconnect:
        print(f"WebSocket disconnected: user={user_id}")
