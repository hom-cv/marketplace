"""Group-aware size filter builds the right SQL.

The suite mocks the DB (and the models use Postgres-only types), so these assert on
the compiled statement instead of query results — enough to pin the scoped/unscoped
OR structure, the token parsing, and the size-group CASE ordering that a refactor
could otherwise flip silently.
"""

from sqlalchemy import select

from app.crud.post import PostCRUD
from app.models.post import Post

crud = PostCRUD(Post)


def _sql(stmt) -> str:
    return str(stmt.compile(compile_kwargs={"literal_binds": True}))


def test_scoped_filter_lets_other_size_groups_through():
    # A shoe-39 filter must NOT exclude waist posts: posts whose group isn't the
    # selected one pass through; only same-group posts are constrained by size.
    sql = _sql(crud._apply_size_filter(select(Post.id), ["WAIST-32"], scoped=True))
    assert "NOT IN ('WAIST')" in sql
    assert "posts.size IN ('32')" in sql


def test_unscoped_filter_restricts_to_the_selected_group():
    sql = _sql(crud._apply_size_filter(select(Post.id), ["WAIST-32"], scoped=False))
    assert "NOT IN" not in sql  # no passthrough when browsing by bare size
    assert "posts.size IN ('32')" in sql


def test_tokens_are_parsed_per_group():
    sql = _sql(
        crud._apply_size_filter(select(Post.id), ["WAIST-32", "SHOE-39"], scoped=True)
    )
    assert "posts.size IN ('32')" in sql
    assert "posts.size IN ('39')" in sql
    assert "NOT IN ('WAIST', 'SHOE')" in sql


def test_size_token_without_a_group_is_ignored():
    base = _sql(select(Post.id))
    assert _sql(crud._apply_size_filter(select(Post.id), ["39"], scoped=True)) == base


def test_size_group_case_checks_subcategory_before_category():
    # Subcategory overrides must win over the category default (first match wins).
    sql = _sql(select(crud._size_group_case()))
    assert sql.index("posts.subcategory") < sql.index("posts.category")
