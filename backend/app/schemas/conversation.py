"""Schemas for conversations and messages."""

from datetime import datetime

from pydantic import BaseModel, Field

from app.constants.message import MAX_MESSAGE_LENGTH


class ConversationCreateSchema(BaseModel):
    post_id: int


class MessageCreateSchema(BaseModel):
    content: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)


class MessageResponseSchema(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: str
    created_date: datetime

    model_config = {"from_attributes": True}


class ConversationParticipantSchema(BaseModel):
    id: int
    username: str
    is_banned: bool = False

    model_config = {"from_attributes": True}


class ConversationPostSchema(BaseModel):
    id: int
    title: str
    image_url: str | None = None

    model_config = {"from_attributes": True}


class ConversationResponseSchema(BaseModel):
    id: int
    initiator: ConversationParticipantSchema
    recipient: ConversationParticipantSchema
    post: ConversationPostSchema
    last_message: MessageResponseSchema | None = None
    created_date: datetime

    model_config = {"from_attributes": True}


class ConversationDetailSchema(BaseModel):
    id: int
    initiator: ConversationParticipantSchema
    recipient: ConversationParticipantSchema
    post: ConversationPostSchema
    messages: list[MessageResponseSchema]
    total_messages: int

    model_config = {"from_attributes": True}


class WebSocketMessageSchema(BaseModel):
    type: str
    conversation_id: int | None = None
    content: str | None = None
    message: MessageResponseSchema | None = None
    error: str | None = None
