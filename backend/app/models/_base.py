import re
from datetime import datetime

import inflect
from sqlalchemy import TIMESTAMP, func
from sqlalchemy.ext.declarative import declarative_base, declared_attr
from sqlalchemy.orm import Mapped, mapped_column

_pluralizer = inflect.engine()


class CustomBase:
    """Base class for all database models with common fields and utilities."""

    created_date: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        nullable=False,
        index=True,
    )
    last_modified_date: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    @declared_attr  # type: ignore
    def __tablename__(cls) -> str:
        """Generate table name from class name using snake_case and pluralization."""
        uncamelized = re.sub(
            r"[A-Z]",
            lambda m: f"_{m.group(0).lower()}",
            cls.__name__,  # type: ignore
        )[1:]
        pluralized = _pluralizer.plural(uncamelized)  # type: ignore
        return pluralized

    def __repr__(self) -> str:
        """Generate a string representation of the model instance."""
        attrs = []
        for key, value in self.__dict__.items():
            if not key.startswith("_"):
                attrs.append(f"{key}={value}")
        return f"{self.__class__.__name__}({', '.join(attrs)})"


Base = declarative_base(cls=CustomBase)
