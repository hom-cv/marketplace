"""Message service for chat business logic."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import bad_request_error, forbidden_error, not_found_error
from app.crud.conversation import ConversationCRUD, get_conversation_crud
from app.crud.message import MessageCRUD, get_message_crud
from app.crud.message_flag import MessageFlagCRUD, get_message_flag_crud
from app.crud.post import PostCRUD, get_post_crud
from app.crud.user import UserCRUD, get_user_crud
from app.db.utils import get_async_db
from app.models.conversation import Conversation
from app.models.post import Post
from app.models.user import User
from app.schemas.conversation import (
    ConversationDetailSchema,
    ConversationParticipantSchema,
    ConversationPostSchema,
    ConversationResponseSchema,
    MessageResponseSchema,
    WebSocketMessageSchema,
)
from app.services.message_scanner import scan_message
from app.services.ws_manager import ConnectionManager, manager as _ws_manager


class MessageService:
    """Service for messaging business logic."""

    def __init__(
        self,
        db: AsyncSession,
        conversation_crud: ConversationCRUD,
        message_crud: MessageCRUD,
        post_crud: PostCRUD,
        user_crud: UserCRUD,
        ws_manager: ConnectionManager,
        message_flag_crud: MessageFlagCRUD | None = None,
    ) -> None:
        self.db = db
        self._conversation_crud = conversation_crud
        self._message_crud = message_crud
        self._post_crud = post_crud
        self._user_crud = user_crud
        self._ws_manager = ws_manager
        self._message_flag_crud = message_flag_crud

    async def get_or_create_conversation(
        self, *, user_id: int, post_id: int
    ) -> ConversationResponseSchema:
        """
        Get or create a conversation for a post.

        The current user becomes the initiator (buyer),
        the post owner becomes the recipient (seller).
        """
        post = await self._post_crud.get_by_id(self.db, id=post_id)
        if not post or post.deleted_at is not None:
            raise not_found_error("Post not found")

        if post.user_id == user_id:
            raise bad_request_error("You cannot message yourself about your own listing")

        conversation = await self._conversation_crud.get_or_create(
            self.db,
            initiator_id=user_id,
            recipient_id=post.user_id,
            post_id=post_id,
        )
        await self.db.commit()

        return await self._build_conversation_response(conversation, post)

    async def get_user_conversations(
        self, *, user_id: int
    ) -> list[ConversationResponseSchema]:
        """Get all conversations for a user with last message preview."""
        conversations = await self._conversation_crud.get_user_conversations(
            self.db, user_id=user_id
        )

        conv_ids = [c.id for c in conversations]
        last_messages = await self._message_crud.get_last_messages_batch(
            self.db, conversation_ids=conv_ids
        )

        return [
            ConversationResponseSchema(
                id=conv.id,
                initiator=ConversationParticipantSchema(
                    id=conv.initiator.id, username=conv.initiator.username
                ),
                recipient=ConversationParticipantSchema(
                    id=conv.recipient.id, username=conv.recipient.username
                ),
                post=self._build_post_schema(conv.post),
                last_message=MessageResponseSchema.model_validate(last_msg)
                if (last_msg := last_messages.get(conv.id))
                else None,
                created_date=conv.created_date,
            )
            for conv in conversations
        ]

    async def get_conversation_messages(
        self,
        *,
        conversation_id: int,
        user_id: int,
        before_id: int | None = None,
        limit: int = 50,
    ) -> ConversationDetailSchema:
        """Get conversation detail with paginated messages."""
        conversation = await self._conversation_crud.get_by_id_with_relations(
            self.db, conversation_id=conversation_id
        )
        if not conversation:
            raise not_found_error("Conversation not found")

        if conversation.initiator_id != user_id and conversation.recipient_id != user_id:
            raise forbidden_error("You are not a participant in this conversation")

        return await self._build_conversation_detail(
            conversation, before_id=before_id, limit=limit
        )

    async def get_conversation_messages_admin(
        self,
        *,
        conversation_id: int,
        before_id: int | None = None,
        limit: int = 50,
    ) -> ConversationDetailSchema:
        """Get conversation detail for admin review (no participant check)."""
        conversation = await self._conversation_crud.get_by_id_with_relations(
            self.db, conversation_id=conversation_id
        )
        if not conversation:
            raise not_found_error("Conversation not found")

        return await self._build_conversation_detail(
            conversation, before_id=before_id, limit=limit
        )

    async def _build_conversation_detail(
        self,
        conversation: Conversation,
        *,
        before_id: int | None = None,
        limit: int = 50,
    ) -> ConversationDetailSchema:
        """Build conversation detail schema with paginated messages."""
        messages = await self._message_crud.get_messages(
            self.db,
            conversation_id=conversation.id,
            before_id=before_id,
            limit=limit,
        )
        total = await self._message_crud.count_messages(
            self.db, conversation_id=conversation.id
        )

        return ConversationDetailSchema(
            id=conversation.id,
            initiator=ConversationParticipantSchema(
                id=conversation.initiator.id, username=conversation.initiator.username
            ),
            recipient=ConversationParticipantSchema(
                id=conversation.recipient.id, username=conversation.recipient.username
            ),
            post=self._build_post_schema(conversation.post),
            messages=[
                MessageResponseSchema.model_validate(m) for m in messages
            ],
            total_messages=total,
        )

    async def send_message(
        self, *, conversation_id: int, sender_id: int, content: str
    ) -> MessageResponseSchema:
        """Send a message in a conversation and broadcast via WebSocket."""
        conversation = await self._conversation_crud.get_by_id(
            self.db, conversation_id=conversation_id
        )
        if not conversation:
            raise not_found_error("Conversation not found")

        if (
            conversation.initiator_id != sender_id
            and conversation.recipient_id != sender_id
        ):
            raise forbidden_error("You are not a participant in this conversation")

        message = await self._message_crud.create(
            self.db,
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=content,
        )

        # Update conversation sort order
        await self._conversation_crud.touch(
            self.db, conversation_id=conversation_id
        )

        # Silent flagging — never blocks the message
        if self._message_flag_crud is not None:
            matched = scan_message(content)
            if matched:
                await self._message_flag_crud.create(
                    self.db,
                    message_id=message.id,
                    conversation_id=conversation_id,
                    sender_id=sender_id,
                    matched_patterns=",".join(matched),
                )

        await self.db.commit()

        msg_schema = MessageResponseSchema.model_validate(message)

        # Broadcast to both participants via WebSocket
        if self._ws_manager is not None:
            ws_data = WebSocketMessageSchema(
                type="new_message",
                conversation_id=conversation_id,
                message=msg_schema,
            ).model_dump(mode="json")
            other_user_id = self.get_other_user_id(conversation, sender_id)
            await self._ws_manager.send_to_user(other_user_id, ws_data)
            await self._ws_manager.send_to_user(sender_id, ws_data)

        return msg_schema

    async def _get_user(self, user_id: int) -> User:
        """Get user by ID via UserCRUD."""
        user = await self._user_crud.get_by_id(self.db, user_id)
        if not user:
            raise not_found_error("User not found")
        return user

    @staticmethod
    def get_other_user_id(conversation: Conversation, user_id: int) -> int:
        """Return the ID of the other participant in a conversation."""
        if conversation.initiator_id == user_id:
            return conversation.recipient_id
        return conversation.initiator_id

    @staticmethod
    def _build_post_schema(post: Post | None) -> ConversationPostSchema:
        """Build a ConversationPostSchema, handling deleted/missing posts."""
        return ConversationPostSchema(
            id=post.id if post else 0,
            title=post.title if post else "Deleted post",
            image_url=post.image_url if post else None,
        )

    async def _build_conversation_response(
        self, conversation: Conversation, post: Post | None = None
    ) -> ConversationResponseSchema:
        """Build a ConversationResponseSchema from a Conversation model."""
        if post is None:
            post = await self._post_crud.get_by_id(self.db, id=conversation.post_id)

        initiator = await self._get_user(conversation.initiator_id)
        recipient = await self._get_user(conversation.recipient_id)
        last_message = await self._message_crud.get_last_message(
            self.db, conversation_id=conversation.id
        )

        return ConversationResponseSchema(
            id=conversation.id,
            initiator=ConversationParticipantSchema(
                id=initiator.id, username=initiator.username
            ),
            recipient=ConversationParticipantSchema(
                id=recipient.id, username=recipient.username
            ),
            post=self._build_post_schema(post),
            last_message=MessageResponseSchema.model_validate(last_message)
            if last_message
            else None,
            created_date=conversation.created_date,
        )


def _get_message_service(
    conversation_crud: Annotated[ConversationCRUD, Depends(get_conversation_crud)],
    message_crud: Annotated[MessageCRUD, Depends(get_message_crud)],
    message_flag_crud: Annotated[MessageFlagCRUD, Depends(get_message_flag_crud)],
    post_crud: Annotated[PostCRUD, Depends(get_post_crud)],
    user_crud: Annotated[UserCRUD, Depends(get_user_crud)],
    db: AsyncSession = Depends(get_async_db),
) -> MessageService:
    """Factory function to create MessageService instance."""
    return MessageService(
        db, conversation_crud, message_crud, post_crud, user_crud,
        ws_manager=_ws_manager, message_flag_crud=message_flag_crud,
    )


AnnotatedMessageService = Annotated[MessageService, Depends(_get_message_service)]
