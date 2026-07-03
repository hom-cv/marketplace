"""Unit tests for Post model properties.

is_reserved lives on the model (not in a service helper) so that every
``PostResponseSchema.model_validate(post)`` call site — including list
endpoints that bypass ListingService — populates the field automatically.
These tests pin both the property logic and that serialization pickup.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.models.post import Gender, Post, PostType
from app.models.user import User
from app.schemas.post import PostResponseSchema


def _make_post(*, reserved_until=None, reserved_by_payment_id=None) -> Post:
    post = Post(
        title="Test item",
        description="A test item",
        type=PostType.SHIRT,
        gender=Gender.UNISEX,
        price=Decimal("500.00"),
        shipping_cost=Decimal("0.00"),
        user_id=10,
    )
    post.id = 1
    post.reserved_until = reserved_until
    post.reserved_by_payment_id = reserved_by_payment_id
    return post


def _future():
    return datetime.now(timezone.utc) + timedelta(minutes=5)


def _past():
    return datetime.now(timezone.utc) - timedelta(minutes=5)


class TestIsReservedProperty:
    def test_unreserved_post(self):
        assert _make_post().is_reserved is False

    def test_active_reservation(self):
        post = _make_post(reserved_until=_future(), reserved_by_payment_id=7)
        assert post.is_reserved is True

    def test_expired_reservation(self):
        post = _make_post(reserved_until=_past(), reserved_by_payment_id=7)
        assert post.is_reserved is False

    def test_holder_cleared_but_expiry_set(self):
        # release_reservation clears both columns together, but be defensive.
        post = _make_post(reserved_until=_future(), reserved_by_payment_id=None)
        assert post.is_reserved is False

    def test_naive_reserved_until_does_not_raise(self):
        # A naive datetime (e.g. SQLite in tests, or a driver that drops
        # tzinfo) must be treated as UTC, not raise on comparison.
        naive_future = datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(
            minutes=5
        )
        naive_past = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(
            minutes=5
        )
        assert (
            _make_post(
                reserved_until=naive_future, reserved_by_payment_id=7
            ).is_reserved
            is True
        )
        assert (
            _make_post(
                reserved_until=naive_past, reserved_by_payment_id=7
            ).is_reserved
            is False
        )


class TestIsReservedSerialization:
    def _validate(self, post: Post) -> PostResponseSchema:
        # In-memory User satisfying UserResponseSchema's required fields;
        # mirrors the direct model_validate(post) done by list endpoints.
        post.user = User(
            username="seller",
            first_name="S",
            last_name="Eller",
            email_address="seller@example.com",
            email_verified=True,
            # Column defaults only apply at flush; set explicitly in memory.
            show_full_name=True,
        )
        post.user.id = 10
        return PostResponseSchema.model_validate(post)

    def test_model_validate_picks_up_active_reservation(self):
        post = _make_post(reserved_until=_future(), reserved_by_payment_id=7)
        assert self._validate(post).is_reserved is True

    def test_model_validate_picks_up_unreserved(self):
        post = _make_post()
        assert self._validate(post).is_reserved is False
