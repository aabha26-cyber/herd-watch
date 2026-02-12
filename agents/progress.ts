// ──────────────────────────────────────────────────────────────
// Progress Agent
// Tracks task completion, blockers, and overall project health.
// Generates snapshots and timeline reports.
// ──────────────────────────────────────────────────────────────

import type {
  AgentCall,
  ProgressEntry,
  ProgressSnapshot,
  MilestoneStatus,
} from "./types";
import { record } from "./log";
import { getPlan, updateStatus } from "./planning";

let uid = 0;
const nextId = (prefix: string) => `${prefix}-${++uid}-${Date.now().toString(36)}`;

// ── Progress journal ────────────────────────────────────────

const journal: ProgressEntry[] = [];

// ── Public API ──────────────────────────────────────────────

/** Log a progress entry and optionally update the planning agent's status. */
export function logProgress(
  milestoneId: string,
  action: ProgressEntry["action"],
  summary: string,
  details?: string,
  taskId?: string
): ProgressEntry {
  const entry: ProgressEntry = {
    id: nextId("prog"),
    timestamp: new Date().toISOString(),
    milestone: milestoneId,
    taskId,
    action,
    summary,
    details,
  };
  journal.push(entry);

  // Mirror status into the planning agent
  const statusMap: Record<string, MilestoneStatus> = {
    started: "in_progress",
    completed: "completed",
    blocked: "blocked",
  };
  if (statusMap[action]) {
    updateStatus(milestoneId, statusMap[action], taskId);
  }

  record(call("logProgress", { milestoneId, action, summary }, { entryId: entry.id }));
  return structuredClone(entry);
}

/** Get a point-in-time snapshot of overall project health. */
export function getSnapshot(): ProgressSnapshot {
  const plan = getPlan();
  const allTasks = plan.milestones.flatMap((m) => m.tasks);
  const completedMs = plan.milestones.filter((m) => m.status === "completed").length;
  const completedTasks = allTasks.filter((t) => t.status === "completed").length;
  const blockedTasks = allTasks.filter((t) => t.status === "blocked").length;
  const total = allTasks.length || 1;

  const snap: ProgressSnapshot = {
    asOf: new Date().toISOString(),
    totalMilestones: plan.milestones.length,
    completedMilestones: completedMs,
    totalTasks: allTasks.length,
    completedTasks,
    blockedTasks,
    percentComplete: Math.round((completedTasks / total) * 100),
    recentEntries: journal.slice(-10),
  };

  record(call("getSnapshot", {}, { percentComplete: snap.percentComplete }));
  return snap;
}

/** Return the full progress journal. */
export function getJournal(): ProgressEntry[] {
  return structuredClone(journal);
}

/** Serialise the progress timeline to Markdown (for AGENT_LOG.md). */
export function progressToMarkdown(): string {
  const snap = getSnapshot();
  const lines: string[] = [
    "# Progress Report",
    "",
    `**As of:** ${snap.asOf}`,
    "",
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Milestones | ${snap.completedMilestones} / ${snap.totalMilestones} |`,
    `| Tasks | ${snap.completedTasks} / ${snap.totalTasks} |`,
    `| Blocked | ${snap.blockedTasks} |`,
    `| **Completion** | **${snap.percentComplete}%** |`,
    "",
    "## Recent Activity",
    "",
  ];

  for (const e of snap.recentEntries) {
    const icon =
      e.action === "completed"
        ? "✅"
        : e.action === "blocked"
        ? "🚫"
        : e.action === "started"
        ? "▶️"
        : "📝";
    lines.push(`- ${icon} \`${e.timestamp.slice(0, 16)}\` **${e.summary}**`);
    if (e.details) lines.push(`  ${e.details}`);
  }

  return lines.join("\n");
}

// ── Internals ───────────────────────────────────────────────

function call(
  action: string,
  input: Record<string, unknown>,
  output: Record<string, unknown>
): AgentCall {
  return {
    id: nextId("call"),
    agent: "progress",
    timestamp: new Date().toISOString(),
    action,
    input,
    output,
  };
}
