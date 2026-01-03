/**
 * Contact email constants used across the application
 * These are interpolated into translation strings via i18next
 */

export const CONTACT_EMAILS = {
  privacyEmail: import.meta.env.VITE_PRIVACY_EMAIL || "privacy@marketarchives.com",
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL || "support@marketarchives.com",
};
