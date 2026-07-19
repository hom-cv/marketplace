"""Scanner for off-site transaction / off-platform contact attempts in messages.

Design: normalize once to defeat common evasion (full-width, zero-width, case,
spacing), then match against flat wordlists. Regex is kept only for genuinely
structured entities (phone, bank account, email, spelled-out numbers). Adding a
new term is a one-line list edit, not a new pattern.

Recall is favored over precision on purpose: flagging is silent and every hit is
reviewed by an admin who can dismiss, so a missed off-site attempt costs the
platform more than a false positive costs the admin.
"""

import re
import unicodedata

# Zero-width / joiner chars used to break up words (e.g. "i​g").
_ZERO_WIDTH = dict.fromkeys(
    map(ord, "​‌‍⁠﻿"), None
)


def _normalize(text: str) -> str:
    """Fold evasion tricks into a canonical form before matching.

    NFKC collapses full-width and many homoglyph forms (ｉｇ -> ig); we then
    drop zero-width chars, lowercase, and collapse whitespace runs to a single
    space so token boundaries are predictable.
    """
    text = unicodedata.normalize("NFKC", text)
    text = text.translate(_ZERO_WIDTH)
    text = text.lower()
    text = re.sub(r"\s+", " ", text)
    return text.strip()


_STRUCTURED: list[tuple[str, re.Pattern]] = [
    # Thai mobile: standard + heavily spaced evasion ("0 8 1-2 3 4 ...").
    ("phone_number", re.compile(
        r"(?:0|\+66)[\s\-.()]{0,3}[689](?:[\s\-.()]{0,3}\d){8}"
    )),
    # Thai bank account: flexible spacing / dashes.
    ("bank_account", re.compile(
        r"\b\d{3}[\s\-]{0,2}\d{1}[\s\-]{0,2}\d{5}[\s\-]{0,2}\d{1}\b"
    )),
    # Email, including "name (at) domain (dot) com" style obfuscation.
    ("email_sharing", re.compile(
        r"(?:[a-z0-9._%+-]+|\S{1,30})\s*(?:@|\[at\]|\(at\)| at )\s*"
        r"[a-z0-9.-]+\s*(?:\.|\[dot\]|\(dot\)| dot )\s*[a-z]{2,7}\b"
    )),
    # Spelled-out Thai digits — a long run is a phone/account number in disguise.
    ("spelled_numbers_th", re.compile(
        r"(?:ศูนย์|หนึ่ง|เอ็ด|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)"
        r"(?:[\s\-.]{0,3}(?:ศูนย์|หนึ่ง|เอ็ด|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)){7,9}"
    )),
]


_WORD_GROUPS: dict[str, list[str]] = {
    # Any social app / competing marketplace named in a DM is suspicious.
    "platform_mention": [
        "instagram", "insta", "ig", "facebook", "fb", "messenger",
        "whatsapp", "telegram", "wechat", "kakao", "snapchat", "tiktok",
        "shopee", "lazada", "carousell", "grailed", "depop",
    ],
    "external_payment": [
        "venmo", "paypal", "cashapp", "cash app", "zelle",
        "truemoney", "promptpay", "prompt pay", "ppay",
    ],
    "payment_intent": [
        "direct transfer", "direct payment", "direct deposit",
        "bank transfer", "bank account", "bank details",
        "wire transfer", "wire money",
        "pay directly", "pay me directly", "pay outside",
        "pay offsite", "pay off site",
    ],
    "fee_avoidance": [
        "no fee", "no fees", "no platform fee",
        "avoid fee", "avoid fees", "cheaper outside", "cheaper direct",
    ],
    # Intent to move the conversation/sale off-platform.
    "offsite_redirect": [
        "add me on", "message me on", "msg me on", "dm me",
        "hit me up", "link in bio", "in bio",
        "my line", "line id", "follow my",
    ],
    "contact_intent": ["call me", "meet up", "in person"],
    "qr_payment": ["qr", "qr code", "barcode"],
}

# Thai terms are matched as substrings — Thai is written without spaces, so word
# boundaries are unreliable; these sequences are distinctive enough to be safe.
_SUBSTRING_GROUPS: dict[str, list[str]] = {
    "platform_mention": ["ไลน์", "ไอจี", "เฟส", "เทเลแกรม", "วีแชท"],
    "external_payment": ["พร้อมเพย์", "ทรูมันนี่"],
    "payment_intent": [
        "โอนตรง", "โอนนอกระบบ", "จ่ายตรง", "จ่ายนอก",
        "เลขบัญชี", "เลขที่บัญชี", "บัญชีธนาคาร", "จ่ายสด",
    ],
    "fee_avoidance": ["โอนตรงถูกกว่า", "ไม่หัก"],
    "offsite_redirect": ["ทัก", "แอด", "หน้าเพจ", "โปรไฟล์"],
    "contact_intent": ["โทรหา", "โทรมา", "นัดรับ", "เจอตัว"],
    "qr_payment": ["คิวอาร์", "บาร์โค้ด", "สแกน"],
    # URL fragments (matched literally after normalization).
    "social_url": [
        "line.me/", "line.ee/", "instagram.com/", "ig.me/",
        "facebook.com/", "fb.me/", "wa.me/", "t.me/", "tiktok.com/",
        "wise.com",
    ],
}


def _compile_words(terms: list[str]) -> re.Pattern:
    """Whole-word alternation from a wordlist (text is pre-lowercased)."""
    return re.compile(r"\b(?:" + "|".join(re.escape(t) for t in terms) + r")\b")


_WORD_MATCHERS: list[tuple[str, re.Pattern]] = [
    (name, _compile_words(terms)) for name, terms in _WORD_GROUPS.items()
]


def scan_message(content: str) -> list[str]:
    """Scan message content. Returns matched category names (empty = clean)."""
    text = _normalize(content)
    matched: list[str] = []

    for name, pattern in _STRUCTURED:
        if pattern.search(text):
            matched.append(name)
    for name, pattern in _WORD_MATCHERS:
        if pattern.search(text):
            matched.append(name)
    for name, terms in _SUBSTRING_GROUPS.items():
        if name not in matched and any(t in text for t in terms):
            matched.append(name)

    return matched
