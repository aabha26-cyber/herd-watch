/**
 * Peacekeeper Notification System
 * ================================
 * Simulates sending alerts to peacekeeping field offices.
 * In production this would integrate with:
 *   - UNMISS communication systems
 *   - SMS gateways (Twilio / Africa's Talking)
 *   - Email / webhook notifications
 *   - Field tablet push notifications
 *
 * For the simulator, we track notifications in-memory
 * and show them in the UI.
 */

import type { Alert, SuggestedAction } from "./risk";

// ── Types ─────────────────────────────────────────────────

export type NotificationChannel = "sms" | "email" | "radio" | "app" | "webhook";

export type NotificationPriority = "routine" | "urgent" | "critical";

export type PeacekeeperNotification = {
  id: string;
  timestamp: string;
  /** Alert that triggered this notification */
  alertId: string;
  /** Target recipient */
  recipient: {
    id: string;
    name: string;
    role: string;
    station: string;
  };
  /** Communication channel */
  channel: NotificationChannel;
  priority: NotificationPriority;
  /** Message content */
  subject: string;
  body: string;
  /** Suggested actions included */
  actions: SuggestedAction[];
  /** Delivery status */
  status: "queued" | "sent" | "delivered" | "failed";
};

export type NotificationLog = {
  notifications: PeacekeeperNotification[];
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
};

// ── Recipients (from PEACEKEEPING_SITES + simulated staff) ──

export type Recipient = {
  id: string;
  name: string;
  role: string;
  station: string;
  channels: NotificationChannel[];
};

export const RECIPIENTS: Recipient[] = [
  { id: "r1", name: "Cdr. Amara", role: "Field Commander", station: "Bor Field Office", channels: ["radio", "app"] },
  { id: "r2", name: "Lt. Okello", role: "Patrol Leader", station: "Juba HQ", channels: ["sms", "email", "app"] },
  { id: "r3", name: "Sgt. Deng", role: "Outpost Lead", station: "Malakal Outpost", channels: ["radio", "sms"] },
  { id: "r4", name: "Cpl. Nyuol", role: "Patrol Officer", station: "Wau Patrol", channels: ["radio", "app"] },
  { id: "r5", name: "Dr. Achol", role: "Humanitarian Coord.", station: "Rumbek", channels: ["email", "app"] },
  { id: "r6", name: "Off. Lam", role: "Community Liaison", station: "Yambio", channels: ["sms", "radio"] },
  { id: "r7", name: "Lt. Kur", role: "Patrol Officer", station: "Torit", channels: ["radio", "app"] },
  { id: "r8", name: "Sgt. Atem", role: "Border Patrol", station: "Kapoeta", channels: ["radio", "sms"] },
];

// ── In-memory log ───────────────────────────────────────

let uid = 0;
const nextId = () => `notif-${++uid}-${Date.now().toString(36)}`;

const log: PeacekeeperNotification[] = [];

// ── Public API ──────────────────────────────────────────

/**
 * Create a notification for a specific alert and recipient.
 * Returns the notification object (status = "sent" for simulator).
 */
export function sendNotification(
  alert: Alert,
  recipient: Recipient,
  channel?: NotificationChannel
): PeacekeeperNotification {
  const ch = channel ?? recipient.channels[0] ?? "app";

  const priority: NotificationPriority =
    alert.riskLevel === "high" ? "critical" :
    alert.riskLevel === "medium" ? "urgent" : "routine";

  const subject = `[${priority.toUpperCase()}] Cattle conflict risk — ${alert.location}`;

  const actionLines = alert.suggestedActions
    .map((a) => `• ${a.description}`)
    .join("\n");

  const body = [
    `ALERT: ${alert.reason}`,
    ``,
    `Risk Level: ${alert.riskLevel.toUpperCase()}`,
    `Time: ${alert.daysAway} day${alert.daysAway > 1 ? "s" : ""} from now`,
    `Location: ${alert.location}`,
    ``,
    `SUGGESTED ACTIONS:`,
    actionLines,
    ``,
    `Coordinate with community leaders before taking action.`,
    `This is AI-generated guidance, not an order.`,
  ].join("\n");

  const notif: PeacekeeperNotification = {
    id: nextId(),
    timestamp: new Date().toISOString(),
    alertId: alert.id,
    recipient: {
      id: recipient.id,
      name: recipient.name,
      role: recipient.role,
      station: recipient.station,
    },
    channel: ch,
    priority,
    subject,
    body,
    actions: alert.suggestedActions,
    status: "sent", // Simulated
  };

  log.push(notif);
  return notif;
}

/**
 * Auto-notify: send alerts to the nearest / most relevant peacekeepers.
 */
export function autoNotify(alerts: Alert[]): PeacekeeperNotification[] {
  const sent: PeacekeeperNotification[] = [];

  for (const alert of alerts) {
    if (alert.riskLevel === "low") continue; // Only notify for medium/high

    // Pick 1-2 recipients based on station proximity (simplified)
    const recipients = RECIPIENTS.slice(0, alert.riskLevel === "high" ? 3 : 2);
    for (const r of recipients) {
      sent.push(sendNotification(alert, r));
    }
  }

  return sent;
}

/**
 * Get the full notification log.
 */
export function getNotificationLog(): NotificationLog {
  return {
    notifications: [...log],
    totalSent: log.filter((n) => n.status === "sent" || n.status === "delivered").length,
    totalDelivered: log.filter((n) => n.status === "delivered").length,
    totalFailed: log.filter((n) => n.status === "failed").length,
  };
}

/**
 * Clear the log (for resetting the simulator).
 */
export function clearNotifications(): void {
  log.length = 0;
}

/**
 * Format a notification for display in the UI.
 */
export function formatNotificationSummary(n: PeacekeeperNotification): string {
  const icon =
    n.priority === "critical" ? "🔴" :
    n.priority === "urgent" ? "🟡" : "🟢";
  return `${icon} ${n.recipient.name} (${n.recipient.station}) via ${n.channel} — ${n.subject}`;
}
