/**
 * Conflict Risk Detection Engine
 * ===============================
 * A conflict risk is triggered when ALL conditions are met:
 *   1. Two predicted herd paths come within a defined distance
 *   2. Resource availability in that area is low
 *   3. The area is near villages or farmland
 *
 * When high-risk zone is detected → Uber-style rerouting:
 *   - Identify next-best grazing area
 *   - Suggest direction change OR short delay (1–2 days)
 *   - Guidance only — not enforcement
 */

import type { SimHerd } from "./movement";
import {
  distanceKm,
  vegetationAt,
  waterAt,
  nearestVillageDistance,
  conflictHistoryAt,
  type DayScenario,
} from "./environment";
import { getConflictRiskScoreAt } from "./data/realFactors";
import {
  getRiskThresholdProfile,
  type RiskCategory,
} from "./risk-config";
import { FARMS } from "./pois";

// ── Types ─────────────────────────────────────────────────

export type RiskLevel = "low" | "medium" | "high";

export type Alert = {
  id: string;
  herdIds: string[];
  lat: number;
  lng: number;
  /** Days until potential conflict */
  daysAway: number;
  /** Risk level */
  riskLevel: RiskLevel;
  /** UN-facing risk category */
  riskCategory: RiskCategory;
  /** Why this alert was triggered */
  reason: string;
  /** Human-readable location */
  location: string;
  /** Detailed trigger breakdown */
  triggers: {
    herdConvergence: boolean;
    resourceScarcity: boolean;
    nearVillage: boolean;
    nearFarmland: boolean;
    historicalConflict: boolean;
    acledBackedConflict: boolean;
  };
  /** Context profile used for this risk decision */
  thresholdProfile: { county: string; season: string };
  /** Uber-style rerouting suggestions */
  suggestedActions: SuggestedAction[];
};

export type SuggestedAction = {
  herdId: string;
  type: "redirect" | "delay" | "both";
  riskCategory: RiskCategory;
  direction?: string;
  delayDays?: number;
  description: string;
  /** Expected reduction in conflict probability */
  impactEstimate: string;
  /** Where to redirect to */
  targetLat?: number;
  targetLng?: number;
};

export type RiskZone = {
  lat: number;
  lng: number;
  radiusKm: number;
  riskLevel: RiskLevel;
  alertId: string;
};

export type AlternativeRoute = {
  herdId: string;
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
  label: string;
  type: "redirect" | "delay";
};

// ── Utility ─────────────────────────────────────────────

function distToFarm(lat: number, lng: number): number {
  let minDist = Infinity;
  for (const f of FARMS) {
    // Use centroid of farm polygon
    const centLat = f.bounds.reduce((s, b) => s + b[0], 0) / f.bounds.length;
    const centLng = f.bounds.reduce((s, b) => s + b[1], 0) / f.bounds.length;
    const d = distanceKm(lat, lng, centLat, centLng);
    if (d < minDist) minDist = d;
  }
  return minDist;
}

/**
 * Find the best alternative grazing area near a conflict zone.
 */
function findAlternativeGrazing(
  fromLat: number,
  fromLng: number,
  avoidLat: number,
  avoidLng: number,
  scenario: DayScenario,
): { lat: number; lng: number; direction: string } {
  const stepDeg = 0.3; // ~33km
  const directions = [
    { dlat: stepDeg, dlng: 0, name: "north" },
    { dlat: stepDeg, dlng: stepDeg, name: "northeast" },
    { dlat: 0, dlng: stepDeg, name: "east" },
    { dlat: -stepDeg, dlng: stepDeg, name: "southeast" },
    { dlat: -stepDeg, dlng: 0, name: "south" },
    { dlat: -stepDeg, dlng: -stepDeg, name: "southwest" },
    { dlat: 0, dlng: -stepDeg, name: "west" },
    { dlat: stepDeg, dlng: -stepDeg, name: "northwest" },
  ];

  let best = { lat: fromLat, lng: fromLng + stepDeg, direction: "east" };
  let bestScore = -Infinity;

  for (const d of directions) {
    const cLat = fromLat + d.dlat;
    const cLng = fromLng + d.dlng;
    // Score: high vegetation + water, far from conflict zone
    const veg = vegetationAt(cLat, cLng, scenario);
    const w = waterAt(cLat, cLng, scenario);
    const distFromConflict = distanceKm(cLat, cLng, avoidLat, avoidLng);
    const score = veg * 0.4 + w.score * 0.3 + (distFromConflict / 100) * 0.3;
    if (score > bestScore) {
      bestScore = score;
      best = { lat: cLat, lng: cLng, direction: d.name };
    }
  }

  return best;
}

// ── Main: detect risks and generate alerts ──────────────

export function detectRisks(
  herds: SimHerd[],
  baseDay: number,
  scenario: Omit<DayScenario, "day">,
): {
  alerts: Alert[];
  riskZones: RiskZone[];
  alternativeRoutes: AlternativeRoute[];
  suggestedActions: SuggestedAction[];
} {
  const alerts: Alert[] = [];
  const riskZones: RiskZone[] = [];
  const alternativeRoutes: AlternativeRoute[] = [];
  const allActions: SuggestedAction[] = [];

  // Derive forecast length from actual predictions
  const forecastDays = herds[0]?.predicted?.length ?? 4;

  // Check each future day
  for (let dayOffset = 1; dayOffset <= forecastDays; dayOffset++) {
    const dayScenario: DayScenario = { ...scenario, day: baseDay + dayOffset };

    // Get predicted positions
    const futurePositions = herds.map((h) => {
      const pred = h.predicted[dayOffset - 1];
      return pred
        ? { id: h.id, lat: pred.lat, lng: pred.lng }
        : { id: h.id, lat: h.lat, lng: h.lng };
    });

    // Check all herd pairs
    for (let i = 0; i < futurePositions.length; i++) {
      for (let j = i + 1; j < futurePositions.length; j++) {
        const a = futurePositions[i];
        const b = futurePositions[j];
        const dist = distanceKm(a.lat, a.lng, b.lat, b.lng);

        // Convergence + contextual thresholds are county/season aware.
        const midLat = (a.lat + b.lat) / 2;
        const midLng = (a.lng + b.lng) / 2;
        const profile = getRiskThresholdProfile(midLat, midLng, dayScenario);

        if (dist >= profile.convergenceKm) continue;

        const veg = vegetationAt(midLat, midLng, dayScenario);
        const water = waterAt(midLat, midLng, dayScenario);
        const villageDist = nearestVillageDistance(midLat, midLng);
        const farmDist = distToFarm(midLat, midLng);
        const acledConflict = getConflictRiskScoreAt(midLat, midLng);
        const conflictHist = acledConflict ?? conflictHistoryAt(midLat, midLng);

        const resourceScarcity =
          veg < profile.resourceScarcityThreshold ||
          water.score < profile.resourceScarcityThreshold;
        const nearVillage = villageDist.distKm < profile.villageProximityKm;
        const nearFarm = farmDist < profile.farmProximityKm;
        const hasHistory = conflictHist > profile.historyThreshold;

        // Count how many trigger conditions are met
        const triggerCount = [
          resourceScarcity,
          nearVillage,
          nearFarm,
          hasHistory,
        ].filter(Boolean).length;

        // Require convergence + at least 2 other conditions to avoid alert spam
        if (triggerCount < 2) continue;

        // Calculate risk level (stricter thresholds)
        let riskLevel: RiskLevel = "low";
        if (dist < profile.convergenceKm * 0.3 && triggerCount >= 3)
          riskLevel = "high";
        else if (dist < profile.convergenceKm * 0.5 && triggerCount >= 2)
          riskLevel = "medium";

        const riskCategory: RiskCategory =
          nearVillage || nearFarm || hasHistory
            ? "community_protection"
            : "resource_tension";

        // Build reason string
        const reasons: string[] = [
          `${a.id} & ${b.id} converging (${dist.toFixed(0)}km apart)`,
        ];
        if (resourceScarcity) reasons.push("low resource availability");
        if (nearVillage)
          reasons.push(
            `near ${villageDist.village?.name ?? "settlement"} (${villageDist.distKm.toFixed(0)}km)`,
          );
        if (nearFarm) reasons.push("near farmland");
        if (hasHistory)
          reasons.push(
            acledConflict !== null
              ? "recent ACLED conflict activity"
              : "historically conflict-prone area"
          );

        // Location name
        const locationName = villageDist.village
          ? `Near ${villageDist.village.name}`
          : `${midLat.toFixed(1)}°N, ${midLng.toFixed(1)}°E`;

        const alertId = `alert-${a.id}-${b.id}-d${dayOffset}`;

        // Generate Uber-style rerouting suggestions
        const suggestedActions: SuggestedAction[] = [];

        // Find alternative for herd A
        const altA = findAlternativeGrazing(
          a.lat,
          a.lng,
          midLat,
          midLng,
          dayScenario,
        );
        suggestedActions.push({
          herdId: a.id,
          type: "redirect",
          riskCategory,
          direction: altA.direction,
          description: `Redirect ${a.id} ${altA.direction} toward open pasture`,
          impactEstimate: "Lower conflict probability by ~40%",
          targetLat: altA.lat,
          targetLng: altA.lng,
        });

        // Suggest delay for herd B
        suggestedActions.push({
          herdId: b.id,
          type: "delay",
          riskCategory,
          delayDays: Math.min(dayOffset, 2),
          description: `Delay ${b.id} movement by ${Math.min(dayOffset, 2)} day${Math.min(dayOffset, 2) > 1 ? "s" : ""} — water available south`,
          impactEstimate: "Lower conflict probability by ~30%",
        });

        alerts.push({
          id: alertId,
          herdIds: [a.id, b.id],
          lat: midLat,
          lng: midLng,
          daysAway: dayOffset,
          riskLevel,
          riskCategory,
          reason: reasons.join("; "),
          location: locationName,
          triggers: {
            herdConvergence: true,
            resourceScarcity,
            nearVillage,
            nearFarmland: nearFarm,
            historicalConflict: hasHistory,
            acledBackedConflict: acledConflict !== null,
          },
          thresholdProfile: {
            county: profile.county,
            season: profile.season,
          },
          suggestedActions,
        });

        riskZones.push({
          lat: midLat,
          lng: midLng,
          radiusKm: 15,
          riskLevel,
          alertId,
        });

        // Alternative routes
        const herdA = herds.find((h) => h.id === a.id);
        const herdB = herds.find((h) => h.id === b.id);

        if (herdA) {
          alternativeRoutes.push({
            herdId: a.id,
            fromLat: herdA.lat,
            fromLng: herdA.lng,
            toLat: altA.lat,
            toLng: altA.lng,
            label: `Redirect ${altA.direction} → open pasture`,
            type: "redirect",
          });
        }

        if (herdB) {
          const altB = findAlternativeGrazing(
            b.lat,
            b.lng,
            midLat,
            midLng,
            dayScenario,
          );
          alternativeRoutes.push({
            herdId: b.id,
            fromLat: herdB.lat,
            fromLng: herdB.lng,
            toLat: altB.lat,
            toLng: altB.lng,
            label: `Delay ${Math.min(dayOffset, 2)}d → water south`,
            type: "delay",
          });
        }

        allActions.push(...suggestedActions);
      }
    }
  }

  // Deduplicate by herd pair only (keep soonest / highest-risk)
  const byKey = new Map<string, Alert>();
  for (const a of alerts) {
    const key = a.herdIds.slice().sort().join("-");
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, a);
    } else {
      // Prefer higher risk, then sooner
      const riskOrder = { high: 0, medium: 1, low: 2 };
      if (
        riskOrder[a.riskLevel] < riskOrder[existing.riskLevel] ||
        (a.riskLevel === existing.riskLevel && a.daysAway < existing.daysAway)
      ) {
        byKey.set(key, a);
      }
    }
  }
  const dedupedAlerts = Array.from(byKey.values())
    .sort((a, b) => {
      const riskOrder = { high: 0, medium: 1, low: 2 };
      return (
        riskOrder[a.riskLevel] - riskOrder[b.riskLevel] ||
        a.daysAway - b.daysAway
      );
    })
    .slice(0, 6);

  const dedupedAlertIds = new Set(dedupedAlerts.map((a) => a.id));
  const dedupedZones = riskZones.filter((z) => dedupedAlertIds.has(z.alertId));

  // Dedupe routes per herd
  const routeKeys = new Set<string>();
  const dedupedRoutes = alternativeRoutes.filter((r) => {
    const key = `${r.herdId}-${r.type}`;
    if (routeKeys.has(key)) return false;
    routeKeys.add(key);
    return dedupedAlertIds.has(
      alerts.find((a) => a.herdIds.includes(r.herdId))?.id ?? "",
    );
  });

  // Dedupe actions
  const actionKeys = new Set<string>();
  const dedupedActions = allActions.filter((a) => {
    const key = `${a.herdId}-${a.type}`;
    if (actionKeys.has(key)) return false;
    actionKeys.add(key);
    return true;
  });

  return {
    alerts: dedupedAlerts,
    riskZones: dedupedZones,
    alternativeRoutes: dedupedRoutes,
    suggestedActions: dedupedActions,
  };
}
