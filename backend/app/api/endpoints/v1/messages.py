"""Message and conversation API endpoints."""

import json
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Path, Query, WebSocket, WebSocketDisconnect
from fastapi.exceptions import HTTPException

from app.constants.message import MAX_MESSAGE_LENGTH
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
from app.services.message_service import AnnotatedMessageService, MessageService
from app.services.ws_manager import manager

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

    session_factory = build_async_session()

    # Wait for auth message as the first message
    try:
        raw = await websocket.receive_text()
        data = json.loads(raw)
    except (json.JSONDecodeError, WebSocketDisconnect):
        await websocket.close(code=4001, reason="Invalid auth message")
        return

    if data.get("type") != "auth" or not data.get("token"):
        await websocket.close(code=4001, reason="First message must be auth")
        return

    token = data["token"]

    # Authenticate with a short-lived session
    auth_db = session_factory()
    try:
        payload = decode_access_token(token)
        if payload is None:
            await websocket.close(code=4001, reason="Invalid token")
            return

        user_id = payload.get("user_id")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return

        user = await user_crud.get_by_id_with_relations(db=auth_db, id=user_id)
        if not user or user.is_deleted or not user.is_active:
            await websocket.close(code=4001, reason="Invalid token")
            return
    finally:
        await auth_db.close()

    await websocket.send_text(json.dumps({"type": "auth", "status": "ok"}))
    await manager.connect(user_id, websocket)

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
                conversation_id = data.get("conversation_id")
                content = data.get("content", "").strip()

                if not conversation_id or not content:
                    await websocket.send_text(
                        json.dumps(
                            {"type": "error", "error": "Missing conversation_id or content"}
                        )
                    )
                    continue

                if len(content) > MAX_MESSAGE_LENGTH:
                    await websocket.send_text(
                        json.dumps(
                            {"type": "error", "error": f"Message too long (max {MAX_MESSAGE_LENGTH} characters)"}
                        )
                    )
                    continue

                db = session_factory()
                try:
                    service = MessageService(
                        db, conversation_crud, message_crud, post_crud, user_crud, ws_manager=manager
                    )
                    await service.send_message(
                        conversation_id=conversation_id,
                        sender_id=user_id,
                        content=content,
                    )
                except HTTPException as exc:
                    await websocket.send_text(
                        json.dumps({"type": "error", "error": exc.detail})
                    )
                except Exception:
                    logger.exception("Error processing WebSocket message for user %s", user_id)
                    await websocket.send_text(
                        json.dumps({"type": "error", "error": "Failed to send message"})
                    )
                finally:
                    await db.close()

            elif data.get("type") == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(user_id)
