"""The taxonomy vocabularies must stay in sync.

These invariants used to be import-time asserts in the constants modules; they live
here instead so the constants stay pure data.
"""

from app.constants.post import Subcategory
from app.constants.taxonomy import (
    CATEGORY_TREE,
    SUBCATEGORY_LABELS,
    SUBCATEGORY_SIZE_GROUP,
)


def test_every_subcategory_appears_in_the_tree():
    leaves = {
        leaf
        for tree in CATEGORY_TREE.values()
        for leaves in tree.values()
        for leaf in leaves
    }
    assert leaves == set(Subcategory)


def test_every_subcategory_has_a_label():
    assert set(SUBCATEGORY_LABELS) == set(Subcategory)


def test_size_group_overrides_are_known_codes():
    assert set(SUBCATEGORY_SIZE_GROUP) <= set(Subcategory)
