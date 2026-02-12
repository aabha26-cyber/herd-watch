// ──────────────────────────────────────────────────────────────
// agents/index.ts – Public barrel export for all three agents
// ──────────────────────────────────────────────────────────────

// Types
export type {
  AgentKind,
  AgentCall,
  Milestone,
  MilestoneStatus,
  PlanTask,
  ProjectPlan,
  ProgressEntry,
  ProgressSnapshot,
  Dataset,
  DatasetCategory,
  ResearchFinding,
  ResearchState,
} from "./types";

// Planning Agent
export {
  getPlan,
  initDefaultPlan,
  addMilestone,
  updateStatus,
  addTask,
  planToMarkdown,
} from "./planning";

// Progress Agent
export {
  logProgress,
  getSnapshot,
  getJournal,
  progressToMarkdown,
} from "./progress";

// Research Agent
export {
  getDatasets,
  getFindings,
  addDataset,
  addFinding,
  datasetsByCategory,
  datasetParameterMap,
  loadCuratedDatasets,
  researchToMarkdown,
} from "./research";

// Central Log
export {
  record,
  getCalls,
  callSummary,
  logToMarkdown,
  clearLog,
} from "./log";

// ── Convenience: generate full AGENT_LOG.md content ─────────

import { planToMarkdown } from "./planning";
import { progressToMarkdown } from "./progress";
import { researchToMarkdown } from "./research";
import { logToMarkdown } from "./log";

/**
 * Render the full AGENT_LOG.md content combining all three
 * agents' output and the call ledger.
 */
export function renderFullLog(): string {
  const divider = "\n\n---\n\n";
  return [
    "<!-- AUTO-GENERATED — do not edit manually -->",
    `<!-- Last updated: ${new Date().toISOString()} -->`,
    "",
    planToMarkdown(),
    divider,
    progressToMarkdown(),
    divider,
    researchToMarkdown(),
    divider,
    logToMarkdown(),
  ].join("\n");
}
