/**
 * Peacekeeping sites and farms for the map (demo POIs).
 * In production these would come from UN/FAO or field data.
 */

export type PeacekeepingSite = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type?: "base" | "patrol" | "outpost";
};

export type Farm = {
  id: string;
  name: string;
  /** Polygon as [lat, lng][] (closed ring) */
  bounds: [number, number][];
};

// UNMISS peacekeeping / field presence sites in Jonglei–Bor–Sudd corridor
export const PEACEKEEPING_SITES: PeacekeepingSite[] = [
  { id: "pk1", name: "UNMISS Bor PoC", lat: 6.22, lng: 31.58, type: "base" },
  { id: "pk2", name: "Pibor Patrol Base", lat: 6.82, lng: 33.12, type: "patrol" },
  { id: "pk3", name: "Ayod Forward Base", lat: 7.63, lng: 31.42, type: "outpost" },
  { id: "pk4", name: "Akobo PoC", lat: 7.76, lng: 33.02, type: "base" },
  { id: "pk5", name: "Duk Padiet Outpost", lat: 7.03, lng: 31.32, type: "outpost" },
  { id: "pk6", name: "Pochalla Patrol", lat: 6.12, lng: 32.63, type: "patrol" },
  { id: "pk7", name: "Waat Outpost", lat: 7.88, lng: 31.82, type: "outpost" },
  { id: "pk8", name: "Kongor Patrol", lat: 6.78, lng: 31.52, type: "patrol" },
];

// Demo farms (small polygons – rectangular plots)
function farmPolygon(centerLat: number, centerLng: number, sizeDeg = 0.08): [number, number][] {
  const h = sizeDeg / 2;
  return [
    [centerLat - h, centerLng - h],
    [centerLat - h, centerLng + h],
    [centerLat + h, centerLng + h],
    [centerLat + h, centerLng - h],
    [centerLat - h, centerLng - h],
  ];
}

// Farms along the Bor–Kongor–Duk corridor (subsistence plots near settlements)
export const FARMS: Farm[] = [
  { id: "f1", name: "Bor North", bounds: farmPolygon(6.35, 31.45) },
  { id: "f2", name: "Kongor East", bounds: farmPolygon(6.85, 31.60) },
  { id: "f3", name: "Duk lowland", bounds: farmPolygon(7.10, 31.25) },
  { id: "f4", name: "Twic East riverside", bounds: farmPolygon(6.55, 31.85) },
  { id: "f5", name: "Kolnyang plot", bounds: farmPolygon(6.10, 31.48) },
  { id: "f6", name: "Baidit plot", bounds: farmPolygon(6.25, 31.72) },
  { id: "f7", name: "Wernyol plot", bounds: farmPolygon(6.72, 31.18) },
  { id: "f8", name: "Padak plot", bounds: farmPolygon(6.48, 31.58) },
];
