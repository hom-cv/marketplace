"""Email verification template loader with XSS protection."""

from pathlib import Path

from jinja2 import Environment, FileSystemLoader

# Set up Jinja2 environment with autoescape enabled for XSS protection
_TEMPLATE_DIR = Path(__file__).parent
_jinja_env = Environment(
    loader=FileSystemLoader(_TEMPLATE_DIR),
    autoescape=True,
)


def get_verification_email_html(first_name: str, verification_url: str) -> str:
    """
    Generate HTML content for the email verification email.

    Args:
        first_name (str): The user's first name.
        verification_url (str): The URL for email verification.

    Returns:
        str: The HTML content for the email with escaped user inputs.
    """
    template = _jinja_env.get_template("email_verification.html")
    return template.render(
        first_name=first_name,
        verification_url=verification_url,
    )
