"""WebSocket service for authentication and message handling."""

import json
import logging

from fastapi import WebSocket
from fastapi.exceptions import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.constants.message import MAX_MESSAGE_LENGTH
from app.crud.conversation import ConversationCRUD
from app.crud.message import MessageCRUD
from app.crud.post import PostCRUD
from app.crud.user import UserCRUD
from app.services.message_service import MessageService
from app.services.ws_manager import ConnectionManager

logger = logging.getLogger(__name__)


class WebSocketService:
    """Per-connection service handling auth and message processing."""

    def __init__(
        self,
        websocket: WebSocket,
        session_factory: async_sessionmaker[AsyncSession],
        user_crud: UserCRUD,
        conversation_crud: ConversationCRUD,
        message_crud: MessageCRUD,
        post_crud: PostCRUD,
        ws_manager: ConnectionManager,
    ) -> None:
        self._ws = websocket
        self._session_factory = session_factory
        self._user_crud = user_crud
        self._conversation_crud = conversation_crud
        self._message_crud = message_crud
        self._post_crud = post_crud
        self._ws_manager = ws_manager

    async def validate_user(self, user_id: int) -> bool:
        """Validate user exists and is active. Sends auth ok or closes. Returns True on success."""
        db = self._session_factory()
        try:
            user = await self._user_crud.get_by_id_with_relations(db=db, id=user_id)
            if not user or user.is_deleted or not user.is_active:
                await self._ws.close(code=4001, reason="Invalid token")
                return False
        finally:
            await db.close()

        await self._ws.send_text(json.dumps({"type": "auth", "status": "ok"}))
        return True

    async def handle_message(self, data: dict, user_id: int) -> None:
        """Validate and process an incoming chat message."""
        conversation_id = data.get("conversation_id")
        content = data.get("content", "").strip()

        if not conversation_id or not content:
            await self._send_error("Missing conversation_id or content")
            return

        if len(content) > MAX_MESSAGE_LENGTH:
            await self._send_error(
                f"Message too long (max {MAX_MESSAGE_LENGTH} characters)"
            )
            return

        db = self._session_factory()
        try:
            service = MessageService(
                db,
                self._conversation_crud,
                self._message_crud,
                self._post_crud,
                self._user_crud,
                ws_manager=self._ws_manager,
            )
            await service.send_message(
                conversation_id=conversation_id,
                sender_id=user_id,
                content=content,
            )
            await db.commit()
        except HTTPException as exc:
            await self._send_error(exc.detail)
        except Exception:
            logger.exception(
                "Error processing WebSocket message for user %s", user_id
            )
            await self._send_error("Failed to send message")
        finally:
            await db.close()

    async def _send_error(self, error: str) -> None:
        """Send an error frame to the client."""
        await self._ws.send_text(json.dumps({"type": "error", "error": error}))
