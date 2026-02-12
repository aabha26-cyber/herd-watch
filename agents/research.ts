// ──────────────────────────────────────────────────────────────
// Research Agent
// Catalogues datasets, research findings, and references.
// Maps datasets → HerdWatch model parameters.
// ──────────────────────────────────────────────────────────────

import type {
  AgentCall,
  Dataset,
  DatasetCategory,
  ResearchFinding,
  ResearchState,
} from "./types";
import { record } from "./log";

let uid = 0;
const nextId = (prefix: string) => `${prefix}-${++uid}-${Date.now().toString(36)}`;

// ── In-memory research state ────────────────────────────────

const state: ResearchState = {
  datasets: [],
  findings: [],
};

// ── Public API ──────────────────────────────────────────────

/** Return all catalogued datasets. */
export function getDatasets(): Dataset[] {
  return structuredClone(state.datasets);
}

/** Return all research findings. */
export function getFindings(): ResearchFinding[] {
  return structuredClone(state.findings);
}

/** Add or update a dataset entry. */
export function addDataset(ds: Omit<Dataset, "id">): Dataset {
  const existing = state.datasets.find(
    (d) => d.name === ds.name && d.provider === ds.provider
  );
  if (existing) {
    Object.assign(existing, ds);
    record(call("updateDataset", { name: ds.name }, { datasetId: existing.id }));
    return structuredClone(existing);
  }
  const entry: Dataset = { ...ds, id: nextId("ds") };
  state.datasets.push(entry);
  record(call("addDataset", { name: ds.name }, { datasetId: entry.id }));
  return structuredClone(entry);
}

/** Record a research finding. */
export function addFinding(
  topic: string,
  summary: string,
  sources: string[],
  relatedDatasets?: string[],
  actionItems?: string[]
): ResearchFinding {
  const f: ResearchFinding = {
    id: nextId("rf"),
    timestamp: new Date().toISOString(),
    topic,
    summary,
    sources,
    relatedDatasets,
    actionItems,
  };
  state.findings.push(f);
  record(call("addFinding", { topic }, { findingId: f.id }));
  return structuredClone(f);
}

/** Filter datasets by category. */
export function datasetsByCategory(cat: DatasetCategory): Dataset[] {
  return structuredClone(state.datasets.filter((d) => d.category === cat));
}

/** Show which model parameter each dataset feeds. */
export function datasetParameterMap(): Record<string, string[]> {
  const map: Record<string, string[]> = {};
  for (const ds of state.datasets) {
    if (ds.mapsToParameter) {
      if (!map[ds.mapsToParameter]) map[ds.mapsToParameter] = [];
      map[ds.mapsToParameter].push(ds.name);
    }
  }
  return map;
}

/** Load the curated HerdWatch dataset catalogue (from our prior research). */
export function loadCuratedDatasets(): Dataset[] {
  const curated: Omit<Dataset, "id">[] = [
    {
      name: "Sentinel-2 L2A",
      provider: "ESA / Copernicus",
      category: "satellite_imagery",
      resolution: "10 m optical",
      cadence: "5-day revisit",
      url: "https://dataspace.copernicus.eu",
      license: "Copernicus Open Access",
      description:
        "Primary optical imagery for cattle camp detection. ONS demonstrated UNET models detecting cattle camps in South Sudan from this dataset.",
      mapsToParameter: "radarDisturbance, ndviDecline",
      priority: 1,
    },
    {
      name: "Sentinel-1 SAR GRD",
      provider: "ESA / Copernicus",
      category: "satellite_imagery",
      resolution: "10 m C-band radar",
      cadence: "6-day revisit",
      url: "https://dataspace.copernicus.eu",
      license: "Copernicus Open Access",
      description:
        "Cloud-penetrating radar for rainy season. Backscatter changes reveal ground disturbance from large herds.",
      mapsToParameter: "radarDisturbance",
      priority: 2,
    },
    {
      name: "Landsat 8/9",
      provider: "USGS",
      category: "satellite_imagery",
      resolution: "30 m optical",
      cadence: "16-day revisit",
      url: "https://earthexplorer.usgs.gov",
      license: "Public Domain",
      description:
        "40+ year archive for baseline migration pattern analysis and long-term trend detection.",
      mapsToParameter: "ndviDecline",
      priority: 5,
    },
    {
      name: "MODIS NDVI (MOD13A2)",
      provider: "NASA",
      category: "vegetation",
      resolution: "250 m – 1 km",
      cadence: "16-day composites",
      url: "https://lpdaac.usgs.gov/products/mod13a2v061/",
      license: "Public Domain",
      description:
        "Long NDVI time series (2000–present). Directly replaces mock ndviDecline parameter. Cattle move toward greener pasture.",
      mapsToParameter: "ndviDecline",
      priority: 1,
    },
    {
      name: "CHIRPS 2.0",
      provider: "UCSB Climate Hazards Center",
      category: "climate",
      resolution: "~5 km",
      cadence: "Daily / monthly since 1981",
      url: "https://data.chc.ucsb.edu/products/CHIRPS-2.0/",
      license: "Creative Commons CC0",
      description:
        "Gold standard African rainfall dataset. Feeds rainfallAnomaly scenario parameter. Rain means new grass in 2-3 weeks.",
      mapsToParameter: "rainfallAnomaly",
      priority: 1,
    },
    {
      name: "MODIS Land Surface Temperature (MOD11A2)",
      provider: "NASA",
      category: "climate",
      resolution: "1 km",
      cadence: "8-day composites",
      url: "https://lpdaac.usgs.gov/products/mod11a2v061/",
      license: "Public Domain",
      description:
        "Thermal stress indicator. High LST correlates with drought and drives herds toward water.",
      mapsToParameter: "droughtSeverity",
      priority: 3,
    },
    {
      name: "SPI / SPEI Drought Indices",
      provider: "ICPAC",
      category: "climate",
      resolution: "Regional",
      cadence: "Monthly",
      url: "https://www.icpac.net/data-center/",
      license: "Open",
      description:
        "Standardised drought indices for East Africa. Pre-computed from CHIRPS. Maps to droughtSeverity slider.",
      mapsToParameter: "droughtSeverity",
      priority: 4,
    },
    {
      name: "JRC Global Surface Water Explorer",
      provider: "EC JRC / Google",
      category: "water",
      resolution: "30 m",
      cadence: "Monthly history 1984–2021",
      url: "https://global-surface-water.appspot.com",
      license: "Copernicus Open Access",
      description:
        "Maps every water surface on Earth over 37 years. Critical for distanceToWater parameter. Cattle must access water every 1-2 days.",
      mapsToParameter: "distanceToWater",
      priority: 1,
    },
    {
      name: "HydroSHEDS / HydroRIVERS",
      provider: "WWF",
      category: "water",
      resolution: "500 m – 1 km",
      cadence: "Static + modeled flow",
      url: "https://www.hydrosheds.org",
      license: "Open (CC-BY)",
      description:
        "River network and watershed boundaries. Defines permanent water corridors for cattle movement.",
      mapsToParameter: "distanceToWater",
      priority: 4,
    },
    {
      name: "FAO Gridded Livestock of the World (GLW4)",
      provider: "FAO",
      category: "livestock_baseline",
      resolution: "~10 km",
      cadence: "Static (2020 aligned)",
      url: "https://data.apps.fao.org/catalog/dataset/glw",
      license: "Open (CC-BY-SA)",
      description:
        "Modeled cattle density for South Sudan. Essential baseline for calibrating herd placement (HERD_SEEDS).",
      mapsToParameter: "HERD_SEEDS (initial placement)",
      priority: 2,
    },
    {
      name: "ONS Cattle Camp Predictions",
      provider: "UK ONS Data Science Campus",
      category: "livestock_baseline",
      resolution: "~10 m",
      cadence: "Research output",
      url: "https://datasciencecampus.ons.gov.uk/projects/technical-report-predicting-cattle-camp-locations-in-south-sudan-from-sentinel-2-satellite-imagery/",
      license: "Open Government Licence",
      description:
        "Predicted cattle camp locations in South Sudan from Sentinel-2 using UNET models. Closest existing labelled training data.",
      mapsToParameter: "HERD_SEEDS (ground truth)",
      priority: 1,
    },
    {
      name: "ACLED (Armed Conflict Location & Event Data)",
      provider: "ACLED",
      category: "conflict",
      resolution: "Point events",
      cadence: "Weekly updates",
      url: "https://acleddata.com",
      license: "Free (registration required)",
      description:
        "Geolocated conflict events including cattle raiding. Feeds risk model — areas with violence are zones herds avoid.",
      mapsToParameter: "riskZones (risk.ts)",
      priority: 2,
    },
    {
      name: "IPC Food Security Classification",
      provider: "IPC",
      category: "humanitarian",
      resolution: "Admin-2 level",
      cadence: "Quarterly",
      url: "https://data.humdata.org/dataset?groups=ssd&organization=ipc",
      license: "Open",
      description:
        "Food insecurity phases by county. IPC Phase 4/5 areas correlate with displacement and disrupted transhumance.",
      mapsToParameter: "riskZones (risk.ts)",
      priority: 3,
    },
    {
      name: "OpenStreetMap South Sudan Roads",
      provider: "HOT / OpenStreetMap",
      category: "infrastructure",
      resolution: "Vector",
      cadence: "Monthly updates",
      url: "https://data.humdata.org/dataset/hotosm_ssd_roads",
      license: "ODbL",
      description:
        "Roads, markets, settlements, water points. Cattle movement follows corridors near roads.",
      mapsToParameter: "alternativeRoutes",
      priority: 4,
    },
    {
      name: "SRTM / Copernicus DEM",
      provider: "NASA / ESA",
      category: "infrastructure",
      resolution: "30 m",
      cadence: "Static",
      url: "https://earthdata.nasa.gov",
      license: "Public Domain",
      description:
        "Elevation data. Cattle avoid steep terrain and move along river valleys. Constrains movement model.",
      mapsToParameter: "movement corridors",
      priority: 5,
    },
    {
      name: "Copernicus EMS Flood Maps",
      provider: "Copernicus",
      category: "flood",
      resolution: "~20 m",
      cadence: "Event-based",
      url: "https://emergency.copernicus.eu",
      license: "Copernicus Open Access",
      description:
        "Flood extent maps for South Sudan. Feeds floodExtent parameter. Critical for Sudd/Jonglei seasonal flooding.",
      mapsToParameter: "floodExtent",
      priority: 3,
    },
    {
      name: "MODIS Near-Real-Time Flood Data",
      provider: "NASA LANCE",
      category: "flood",
      resolution: "250 m",
      cadence: "Daily",
      url: "https://www.earthdata.nasa.gov/learn/find-data/near-real-time/modis-nrt-global-flood-product",
      license: "Public Domain",
      description:
        "Broader flood detection for Sudd wetland seasonal expansion. Coarser but more frequent than Copernicus EMS.",
      mapsToParameter: "floodExtent",
      priority: 4,
    },
  ];

  const added: Dataset[] = [];
  for (const ds of curated) {
    added.push(addDataset(ds));
  }

  record(call("loadCuratedDatasets", {}, { datasetsLoaded: added.length }));
  return added;
}

/** Serialise the full research state to Markdown (for AGENT_LOG.md). */
export function researchToMarkdown(): string {
  const lines: string[] = [
    "# Research Catalogue",
    "",
    `**Datasets:** ${state.datasets.length}  ·  **Findings:** ${state.findings.length}`,
    "",
  ];

  // Group datasets by category
  const cats = Array.from(new Set(state.datasets.map((d) => d.category)));
  for (const cat of cats) {
    const group = state.datasets.filter((d) => d.category === cat);
    lines.push(`## ${cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}`);
    lines.push("");
    lines.push("| # | Dataset | Provider | Resolution | Cadence | Maps To |");
    lines.push("|---|---------|----------|------------|---------|---------|");
    for (const d of group.sort((a, b) => a.priority - b.priority)) {
      lines.push(
        `| P${d.priority} | **${d.name}** | ${d.provider} | ${d.resolution} | ${d.cadence} | \`${d.mapsToParameter ?? "—"}\` |`
      );
    }
    lines.push("");
  }

  if (state.findings.length) {
    lines.push("## Research Findings");
    lines.push("");
    for (const f of state.findings) {
      lines.push(`### ${f.topic}`);
      lines.push(`*${f.timestamp.slice(0, 10)}*`);
      lines.push("");
      lines.push(f.summary);
      if (f.sources.length) {
        lines.push("");
        lines.push("**Sources:**");
        for (const s of f.sources) lines.push(`- ${s}`);
      }
      if (f.actionItems?.length) {
        lines.push("");
        lines.push("**Action Items:**");
        for (const a of f.actionItems) lines.push(`- [ ] ${a}`);
      }
      lines.push("");
    }
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
    agent: "research",
    timestamp: new Date().toISOString(),
    action,
    input,
    output,
  };
}
