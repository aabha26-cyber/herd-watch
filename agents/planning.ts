// ──────────────────────────────────────────────────────────────
// Planning Agent
// Creates, manages, and updates the project plan for HerdWatch.
// Breaks the challenge into milestones → tasks with dependencies.
// ──────────────────────────────────────────────────────────────

import type {
  AgentCall,
  ProjectPlan,
  Milestone,
  MilestoneStatus,
  PlanTask,
} from "./types";
import { record } from "./log";

let uid = 0;
const nextId = (prefix: string) => `${prefix}-${++uid}-${Date.now().toString(36)}`;

// ── In-memory plan (persisted via AGENT_LOG.md through the log module) ──

let plan: ProjectPlan = {
  title: "HerdWatch – South Sudan Cattle Movement Intelligence",
  objective:
    "Adapt AI-based mapping and predictive modeling frameworks—using open-source " +
    "satellite imagery and geospatial data—to detect, track, and forecast cattle " +
    "presence and movement across South Sudan.",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  milestones: [],
};

// ── Public API ──────────────────────────────────────────────

/** Return the current project plan. */
export function getPlan(): ProjectPlan {
  return structuredClone(plan);
}

/** Initialise the plan with the default HerdWatch milestones. */
export function initDefaultPlan(): ProjectPlan {
  plan.milestones = defaultMilestones();
  plan.updatedAt = new Date().toISOString();
  record(call("initDefaultPlan", {}, { milestonesCreated: plan.milestones.length }));
  return getPlan();
}

/** Add a new milestone. */
export function addMilestone(
  title: string,
  description: string,
  tasks: Omit<PlanTask, "id" | "status">[] = [],
  targetDate?: string
): Milestone {
  const m: Milestone = {
    id: nextId("ms"),
    title,
    description,
    status: "not_started",
    tasks: tasks.map((t) => ({ ...t, id: nextId("task"), status: "not_started" as const })),
    targetDate,
  };
  plan.milestones.push(m);
  plan.updatedAt = new Date().toISOString();
  record(call("addMilestone", { title }, { milestoneId: m.id, taskCount: m.tasks.length }));
  return structuredClone(m);
}

/** Update the status of a milestone or task. */
export function updateStatus(
  milestoneId: string,
  status: MilestoneStatus,
  taskId?: string
): boolean {
  const ms = plan.milestones.find((m) => m.id === milestoneId);
  if (!ms) return false;
  if (taskId) {
    const task = ms.tasks.find((t) => t.id === taskId);
    if (!task) return false;
    task.status = status;
  } else {
    ms.status = status;
  }
  plan.updatedAt = new Date().toISOString();
  record(call("updateStatus", { milestoneId, taskId, status }, { success: true }));
  return true;
}

/** Add a task to an existing milestone. */
export function addTask(
  milestoneId: string,
  title: string,
  description: string,
  deps?: string[]
): PlanTask | null {
  const ms = plan.milestones.find((m) => m.id === milestoneId);
  if (!ms) return null;
  const task: PlanTask = {
    id: nextId("task"),
    title,
    description,
    status: "not_started",
    dependencies: deps,
  };
  ms.tasks.push(task);
  plan.updatedAt = new Date().toISOString();
  record(call("addTask", { milestoneId, title }, { taskId: task.id }));
  return structuredClone(task);
}

/** Serialise the full plan to Markdown (for AGENT_LOG.md). */
export function planToMarkdown(): string {
  const lines: string[] = [
    `# Project Plan: ${plan.title}`,
    "",
    `> ${plan.objective}`,
    "",
    `Created: ${plan.createdAt}  ·  Updated: ${plan.updatedAt}`,
    "",
  ];

  for (const ms of plan.milestones) {
    const pct = ms.tasks.length
      ? Math.round((ms.tasks.filter((t) => t.status === "completed").length / ms.tasks.length) * 100)
      : 0;
    lines.push(`## ${statusIcon(ms.status)} ${ms.title}  (${pct}%)`);
    lines.push("");
    lines.push(ms.description);
    if (ms.targetDate) lines.push(`\n*Target: ${ms.targetDate}*`);
    lines.push("");
    for (const t of ms.tasks) {
      const deps = t.dependencies?.length ? ` ← depends on ${t.dependencies.join(", ")}` : "";
      lines.push(`- ${statusIcon(t.status)} **${t.title}**${deps}`);
      lines.push(`  ${t.description}`);
      if (t.notes) lines.push(`  _${t.notes}_`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

// ── Internals ───────────────────────────────────────────────

function call(action: string, input: Record<string, unknown>, output: Record<string, unknown>): AgentCall {
  return {
    id: nextId("call"),
    agent: "planning",
    timestamp: new Date().toISOString(),
    action,
    input,
    output,
  };
}

function statusIcon(s: MilestoneStatus): string {
  switch (s) {
    case "completed":
      return "✅";
    case "in_progress":
      return "🔄";
    case "blocked":
      return "🚫";
    default:
      return "⬜";
  }
}

// ── Default milestones for the HerdWatch challenge ──────────

function defaultMilestones(): Milestone[] {
  return [
    {
      id: nextId("ms"),
      title: "M1 – Data Acquisition & Pipeline",
      description:
        "Identify, download, and pre-process all open-source satellite imagery and geospatial datasets required for the model.",
      status: "in_progress",
      targetDate: "2026-02-20",
      tasks: [
        task("Sentinel-2 optical imagery pipeline", "Set up Copernicus Data Space API access and download Sentinel-2 tiles covering South Sudan. Process to surface reflectance.", "research"),
        task("Sentinel-1 SAR radar pipeline", "Download Sentinel-1 GRD data for South Sudan. Pre-process backscatter for ground disturbance detection.", "research"),
        task("CHIRPS rainfall integration", "Download CHIRPS 2.0 daily/monthly precipitation grids for South Sudan. Compute 30-year anomalies.", "research"),
        task("MODIS NDVI time series", "Ingest MOD13A2 16-day NDVI composites. Compute seasonal anomalies and decline maps.", "research"),
        task("JRC Global Surface Water", "Download seasonal water extent for South Sudan from JRC. Compute distance-to-water rasters.", "research"),
        task("FAO GLW4 cattle density baseline", "Download Gridded Livestock of the World v4 cattle layer. Use as prior for herd placement.", "research"),
        task("ACLED conflict events", "Register for ACLED API. Download geolocated conflict events for South Sudan (2020–present).", "research"),
        task("OpenStreetMap infrastructure", "Download roads, settlements, and water points from HDX/OSM export for South Sudan.", "research"),
      ],
    },
    {
      id: nextId("ms"),
      title: "M2 – Detection Model (Cattle Presence)",
      description:
        "Train and validate an AI model to detect cattle camps and herd presence from satellite imagery.",
      status: "not_started",
      targetDate: "2026-03-15",
      tasks: [
        task("Label training data", "Use ONS cattle camp predictions + manual annotation to build labeled dataset of cattle camp locations."),
        task("UNET segmentation model", "Implement UNET architecture for Sentinel-2 cattle camp segmentation following ONS methodology."),
        task("SAR fusion model", "Extend detection to incorporate Sentinel-1 SAR backscatter for cloud-free detection."),
        task("Validation & accuracy metrics", "Validate against held-out camps. Report precision, recall, F1 per season."),
      ],
    },
    {
      id: nextId("ms"),
      title: "M3 – Movement Prediction Model",
      description:
        "Build predictive model for cattle movement trajectories based on environmental signals and historical patterns.",
      status: "not_started",
      targetDate: "2026-04-01",
      tasks: [
        task("Feature engineering", "Compute heat-score features from real data: radar disturbance, NDVI decline, dist-to-water, seasonal weight, rainfall, drought, flood."),
        task("Temporal movement model", "Train sequence model (LSTM/Transformer) on historical herd positions to predict 1–8 week forward trajectories."),
        task("Scenario simulation engine", "Replace mock scenario sliders with real CHIRPS/MODIS-driven what-if scenarios."),
        task("Corridor identification", "Identify traditional transhumance corridors from multi-year movement data."),
      ],
    },
    {
      id: nextId("ms"),
      title: "M4 – Risk & Early Warning System",
      description:
        "Detect convergence, conflict risk, and resource scarcity from predicted movements. Generate actionable alerts.",
      status: "not_started",
      targetDate: "2026-04-15",
      tasks: [
        task("Herd convergence detection", "Upgrade risk.ts to use predicted trajectories for multi-herd convergence forecasting."),
        task("ACLED conflict overlay", "Integrate historical conflict events to weight risk zones by past violence."),
        task("Resource scarcity alerts", "Combine NDVI, water, and cattle density to flag overgrazing / water stress before it happens."),
        task("Alternative route suggestions", "Generate safe corridor recommendations that avoid risk zones and conflict hotspots."),
      ],
    },
    {
      id: nextId("ms"),
      title: "M5 – Dashboard & Visualization",
      description:
        "Upgrade the HerdWatch simulator dashboard with real data layers and improved UX.",
      status: "in_progress",
      targetDate: "2026-04-30",
      tasks: [
        task("Real data layer integration", "Replace mock grid/herd data with outputs from detection and prediction models."),
        task("Temporal playback with real dates", "Connect time slider to actual satellite observation dates."),
        task("Field briefing export", "Enhance PDF/field briefing exports with real data summaries for peacekeepers."),
        task("Ethics & data governance", "Ensure all outputs are aggregated (no individual tracking), add provenance metadata."),
      ],
    },
  ];
}

function task(title: string, description: string, agent?: "planning" | "progress" | "research"): PlanTask {
  return {
    id: nextId("task"),
    title,
    description,
    status: "not_started",
    assignedAgent: agent,
  };
}
