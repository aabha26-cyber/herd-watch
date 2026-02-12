/**
 * Data Upload Engine
 * ==================
 * Supports uploading any dataset as a map layer:
 *   - GeoJSON (.geojson, .json)
 *   - CSV with lat/lng columns (.csv)
 *   - KML (.kml)
 *
 * Parses uploaded files client-side (no server needed)
 * and converts to a uniform GeoJSON FeatureCollection
 * that can be rendered on the Leaflet map.
 */

// ── Types ─────────────────────────────────────────────────

export type UploadedLayer = {
  id: string;
  name: string;
  /** Original file type */
  fileType: "geojson" | "csv" | "kml" | "unknown";
  /** Parsed GeoJSON FeatureCollection */
  geojson: GeoJSON.FeatureCollection;
  /** Display color */
  color: string;
  /** Whether the layer is currently visible */
  visible: boolean;
  /** Number of features */
  featureCount: number;
  /** Upload timestamp */
  uploadedAt: string;
};

// ── Color palette for uploaded layers ───────────────────

const LAYER_COLORS = [
  "#f97316", // orange
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
  "#f43f5e", // rose
  "#14b8a6", // teal
  "#a855f7", // purple
];

let colorIdx = 0;
function nextColor(): string {
  const c = LAYER_COLORS[colorIdx % LAYER_COLORS.length];
  colorIdx++;
  return c;
}

let uid = 0;
function nextId(): string {
  return `layer-${++uid}-${Date.now().toString(36)}`;
}

// ── Parsers ─────────────────────────────────────────────

/**
 * Parse a GeoJSON file.
 */
function parseGeoJSON(text: string): GeoJSON.FeatureCollection {
  const parsed = JSON.parse(text);

  // Handle FeatureCollection
  if (parsed.type === "FeatureCollection" && Array.isArray(parsed.features)) {
    return parsed as GeoJSON.FeatureCollection;
  }

  // Handle single Feature
  if (parsed.type === "Feature") {
    return {
      type: "FeatureCollection",
      features: [parsed],
    };
  }

  // Handle bare geometry
  if (parsed.type && parsed.coordinates) {
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {},
          geometry: parsed,
        },
      ],
    };
  }

  throw new Error("Not a valid GeoJSON file");
}

/**
 * Parse a CSV file with lat/lng columns.
 * Detects common column names: lat/latitude/y, lng/longitude/lon/x
 */
function parseCSV(text: string): GeoJSON.FeatureCollection {
  const lines = text.trim().split("\n");
  if (lines.length < 2) throw new Error("CSV must have a header row and at least one data row");

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/"/g, ""));

  // Find lat/lng columns
  const latCol = header.findIndex((h) =>
    ["lat", "latitude", "y", "lat_y", "point_y"].includes(h)
  );
  const lngCol = header.findIndex((h) =>
    ["lng", "lon", "longitude", "x", "long", "lat_x", "point_x"].includes(h)
  );

  if (latCol === -1 || lngCol === -1) {
    throw new Error(
      `CSV must have latitude and longitude columns. Found columns: ${header.join(", ")}. ` +
      `Expected one of: lat/latitude/y and lng/lon/longitude/x`
    );
  }

  const features: GeoJSON.Feature[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
    const lat = parseFloat(cols[latCol]);
    const lng = parseFloat(cols[lngCol]);

    if (isNaN(lat) || isNaN(lng)) continue;

    // Build properties from all other columns
    const properties: Record<string, string | number> = {};
    for (let j = 0; j < header.length; j++) {
      if (j === latCol || j === lngCol) continue;
      const val = cols[j] ?? "";
      const num = parseFloat(val);
      properties[header[j]] = isNaN(num) ? val : num;
    }

    features.push({
      type: "Feature",
      properties,
      geometry: {
        type: "Point",
        coordinates: [lng, lat],
      },
    });
  }

  if (features.length === 0) {
    throw new Error("No valid lat/lng rows found in CSV");
  }

  return { type: "FeatureCollection", features };
}

/**
 * Parse a KML file (basic support for Point, LineString, Polygon).
 */
function parseKML(text: string): GeoJSON.FeatureCollection {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, "text/xml");
  const features: GeoJSON.Feature[] = [];

  const placemarks = doc.querySelectorAll("Placemark");

  placemarks.forEach((pm) => {
    const name = pm.querySelector("name")?.textContent ?? "";
    const desc = pm.querySelector("description")?.textContent ?? "";

    // Point
    const point = pm.querySelector("Point coordinates");
    if (point) {
      const coords = point.textContent?.trim().split(",").map(Number);
      if (coords && coords.length >= 2) {
        features.push({
          type: "Feature",
          properties: { name, description: desc },
          geometry: { type: "Point", coordinates: [coords[0], coords[1]] },
        });
      }
    }

    // LineString
    const line = pm.querySelector("LineString coordinates");
    if (line) {
      const coordPairs = line.textContent?.trim().split(/\s+/) ?? [];
      const coords = coordPairs
        .map((p) => p.split(",").map(Number))
        .filter((c) => c.length >= 2);
      if (coords.length > 1) {
        features.push({
          type: "Feature",
          properties: { name, description: desc },
          geometry: { type: "LineString", coordinates: coords.map((c) => [c[0], c[1]]) },
        });
      }
    }

    // Polygon
    const poly = pm.querySelector("Polygon outerBoundaryIs LinearRing coordinates");
    if (poly) {
      const coordPairs = poly.textContent?.trim().split(/\s+/) ?? [];
      const coords = coordPairs
        .map((p) => p.split(",").map(Number))
        .filter((c) => c.length >= 2);
      if (coords.length > 2) {
        features.push({
          type: "Feature",
          properties: { name, description: desc },
          geometry: { type: "Polygon", coordinates: [coords.map((c) => [c[0], c[1]])] },
        });
      }
    }
  });

  if (features.length === 0) {
    throw new Error("No valid features found in KML file");
  }

  return { type: "FeatureCollection", features };
}

// ── Main: process an uploaded file ──────────────────────

/**
 * Process a File object into an UploadedLayer.
 * Detects format from extension and parses accordingly.
 */
export async function processUploadedFile(file: File): Promise<UploadedLayer> {
  const text = await file.text();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  let geojson: GeoJSON.FeatureCollection;
  let fileType: UploadedLayer["fileType"] = "unknown";

  if (ext === "geojson" || ext === "json") {
    geojson = parseGeoJSON(text);
    fileType = "geojson";
  } else if (ext === "csv") {
    geojson = parseCSV(text);
    fileType = "csv";
  } else if (ext === "kml") {
    geojson = parseKML(text);
    fileType = "kml";
  } else {
    // Try GeoJSON first, then CSV
    try {
      geojson = parseGeoJSON(text);
      fileType = "geojson";
    } catch {
      try {
        geojson = parseCSV(text);
        fileType = "csv";
      } catch {
        throw new Error(
          `Unsupported file format: .${ext}. Upload GeoJSON (.geojson/.json), CSV (.csv), or KML (.kml).`
        );
      }
    }
  }

  // Strip the extension from the display name
  const name = file.name.replace(/\.[^.]+$/, "");

  return {
    id: nextId(),
    name,
    fileType,
    geojson,
    color: nextColor(),
    visible: true,
    featureCount: geojson.features.length,
    uploadedAt: new Date().toISOString(),
  };
}
