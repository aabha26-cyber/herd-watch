import type { GridCell } from "./mockData";
import { SOUTH_SUDAN_BOUNDS } from "./constants";

export function exportGeoJSON(cells: GridCell[], filename = "herdwatch-heat.geojson") {
  const features = cells.map((c) => ({
    type: "Feature" as const,
    properties: { heat: c.heat, confidence: c.confidence, isCongestion: c.isCongestion ?? false },
    geometry: {
      type: "Point" as const,
      coordinates: [c.lng, c.lat],
    },
  }));

  const geojson = {
    type: "FeatureCollection",
    features,
    metadata: {
      description: "HerdWatch Simulator – cattle presence heat (environmental signals only)",
      notFor: "enforcement or military use",
    },
  };

  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportMapPNG(selector: string = ".leaflet-container", filename = "herdwatch-map.png") {
  const html2canvas = (await import("html2canvas")).default;
  const el = document.querySelector(selector);
  if (!el) return;
  const canvas = await html2canvas(el as HTMLElement, {
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#0f1115",
    scale: 2,
  });
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

export async function exportPDFSummary(
  title: string,
  summary: string,
  filename = "herdwatch-summary.pdf"
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 20, 20);
  doc.setFontSize(10);
  doc.text(summary, 20, 35, { maxWidth: 170 });
  doc.text("Not for enforcement or military use. Environmental signals only.", 20, doc.internal.pageSize.height - 15);
  doc.save(filename);
}

export type AlertForExport = {
  reason: string;
  riskLevel: string;
  location: string;
  daysAway: number;
  suggestedActions: { description: string }[];
};

export async function exportFieldBriefing(
  timeLabel: string,
  herds: { id: string; lat: number; lng: number }[],
  alerts: AlertForExport[],
  scenario: { rainfallAnomaly: number; droughtSeverity: number; floodExtent: number }
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.width;
  doc.setFontSize(16);
  doc.text("HerdWatch – Field Briefing", 20, 20);
  doc.setFontSize(10);
  doc.text(`Time: ${timeLabel} | Herds: ${herds.length} | Alerts: ${alerts.length}`, 20, 28);
  doc.text(`Scenario: rainfall ${scenario.rainfallAnomaly}, drought ${scenario.droughtSeverity}, flood ${scenario.floodExtent}`, 20, 35);
  let y = 45;
  if (alerts.length > 0) {
    doc.setFontSize(11);
    doc.text("Movement alerts (coordinate with community leaders)", 20, y);
    y += 8;
    doc.setFontSize(9);
    for (const a of alerts.slice(0, 6)) {
      const header = `[${a.riskLevel.toUpperCase()}] ${a.location} — ${a.daysAway} day${a.daysAway > 1 ? "s" : ""} away`;
      doc.text(`• ${header}`, 20, y, { maxWidth: pageW - 40 });
      y += 6;
      doc.text(`  ${a.reason}`, 22, y, { maxWidth: pageW - 44 });
      y += 6;
      const suggestions = a.suggestedActions.map((s) => s.description).join("; ");
      doc.text(`  Suggested: ${suggestions}`, 22, y, { maxWidth: pageW - 44 });
      y += 10;
      if (y > 260) {
        doc.addPage();
        y = 20;
      }
    }
    y += 5;
  }
  doc.setFontSize(9);
  doc.text("AI suggests → Peacekeepers communicate → Herders decide. Not for enforcement or military use.", 20, Math.min(y, 275));
  doc.text("Environmental signals only. Early-warning and coordination for livestock migration.", 20, doc.internal.pageSize.height - 10);
  doc.save("herdwatch-field-briefing.pdf");
}
