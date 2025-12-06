"""Email verification template loader with XSS protection."""

from pathlib import Path

from markupsafe import escape

# Load the HTML template at module level
_TEMPLATE_DIR = Path(__file__).parent
_EMAIL_VERIFICATION_TEMPLATE = (_TEMPLATE_DIR / "email_verification.html").read_text()


def get_verification_email_html(first_name: str, verification_url: str) -> str:
    """
    Generate HTML content for the email verification email.

    Args:
        first_name (str): The user's first name.
        verification_url (str): The URL for email verification.

    Returns:
        str: The HTML content for the email with escaped user inputs.
    """
    # Escape user-provided inputs to prevent XSS attacks
    safe_first_name = escape(first_name)
    safe_verification_url = escape(verification_url)

    return _EMAIL_VERIFICATION_TEMPLATE.replace(
        "{{ first_name }}", str(safe_first_name)
    ).replace(
        "{{ verification_url }}", str(safe_verification_url)
    )
