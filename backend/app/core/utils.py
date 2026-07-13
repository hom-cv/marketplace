import re
from enum import Enum


def slugify(value: str) -> str:
    """Lowercase, trim, collapse non-alphanumeric runs to single hyphens.

    Used as the canonical key for brands so "Nike", "nike " and "NIKE" map to
    the same slug ("nike").
    """
    return re.sub(r"[^a-z0-9]+", "-", value.strip().lower()).strip("-")


def normalize_tag(value: str) -> str:
    """Normalize a hashtag: drop a leading '#', trim, lowercase."""
    return value.strip().lstrip("#").strip().lower()


class AutoName(Enum):
    """
    An Enum subclass that automatically assigns enum member names as their values.

    This class overrides the `_generate_next_value_` method to return the name of the enum member as its value.
    It simplifies enum creation by eliminating the need to manually specify the value for each member.

    Example:
        class Color(AutoName):
            RED = auto()
            GREEN = auto()
            BLUE = auto()

        # Color.RED.value will be "RED"
    """

    @staticmethod
    def _generate_next_value_(
        name: str, start: int, count: int, last_values: list
    ) -> str:
        """
        Generates the value for the next enum member.

        Args:
            name (str): The name of the enum member.
            start (int): The initial value (ignored in this implementation).
            count (int): The number of existing members (ignored in this implementation).
            last_values (list): The previously assigned values (ignored in this implementation).

        Returns:
            str: The name of the enum member, used as its value.
        """
        return name
