"""Tests for GET /api/v1/categories (the taxonomy)."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_get_categories_returns_wellformed_tree(async_client: AsyncClient):
    """The taxonomy payload has the expected shape and gender-scoped trees."""
    response = await async_client.get("/api/v1/categories")

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {
        "genders",
        "categoryLabels",
        "categoryDefaultSizeGroups",
        "subcategorySizeGroups",
    }

    genders = body["genders"]
    assert set(genders) == {"MENS", "WOMENS", "UNISEX"}
    # gender-scoped: DRESSES is women-only, TAILORING is men-only, UNISEX has both.
    assert "DRESSES" not in genders["MENS"]
    assert "TAILORING" not in genders["WOMENS"]
    assert "DRESSES" in genders["UNISEX"] and "TAILORING" in genders["UNISEX"]
    assert "Polos" in genders["MENS"]["TOPS"]
    # size groups: a heterogeneous override is exposed.
    assert body["subcategorySizeGroups"]["Formal Trousers"] == "WAIST"
    assert body["categoryDefaultSizeGroups"]["FOOTWEAR"] == "SHOE"
