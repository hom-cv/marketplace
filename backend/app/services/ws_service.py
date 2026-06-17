"""WebSocket service for authentication and message handling."""

import json
import logging

from fastapi import WebSocket, WebSocketDisconnect
from fastapi.exceptions import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.constants.message import MAX_MESSAGE_LENGTH
from app.crud.ban import BanCRUD
from app.crud.conversation import ConversationCRUD
from app.crud.message import MessageCRUD
from app.crud.message_flag import MessageFlagCRUD
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
        ban_crud: BanCRUD,
        message_flag_crud: MessageFlagCRUD,
        ws_manager: ConnectionManager,
    ) -> None:
        self._ws = websocket
        self._session_factory = session_factory
        self._user_crud = user_crud
        self._conversation_crud = conversation_crud
        self._message_crud = message_crud
        self._post_crud = post_crud
        self._ban_crud = ban_crud
        self._message_flag_crud = message_flag_crud
        self._ws_manager = ws_manager

    async def validate_user(self, user_id: int) -> bool:
        """Validate user exists, is active, and is not banned. Sends auth ok or closes."""
        db = self._session_factory()
        try:
            user = await self._user_crud.get_by_id_with_relations(db=db, id=user_id)
            if not user or user.is_deleted or not user.is_active:
                await self._ws.close(code=4001, reason="Invalid token")
                return False
            active_ban = await self._ban_crud.get_active_user_ban(db, user_id=user_id)
            if active_ban:
                await self._ws.close(code=4003, reason="Account banned")
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
                message_flag_crud=self._message_flag_crud,
            )
            await service.send_message(
                conversation_id=conversation_id,
                sender_id=user_id,
                content=content,
            )
        except HTTPException as exc:
            await db.rollback()
            await self._send_error(exc.detail)
        except Exception:
            await db.rollback()
            logger.exception(
                "Error processing WebSocket message for user %s", user_id
            )
            await self._send_error("Failed to send message")
        finally:
            await db.close()

    async def run(self, user_id: int) -> None:
        """Full connection lifecycle: validate, register, loop, clean up."""
        if not await self.validate_user(user_id):
            return

        if not await self._ws_manager.connect(user_id, self._ws):
            return

        try:
            while True:
                raw = await self._ws.receive_text()
                try:
                    data = json.loads(raw)
                except json.JSONDecodeError:
                    await self._send_error("Invalid JSON")
                    continue

                msg_type = data.get("type")

                if msg_type == "message":
                    await self.handle_message(data, user_id)

                elif msg_type == "ping":
                    await self._ws.send_text(json.dumps({"type": "pong"}))

        except WebSocketDisconnect:
            pass
        finally:
            await self._ws_manager.disconnect(user_id, self._ws)

    async def _send_error(self, error: str) -> None:
        """Send an error frame to the client."""
        await self._ws.send_text(json.dumps({"type": "error", "error": error}))
