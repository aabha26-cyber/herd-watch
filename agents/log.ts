// ──────────────────────────────────────────────────────────────
// Agent Log – Central ledger of all agent calls and outlines
// Every action from planning, progress, and research agents is
// recorded here. The full log can be serialised to AGENT_LOG.md.
// ──────────────────────────────────────────────────────────────

import type { AgentCall, AgentKind } from "./types";

const callLog: AgentCall[] = [];

/** Record an agent call in the central ledger. */
export function record(call: AgentCall): void {
  callLog.push(call);
}

/** Return all recorded calls, optionally filtered by agent. */
export function getCalls(agent?: AgentKind): AgentCall[] {
  const filtered = agent ? callLog.filter((c) => c.agent === agent) : callLog;
  return structuredClone(filtered);
}

/** Return a summary of call counts per agent. */
export function callSummary(): Record<AgentKind, number> {
  const counts: Record<AgentKind, number> = { planning: 0, progress: 0, research: 0 };
  for (const c of callLog) counts[c.agent]++;
  return counts;
}

/** Serialise the full call log to Markdown. */
export function logToMarkdown(): string {
  const lines: string[] = [
    "# Agent Call Log",
    "",
    `**Total calls:** ${callLog.length}`,
    "",
    "| # | Timestamp | Agent | Action | Summary |",
    "|---|-----------|-------|--------|---------|",
  ];

  for (let i = 0; i < callLog.length; i++) {
    const c = callLog[i];
    const summary = Object.entries(c.output)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", ");
    lines.push(
      `| ${i + 1} | ${c.timestamp.slice(0, 19)} | ${c.agent} | ${c.action} | ${summary} |`
    );
  }

  return lines.join("\n");
}

/** Clear the log (for testing). */
export function clearLog(): void {
  callLog.length = 0;
}
