from pydantic import BaseModel


class AccessTokenSchema(BaseModel):
    user_id: int | None = None
