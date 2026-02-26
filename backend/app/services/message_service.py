"""Message service for chat business logic."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import bad_request_error, forbidden_error, not_found_error
from app.crud.conversation import ConversationCRUD, get_conversation_crud
from app.crud.message import MessageCRUD, get_message_crud
from app.crud.post import PostCRUD, get_post_crud
from app.db.utils import get_async_db
from app.models.conversation import Conversation
from app.models.message import Message
from app.models.post import Post
from app.models.user import User
from app.schemas.conversation import (
    ConversationDetailSchema,
    ConversationParticipantSchema,
    ConversationPostSchema,
    ConversationResponseSchema,
    MessageResponseSchema,
)


class MessageService:
    """Service for messaging business logic."""

    def __init__(
        self,
        db: AsyncSession,
        conversation_crud: ConversationCRUD,
        message_crud: MessageCRUD,
        post_crud: PostCRUD,
    ) -> None:
        self.db = db
        self._conversation_crud = conversation_crud
        self._message_crud = message_crud
        self._post_crud = post_crud

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

        return await self._build_conversation_response(conversation, post)

    async def get_user_conversations(
        self, *, user_id: int
    ) -> list[ConversationResponseSchema]:
        """Get all conversations for a user with last message preview."""
        conversations = await self._conversation_crud.get_user_conversations(
            self.db, user_id=user_id
        )

        results = []
        for conv in conversations:
            response = await self._build_conversation_response(conv)
            results.append(response)
        return results

    async def get_conversation_messages(
        self,
        *,
        conversation_id: int,
        user_id: int,
        before_id: int | None = None,
        limit: int = 50,
    ) -> ConversationDetailSchema:
        """Get conversation detail with paginated messages."""
        conversation = await self._conversation_crud.get_by_id(
            self.db, conversation_id=conversation_id
        )
        if not conversation:
            raise not_found_error("Conversation not found")

        if not await self._conversation_crud.is_participant(
            self.db, conversation_id=conversation_id, user_id=user_id
        ):
            raise forbidden_error("You are not a participant in this conversation")

        messages = await self._message_crud.get_messages(
            self.db,
            conversation_id=conversation_id,
            before_id=before_id,
            limit=limit,
        )
        total = await self._message_crud.count_messages(
            self.db, conversation_id=conversation_id
        )

        post = await self._post_crud.get_by_id(self.db, id=conversation.post_id)
        initiator = await self._get_user(conversation.initiator_id)
        recipient = await self._get_user(conversation.recipient_id)

        return ConversationDetailSchema(
            id=conversation.id,
            initiator=ConversationParticipantSchema(
                id=initiator.id, username=initiator.username
            ),
            recipient=ConversationParticipantSchema(
                id=recipient.id, username=recipient.username
            ),
            post=ConversationPostSchema(
                id=post.id if post else 0,
                title=post.title if post else "Deleted post",
                image_url=post.image_url if post else None,
            ),
            messages=[
                MessageResponseSchema.model_validate(m) for m in messages
            ],
            total_messages=total,
        )

    async def send_message(
        self, *, conversation_id: int, sender_id: int, content: str
    ) -> MessageResponseSchema:
        """Send a message in a conversation."""
        if not await self._conversation_crud.is_participant(
            self.db, conversation_id=conversation_id, user_id=sender_id
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

        return MessageResponseSchema.model_validate(message)

    async def _get_user(self, user_id: int) -> User:
        """Get user by ID using raw query."""
        from sqlalchemy import select

        result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            raise not_found_error("User not found")
        return user

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
            post=ConversationPostSchema(
                id=post.id if post else 0,
                title=post.title if post else "Deleted post",
                image_url=post.image_url if post else None,
            ),
            last_message=MessageResponseSchema.model_validate(last_message)
            if last_message
            else None,
            created_date=conversation.created_date,
        )


def _get_message_service(
    conversation_crud: Annotated[ConversationCRUD, Depends(get_conversation_crud)],
    message_crud: Annotated[MessageCRUD, Depends(get_message_crud)],
    post_crud: Annotated[PostCRUD, Depends(get_post_crud)],
    db: AsyncSession = Depends(get_async_db),
) -> MessageService:
    """Factory function to create MessageService instance."""
    return MessageService(db, conversation_crud, message_crud, post_crud)


AnnotatedMessageService = Annotated[MessageService, Depends(_get_message_service)]
