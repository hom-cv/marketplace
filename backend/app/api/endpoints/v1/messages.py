"""Message and conversation API endpoints."""

import json
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, WebSocket, WebSocketDisconnect

from app.constants.message import (
    WS_RATE_LIMIT_MAX_TOKENS,
    WS_RATE_LIMIT_REFILL_SECONDS,
)
from app.core.security import get_current_user
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
from app.services.ws_manager import RateLimiter, manager
from app.services.ws_service import WebSocketService

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


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
):
    """
    WebSocket endpoint for real-time chat.

    Authentication: Send {type: "auth", token: "..."} as the first message.
    Messages: {type: "message", conversation_id: int, content: str}
    """
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

    user_id = await ws_service.authenticate()
    if user_id is None:
        return

    await manager.connect(user_id, websocket)
    rate_limiter = RateLimiter(WS_RATE_LIMIT_MAX_TOKENS, WS_RATE_LIMIT_REFILL_SECONDS)

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
                        json.dumps({"type": "error", "error": "Rate limited. Please slow down."})
                    )
                    continue
                await ws_service.handle_message(data, user_id)

            elif data.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(user_id)
