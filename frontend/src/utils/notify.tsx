/**
 * Toast helpers for consistent success/error notifications.
 *
 * Thin wrappers over Mantine's `notifications.show` (default styling, green
 * for success / red for failure). Prefer these over calling
 * `notifications.show` directly for request outcomes.
 */

import { notifications } from "@mantine/notifications";

export function notifySuccess(message: string, title = "Success!"): void {
  notifications.show({ title, message, color: "green" });
}

export function notifyError(message: string, title = "Error!"): void {
  notifications.show({ title, message, color: "red" });
}
