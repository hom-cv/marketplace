"""Measurement values must be numeric — extra keys are allowed, arbitrary JSON isn't.

The dict is stored raw in a JSONB column and the typed models ignore extra keys, so
without this guard a caller could persist nested objects / strings / bools.
"""

import pytest

from app.constants.post import PostCategory, Subcategory
from app.schemas.post import validate_measurements_for_category

_TOPS = (PostCategory.TOPS, Subcategory.POLOS)  # -> LETTER size group


def test_rejects_nested_object_value():
    with pytest.raises(ValueError, match="must be a number"):
        validate_measurements_for_category(
            *_TOPS, {"shoulder": 40, "evil": {"nested": "obj"}}
        )


def test_rejects_string_value():
    with pytest.raises(ValueError, match="must be a number"):
        validate_measurements_for_category(*_TOPS, {"chest": "huge"})


def test_rejects_bool_value():
    with pytest.raises(ValueError, match="must be a number"):
        validate_measurements_for_category(*_TOPS, {"chest": True})


def test_allows_numeric_extra_fields():
    # Custom keys beyond the standard model are fine when the value is a number.
    validate_measurements_for_category(*_TOPS, {"shoulder": 40, "collar": 15.5})
    validate_measurements_for_category(*_TOPS, {"waist": 32, "note_length": None})
