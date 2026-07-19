"""Scanner smoke test: intent-only platform mentions must flag, common words must not."""

import pytest

from app.services.message_scanner import scan_message

# Bare platform / competitor mentions with no trailing handle — the reported gap.
FLAGGED = [
    "message on shopee",
    "message me on ig",
    "instagram",
    "ig",
    "my ig",
    "add me on ig",
    "buy on lazada",
    "ＩＧ",                    # full-width evasion, folded by NFKC
    "0 8 1-2 3 4 5 6 7 8",   # spaced phone number
    "venmo me",
    "โอนตรงถูกกว่า",           # Thai: transfer directly, cheaper
    "เลขบัญชี 123",            # Thai: bank account number
]

# Ordinary chat, including fashion words that embed a keyword substring — clean.
CLEAN = [
    "yo", "hello", "big jacket", "how much is this", "sign here",
    "i dig this style", "i love the neckline", "drop me a line",
    "leather wallet",
]


@pytest.mark.parametrize("text", FLAGGED)
def test_flags_bare_platform_mentions(text: str) -> None:
    assert scan_message(text), f"expected a flag for: {text!r}"


@pytest.mark.parametrize("text", CLEAN)
def test_ignores_ordinary_chat(text: str) -> None:
    assert scan_message(text) == [], f"unexpected flag for: {text!r}"
