"""Message and conversation API endpoints."""

import json
import logging
from typing import Annotated

from app.core.jwt import create_ws_ticket
from app.core.security import decode_access_token, get_current_user
from app.crud.conversation import conversation_crud
from app.crud.message import message_crud
from app.crud.post import post_crud
from app.crud.user import user_crud
from app.db.session import build_async_session
from app.models import User
from app.schemas.conversation import (
    ConversationCreateSchema,
    ConversationDetailSchema,
    ConversationResponseSchema,
    MessageCreateSchema,
    MessageResponseSchema,
)
from app.services.message_service import AnnotatedMessageService
from app.services.ws_manager import manager
from app.services.ws_service import WebSocketService
from fastapi import APIRouter, Depends, Path, Query, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/messages", tags=["messages"])


@router.post("/conversations", response_model=ConversationResponseSchema)
async def create_or_get_conversation(
    body: ConversationCreateSchema,
    message_service: AnnotatedMessageService,
    current_user: Annotated[User, Depends(get_current_user)],
) -> ConversationResponseSchema:
    """Create or get an existing conversation for a post."""
    return await message_service.get_or_create_conversation(
        user_id=current_user.id, post_id=body.post_id
    )


@router.get("/conversations", response_model=list[ConversationResponseSchema])
async def list_conversations(
    message_service: AnnotatedMessageService,
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[ConversationResponseSchema]:
    """List all conversations for the current user."""
    return await message_service.get_user_conversations(user_id=current_user.id)


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationDetailSchema,
)
async def get_conversation(
    message_service: AnnotatedMessageService,
    current_user: Annotated[User, Depends(get_current_user)],
    conversation_id: Annotated[int, Path()],
    before_id: Annotated[int | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> ConversationDetailSchema:
    """Get a conversation with paginated messages."""
    return await message_service.get_conversation_messages(
        conversation_id=conversation_id,
        user_id=current_user.id,
        before_id=before_id,
        limit=limit,
    )


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=MessageResponseSchema,
)
async def send_message(
    body: MessageCreateSchema,
    message_service: AnnotatedMessageService,
    current_user: Annotated[User, Depends(get_current_user)],
    conversation_id: Annotated[int, Path()],
) -> MessageResponseSchema:
    """Send a message in a conversation via REST. Also pushes via WebSocket."""
    return await message_service.send_message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content=body.content,
    )


@router.post("/ws/ticket")
async def create_ws_ticket_endpoint(
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    """Exchange an access token for a short-lived WebSocket ticket."""
    return {"ticket": create_ws_ticket(current_user.id)}


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
):
    """
    WebSocket endpoint for real-time chat.

    Connect via: POST /ws/ticket -> get ticket -> ws://host/api/v1/messages/ws?ticket=<ticket>
    Messages: {type: "message", conversation_id: int, content: str}
    """
    ticket = websocket.query_params.get("ticket")
    if not ticket:
        await websocket.close(code=4001, reason="Missing ticket")
        return

    payload = decode_access_token(ticket)
    if not payload or payload.get("sub") != "ws_ticket" or not payload.get("user_id"):
        await websocket.close(code=4001, reason="Invalid ticket")
        return

    user_id: int = payload["user_id"]

    await websocket.accept()

    ws_service = WebSocketService(
        websocket=websocket,
        session_factory=build_async_session(),
        user_crud=user_crud,
        conversation_crud=conversation_crud,
        message_crud=message_crud,
        post_crud=post_crud,
        ws_manager=manager,
    )

    if not await ws_service.validate_user(user_id):
        return

    await manager.connect(user_id, websocket)
    rate_limiter = manager.get_rate_limiter(user_id)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(
                    json.dumps({"type": "error", "error": "Invalid JSON"})
                )
                continue

            if data.get("type") == "message":
                if not rate_limiter.consume():
                    await websocket.send_text(
                        json.dumps(
                            {
                                "type": "error",
                                "error": "Rate limited. Please slow down.",
                            }
                        )
                    )
                    continue
                await ws_service.handle_message(data, user_id)

            elif data.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(user_id, websocket)
