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

// Demo peacekeeping / field presence sites (South Sudan)
export const PEACEKEEPING_SITES: PeacekeepingSite[] = [
  { id: "pk1", name: "Bor Field Office", lat: 6.21, lng: 31.56, type: "base" },
  { id: "pk2", name: "Juba HQ", lat: 4.85, lng: 31.60, type: "base" },
  { id: "pk3", name: "Malakal Outpost", lat: 9.53, lng: 31.65, type: "outpost" },
  { id: "pk4", name: "Wau Patrol", lat: 7.70, lng: 27.99, type: "patrol" },
  { id: "pk5", name: "Rumbek", lat: 6.81, lng: 29.68, type: "outpost" },
  { id: "pk6", name: "Yambio", lat: 4.57, lng: 28.40, type: "patrol" },
  { id: "pk7", name: "Torit", lat: 4.41, lng: 32.57, type: "outpost" },
  { id: "pk8", name: "Kapoeta", lat: 4.77, lng: 33.59, type: "patrol" },
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

export const FARMS: Farm[] = [
  { id: "f1", name: "Bor North", bounds: farmPolygon(6.35, 31.45) },
  { id: "f2", name: "Juba West", bounds: farmPolygon(4.78, 31.52) },
  { id: "f3", name: "Malakal South", bounds: farmPolygon(9.38, 31.62) },
  { id: "f4", name: "Wau East", bounds: farmPolygon(7.72, 28.12) },
  { id: "f5", name: "Rumbek Central", bounds: farmPolygon(6.75, 29.72) },
  { id: "f6", name: "Yei", bounds: farmPolygon(4.09, 30.68) },
  { id: "f7", name: "Torit North", bounds: farmPolygon(4.48, 32.52) },
  { id: "f8", name: "Gogrial", bounds: farmPolygon(8.53, 28.10) },
];
