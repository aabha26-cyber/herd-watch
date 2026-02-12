"use client";

import { useState, useCallback } from "react";
import type { Alert } from "@/lib/risk";
import {
  sendNotification,
  autoNotify,
  getNotificationLog,
  RECIPIENTS,
  type PeacekeeperNotification,
  type Recipient,
} from "@/lib/notifications";

type NotifyPanelProps = {
  alerts: Alert[];
};

export default function NotifyPanel({ alerts }: NotifyPanelProps) {
  const [notifications, setNotifications] = useState<PeacekeeperNotification[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState<string>("");
  const [manualAlert, setManualAlert] = useState<string>("");

  const handleAutoNotify = useCallback(() => {
    const sent = autoNotify(alerts);
    setNotifications((prev) => [...prev, ...sent]);
  }, [alerts]);

  const handleManualSend = useCallback(() => {
    if (!selectedRecipient || !manualAlert) return;
    const recipient = RECIPIENTS.find((r) => r.id === selectedRecipient);
    const alert = alerts.find((a) => a.id === manualAlert);
    if (!recipient || !alert) return;

    const notif = sendNotification(alert, recipient);
    setNotifications((prev) => [...prev, notif]);
    setManualAlert("");
  }, [selectedRecipient, manualAlert, alerts]);

  const highAlerts = alerts.filter((a) => a.riskLevel === "high" || a.riskLevel === "medium");

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
        Notify Peacekeepers
      </h3>

      {/* Auto-notify button */}
      <button
        type="button"
        onClick={handleAutoNotify}
        disabled={highAlerts.length === 0}
        className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500"
      >
        Auto-notify all stations ({highAlerts.length} alert{highAlerts.length !== 1 ? "s" : ""})
      </button>

      {/* Manual send */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-wider text-gray-500">Manual notification</p>
        <select
          value={selectedRecipient}
          onChange={(e) => setSelectedRecipient(e.target.value)}
          className="w-full rounded border border-white/10 bg-surface-800 px-2 py-1.5 text-xs text-gray-300"
        >
          <option value="">Select recipient...</option>
          {RECIPIENTS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} — {r.station}
            </option>
          ))}
        </select>
        <select
          value={manualAlert}
          onChange={(e) => setManualAlert(e.target.value)}
          className="w-full rounded border border-white/10 bg-surface-800 px-2 py-1.5 text-xs text-gray-300"
        >
          <option value="">Select alert...</option>
          {alerts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.riskLevel.toUpperCase()} — {a.location} ({a.daysAway}d)
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleManualSend}
          disabled={!selectedRecipient || !manualAlert}
          className="w-full rounded bg-surface-700 px-3 py-1.5 text-xs text-gray-300 transition hover:bg-surface-600 disabled:opacity-40"
        >
          Send notification
        </button>
      </div>

      {/* Notification log */}
      {notifications.length > 0 && (
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setShowLog(!showLog)}
            className="text-[10px] uppercase tracking-wider text-blue-400 hover:text-blue-300"
          >
            {showLog ? "Hide" : "Show"} log ({notifications.length})
          </button>

          {showLog && (
            <ul className="max-h-36 space-y-1 overflow-y-auto">
              {notifications
                .slice()
                .reverse()
                .map((n) => (
                  <li
                    key={n.id}
                    className="rounded border border-white/5 bg-surface-800 px-2 py-1 text-[10px] text-gray-400"
                  >
                    <span
                      className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${
                        n.priority === "critical"
                          ? "bg-red-500"
                          : n.priority === "urgent"
                          ? "bg-amber-500"
                          : "bg-green-500"
                      }`}
                    />
                    <span className="text-gray-300">{n.recipient.name}</span> ({n.recipient.station})
                    via {n.channel} — {n.status}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
