"""Regex scanner for detecting off-site transaction patterns in messages."""

import re

OFFSITE_PATTERNS: list[tuple[str, re.Pattern]] = [
    # Thai mobile: 06x/08x/09x, with optional separators
    ("phone_number", re.compile(
        r"(?:0[689]\d[\s\-.]?\d{3}[\s\-.]?\d{4}|(?:\+66)[\s\-.]?[689]\d[\s\-.]?\d{3}[\s\-.]?\d{4})",
        re.IGNORECASE,
    )),
    # Thai bank account format: xxx-x-xxxxx-x
    ("bank_account", re.compile(r"\b\d{3}[\s\-]?\d{1}[\s\-]?\d{5}[\s\-]?\d{1}\b")),
    # Line ID (English)
    ("line_id", re.compile(r"(?:line\s{0,5}(?:id|ไอดี)\s{0,5}[:=]?\s{0,5}\S{1,50})", re.IGNORECASE)),
    # Line ID (Thai)
    ("line_id_thai", re.compile(r"(?:ไลน์\s{0,5}(?:ไอดี)?\s{0,5}[:=]?\s{0,5}\S{1,50})")),
    # Add on Line
    ("add_line", re.compile(r"(?:(?:add|แอด)\s*(?:line|ไลน์))", re.IGNORECASE)),
    # Direct transfer (Thai)
    ("direct_transfer_th", re.compile(r"(?:โอน\s*(?:ตรง|เงิน|ให้|มา|ผ่าน))")),
    # Bank account (Thai keywords)
    ("bank_account_th", re.compile(r"(?:เลข\s*บัญชี|เลขที่\s*บัญชี|บัญชี\s*ธนาคาร)")),
    # PromptPay
    ("promptpay_offsite", re.compile(r"(?:พร้อม\s*เพย์|prompt\s*pay)", re.IGNORECASE)),
    # Direct transfer (English)
    ("direct_transfer_en", re.compile(
        r"(?:pay\s*(?:me\s+)?(?:directly|outside)|direct\s+(?:transfer|payment|deposit))",
        re.IGNORECASE,
    )),
    # Bank transfer (English)
    ("bank_transfer_en", re.compile(
        r"(?:bank\s+(?:transfer|account|details)|wire\s+(?:transfer|money))",
        re.IGNORECASE,
    )),
    # External payment platforms
    ("external_payment", re.compile(
        r"(?:venmo|paypal|cashapp|cash\s*app|zelle|wise\.com|truemoney|ทรู\s*มันนี่)",
        re.IGNORECASE,
    )),
    # Social media contact sharing
    ("social_contact", re.compile(
        r"(?:(?:ig|instagram|facebook|fb|whatsapp|telegram|wechat|tiktok)\s{0,5}[:=@]\s{0,5}\S{1,50})",
        re.IGNORECASE,
    )),
    # Email sharing
    ("email_sharing", re.compile(
        r"(?:(?:email|อีเมล)\s{0,5}(?:me|ฉัน|มา)?\s{0,5}[:=]?\s{0,5}\S{1,50}@\S{1,50}\.\S{1,30})",
        re.IGNORECASE,
    )),
]


def scan_message(content: str) -> list[str]:
    """Scan message content. Returns list of matched pattern names (empty = clean)."""
    return [name for name, pattern in OFFSITE_PATTERNS if pattern.search(content)]
