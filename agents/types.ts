// ──────────────────────────────────────────────────────────────
// Agent Types – shared across planning, progress, and research
// ──────────────────────────────────────────────────────────────

/** Unique agent identifiers */
export type AgentKind = "planning" | "progress" | "research";

/** Every agent call is recorded with this shape */
export type AgentCall = {
  id: string;
  agent: AgentKind;
  timestamp: string; // ISO-8601
  action: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
};

// ── Planning Agent ──────────────────────────────────────────

export type MilestoneStatus = "not_started" | "in_progress" | "completed" | "blocked";

export type Milestone = {
  id: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  tasks: PlanTask[];
  targetDate?: string;
};

export type PlanTask = {
  id: string;
  title: string;
  description: string;
  status: MilestoneStatus;
  assignedAgent?: AgentKind;
  dependencies?: string[]; // task IDs
  notes?: string;
};

export type ProjectPlan = {
  title: string;
  objective: string;
  createdAt: string;
  updatedAt: string;
  milestones: Milestone[];
};

// ── Progress Agent ──────────────────────────────────────────

export type ProgressEntry = {
  id: string;
  timestamp: string;
  milestone: string; // milestone ID
  taskId?: string;
  action: "started" | "updated" | "completed" | "blocked" | "note";
  summary: string;
  details?: string;
};

export type ProgressSnapshot = {
  asOf: string;
  totalMilestones: number;
  completedMilestones: number;
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  percentComplete: number;
  recentEntries: ProgressEntry[];
};

// ── Research Agent ──────────────────────────────────────────

export type DatasetCategory =
  | "satellite_imagery"
  | "vegetation"
  | "climate"
  | "water"
  | "livestock_baseline"
  | "conflict"
  | "humanitarian"
  | "infrastructure"
  | "flood"
  | "other";

export type Dataset = {
  id: string;
  name: string;
  provider: string;
  category: DatasetCategory;
  resolution: string;
  cadence: string;
  url: string;
  license: string;
  description: string;
  mapsToParameter?: string; // which HerdWatch model param this feeds
  priority: number; // 1 = highest
  notes?: string;
};

export type ResearchFinding = {
  id: string;
  timestamp: string;
  topic: string;
  summary: string;
  sources: string[];
  relatedDatasets?: string[]; // dataset IDs
  actionItems?: string[];
};

export type ResearchState = {
  datasets: Dataset[];
  findings: ResearchFinding[];
};
