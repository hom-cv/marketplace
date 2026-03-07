"""Regex scanner for detecting off-site transaction patterns in messages."""
import re

OFFSITE_PATTERNS: list[tuple[str, re.Pattern]] = [
    # 1. Thai Mobile: Catches standard numbers and heavily spaced evasion (e.g., 0 8 1 - 2 3 4)
    ("phone_number", re.compile(
        r"(?:(?:0|\+66)[\s\-.()]{0,3}[689](?:[\s\-.()]{0,3}\d){8})",
        re.IGNORECASE,
    )),

    # 2. Thai Bank Account: Standard + flexible spacing/dashes
    ("bank_account", re.compile(
        r"\b\d{3}[\s\-]{0,2}\d{1}[\s\-]{0,2}\d{5}[\s\-]{0,2}\d{1}\b"
    )),

    # 3. Line URLs: Direct links (line.me, line.ee)
    ("line_url", re.compile(
        r"line\.(?:me|ee)/[a-zA-Z0-9/_-]+",
        re.IGNORECASE
    )),

    # 4. Line ID (Thai): "ไลน์" implies the app, uses 0-20 char proximity window
    ("line_id_th", re.compile(
        r"ไลน์(?:.{0,20}?)([a-zA-Z0-9._-]{3,20})"
    )),

    # 5. Line ID (English): Requires intent words to avoid regular English sentences
    ("line_id_en", re.compile(
        r"(?:line\s*id|my\s*line|add\s*(?:me\s*on\s*)?line)(?:.{0,20}?)([a-zA-Z0-9._-]{3,20})",
        re.IGNORECASE
    )),

    # 6. Social URLs: Direct links for other platforms (ig.me, fb.com, wa.me, t.me, etc.)
    ("social_url", re.compile(
        r"(?:instagram\.com|ig\.me|facebook\.com|fb\.com|fb\.me|wa\.me|t\.me|tiktok\.com)/[a-zA-Z0-9._-]+",
        re.IGNORECASE
    )),

    # 7. Social Contact (Thai): Thai phonetic spellings of apps + proximity window
    ("social_contact_th", re.compile(
        r"(?:ไอจี|เฟส|เทเลแกรม|วีแชท)(?:.{0,20}?)([a-zA-Z0-9._-]{3,50})"
    )),

    # 8. Social Contact (English Intent): Requires "my", "add", or "id" before the platform
    ("social_contact_en", re.compile(
        r"(?:my\s+|add\s+(?:me\s+)?(?:on\s+)?|id\s+)(?:ig|instagram|facebook|fb|whatsapp|telegram|wechat|tiktok)(?:.{0,20}?)([a-zA-Z0-9._-]{3,50})",
        re.IGNORECASE
    )),

    # 9. Social Contact (Loose/Anchored): Platform name + proximity window + an anchor like @, :, or 'is'
    ("social_contact_loose", re.compile(
        r"(?:ig|instagram|facebook|fb|whatsapp|telegram|wechat|tiktok)(?:.{0,20}?)(?:@|:|=|is|at|คือ|ติดต่อ)[:=\s]*([a-zA-Z0-9._-]{3,50})",
        re.IGNORECASE
    )),

    # 10. Add/Chat Intent: General intent to move off-site
    ("add_social", re.compile(
        r"(?:(?:add|แอด|ทัก)\s*(?:line|ไลน์|ig|เฟส|แชท|ส่วนตัว))",
        re.IGNORECASE
    )),

    # 11. Direct Transfer Intent (Thai)
    ("direct_transfer_th", re.compile(
        r"(?:โอน\s*(?:ตรง|เงิน|ให้|มา|นอก|ส่วนตัว)|จ่าย\s*(?:ตรง|นอก))"
    )),

    # 12. Bank Account Intent (Thai)
    ("bank_account_th", re.compile(
        r"(?:เลข\s*บัญชี|เลขที่\s*บัญชี|บัญชี\s*ธนาคาร|ขอ\s*เลข\s*บัญชี)"
    )),

    # 13. PromptPay Intent (Standard & Shorthand)
    ("promptpay_offsite", re.compile(
        r"(?:พร้อม\s*เพย์|prompt\s*pay|ppay\b)",
        re.IGNORECASE
    )),

    # 14. Direct Transfer Intent (English)
    ("direct_transfer_en", re.compile(
        r"(?:pay\s*(?:me\s+)?(?:directly|outside|off[-\s]site)|direct\s+(?:transfer|payment|deposit))",
        re.IGNORECASE,
    )),

    # 15. Bank Transfer Intent (English)
    ("bank_transfer_en", re.compile(
        r"(?:bank\s+(?:transfer|account|details)|wire\s+(?:transfer|money))",
        re.IGNORECASE,
    )),

    # 16. External Payment Platforms
    ("external_payment", re.compile(
        r"(?:venmo|paypal|cashapp|cash\s*app|zelle|wise\.com|truemoney|ทรู\s*มันนี่|วอลเล็ต|wallet)",
        re.IGNORECASE,
    )),

    # 17. Email Sharing (Standard + Obfuscation catching)
    ("email_sharing", re.compile(
        r"(?:[A-Za-z0-9._%+-]+|\S{1,30})\s*(?:@|\[at\]|\(at\)| at )\s*[A-Za-z0-9.-]+\s*(?:\.|\[dot\]|\(dot\)| dot )\s*[A-Z|a-z]{2,7}\b",
        re.IGNORECASE,
    )),

    # 18. Social Storefront Redirect (EN/TH): Catches intent to redirect to a social shop/page
    ("social_redirect", re.compile(
        r"(?:(?:shop|store|page|buy|visit|follow|ร้าน|เพจ|ซื้อ|ตาม)(?:.{0,20}?)(?:ig|instagram|facebook|fb|tiktok|line|ไลน์|ไอจี|เฟส))",
        re.IGNORECASE
    )),

    # 19. QR Code Scanning: Catches "สแกนคิวอาร์", "scan my qr", etc.
    ("qr_payment", re.compile(
        r"(?:scan|สแกน|ส่งรูป|ขอรูป|รูป|แสกน).{0,15}?(?:qr|คิวอาร์|barcode|บาร์โค้ด)",
        re.IGNORECASE
    )),

    # 20. Fee Avoidance / Discount for Direct Transfer
    ("fee_avoidance", re.compile(
        r"(?:cheaper\s*(?:outside|direct)|no\s*(?:platform\s*)?fee|avoid\s*fees?|โอนตรงถูกกว่า|ไม่หัก(?:ค่า|เปอร์เซ็น)|ถูกกว่า(?:ถ้า|โอน)|โอนนอกระบบ)",
        re.IGNORECASE
    )),

    # 21. "Link in Bio" / Profile Redirects
    ("profile_redirect", re.compile(
        r"(?:link|ลิ้งก์|ลิงก์|ลิงค์|ลิ้ง|contact|ติดต่อ|จิ้ม).{0,15}?(?:bio|profile|หน้าเพจ|หน้าโปรไฟล์|ไบโอ)",
        re.IGNORECASE
    )),

    # 22. Call / Phone Intent
    ("call_intent", re.compile(
        r"(?:call\s*me|โทร(?:หา|มา|เบอร์|เลย)|ติดต่อ(?:ได้ที่|เบอร์|มาที่|เรา))",
        re.IGNORECASE
    )),

    # 23. In-Person Meetups / Cash
    ("meet_in_person", re.compile(
        r"(?:meet\s*up|in\s*person|นัดรับ(?:ของ|สินค้า)?|จ่าย(?:เงิน)?สด|เจอตัว)",
        re.IGNORECASE
    )),

    # 24. Spelled-out Thai Numbers (The ultimate evasion tactic)
    ("spelled_numbers_th", re.compile(
        r"(?:ศูนย์|หนึ่ง|เอ็ด|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)(?:[\s\-.]{0,3}(?:ศูนย์|หนึ่ง|เอ็ด|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)){7,9}"
    ))
]

def scan_message(content: str) -> list[str]:
    """Scan message content. Returns list of matched pattern names (empty = clean)."""
    return [name for name, pattern in OFFSITE_PATTERNS if pattern.search(content)]
