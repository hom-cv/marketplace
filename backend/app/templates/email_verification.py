"""Email verification template."""


def get_verification_email_html(first_name: str, verification_url: str) -> str:
    """
    Generate HTML content for the email verification email.

    Args:
        first_name (str): The user's first name.
        verification_url (str): The URL for email verification.

    Returns:
        str: The HTML content for the email.
    """
    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
    <div style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
        <div style="background: #228be6; padding: 32px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">marketplace</h1>
        </div>
        <div style="padding: 32px;">
            <p style="font-size: 16px; margin: 0 0 16px 0;">Hi {first_name},</p>
            <p style="font-size: 16px; margin: 0 0 24px 0; color: #555;">
                Thank you for registering! Please verify your email address by clicking the button below:
            </p>
            <div style="text-align: center; margin: 32px 0;">
                <a href="{verification_url}" style="background: #228be6; color: white; padding: 12px 32px; text-decoration: none; border-radius: 4px; font-weight: 500; font-size: 14px; display: inline-block;">
                    Verify Email Address
                </a>
            </div>
            <p style="font-size: 14px; color: #666; margin: 0 0 8px 0;">
                If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="font-size: 12px; color: #888; word-break: break-all; margin: 0 0 24px 0;">
                {verification_url}
            </p>
            <p style="font-size: 14px; color: #666; margin: 0;">
                This link will expire in 24 hours.
            </p>
        </div>
        <div style="background: #f9f9f9; padding: 16px 32px; border-top: 1px solid #eee;">
            <p style="font-size: 12px; color: #888; text-align: center; margin: 0;">
                If you didn't create an account, you can safely ignore this email.
            </p>
        </div>
    </div>
</body>
</html>"""
