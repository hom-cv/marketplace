"""Email service for sending emails via SendGrid."""

import logging

from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail

from app.core.jwt import create_email_verification_token
from app.core.settings import Settings, get_settings
from app.templates.email_verification import get_verification_email_html

logger = logging.getLogger(__name__)
settings: Settings = get_settings()


class EmailService:
    """Service class for sending emails via SendGrid."""

    def __init__(self):
        """Initialize the EmailService with SendGrid client."""
        self.client = SendGridAPIClient(settings.SENDGRID_API_KEY)
        self.from_email = settings.SENDGRID_FROM_EMAIL

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
    ) -> bool:
        """
        Send an email using SendGrid.

        Args:
            to_email (str): The recipient's email address.
            subject (str): The email subject.
            html_content (str): The HTML content of the email.

        Returns:
            bool: True if the email was sent successfully, False otherwise.
        """
        message = Mail(
            from_email=self.from_email,
            to_emails=to_email,
            subject=subject,
            html_content=html_content,
        )
        try:
            response = self.client.send(message)
            return response.status_code in (200, 201, 202)
        except Exception as e:
            logger.error("Failed to send email to %s: %s", to_email, e)
            return False

    def send_verification_email(self, user_id: int, email: str, first_name: str) -> bool:
        """
        Send a verification email to the user.

        Args:
            user_id (int): The user's ID.
            email (str): The user's email address.
            first_name (str): The user's first name.

        Returns:
            bool: True if the email was sent successfully, False otherwise.
        """
        token = create_email_verification_token(user_id)
        verification_url = f"{settings.API_BASE_URL}/verify-email?token={token}"

        html_content = get_verification_email_html(
            first_name=first_name,
            verification_url=verification_url,
        )

        return self.send_email(
            to_email=email,
            subject="Verify your email address - marketplace",
            html_content=html_content,
        )


email_service = EmailService()

