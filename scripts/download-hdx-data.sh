#!/bin/bash
# =============================================================================
# Download static geographic data from HDX for South Sudan
# =============================================================================
# Run this once to populate public/data/ with real GeoJSON files.
# These replace the hardcoded arrays in lib/environment.ts.
#
# Sources:
#   - Humanitarian Data Exchange (data.humdata.org)
#   - FAO rivers, OSM populated places, OCHA admin boundaries
#
# Usage:
#   chmod +x scripts/download-hdx-data.sh
#   ./scripts/download-hdx-data.sh
# =============================================================================

set -e
OUTDIR="public/data"
mkdir -p "$OUTDIR"

echo "Downloading South Sudan geographic data from HDX..."

# 1. Rivers/Waterways (FAO)
echo "  [1/4] Rivers (FAO)..."
curl -sL "https://data.humdata.org/dataset/0b3e3a79-bab9-4544-a498-2a52f5cd53a1/resource/5f4d6b6b-fb68-44ba-a30e-6b9af1e9e0c6/download/ssd_rivers.geojson" \
  -o "$OUTDIR/south-sudan-rivers.geojson" 2>/dev/null || echo "    (rivers: download failed — try manually from https://data.humdata.org/group/ssd)"

# 2. Populated Places / Villages (OSM via HDX)
echo "  [2/4] Populated places (OSM)..."
curl -sL "https://data.humdata.org/dataset/hotosm_ssd_populated_places/resource/download/hotosm_ssd_populated_places_points_geojson.zip" \
  -o "/tmp/ssd_places.zip" 2>/dev/null && \
  unzip -o "/tmp/ssd_places.zip" -d "/tmp/ssd_places" >/dev/null 2>&1 && \
  mv /tmp/ssd_places/*.geojson "$OUTDIR/south-sudan-villages.geojson" 2>/dev/null || \
  echo "    (villages: download failed — try manually from https://data.humdata.org/group/ssd)"

# 3. Roads (OSM via HDX)
echo "  [3/4] Roads (OSM)..."
curl -sL "https://data.humdata.org/dataset/hotosm_ssd_roads/resource/download/hotosm_ssd_roads_lines_geojson.zip" \
  -o "/tmp/ssd_roads.zip" 2>/dev/null && \
  unzip -o "/tmp/ssd_roads.zip" -d "/tmp/ssd_roads" >/dev/null 2>&1 && \
  mv /tmp/ssd_roads/*.geojson "$OUTDIR/south-sudan-roads.geojson" 2>/dev/null || \
  echo "    (roads: download failed — try manually from https://data.humdata.org/group/ssd)"

# 4. Admin Boundaries (OCHA)
echo "  [4/4] Admin boundaries (OCHA)..."
curl -sL "https://data.humdata.org/dataset/cod-ab-ssd/resource/download/ssd_admbnda_adm2_imwg_nbs_20230829.geojson" \
  -o "$OUTDIR/south-sudan-admin.geojson" 2>/dev/null || \
  echo "    (admin: download failed — try manually from https://data.humdata.org/group/ssd)"

echo ""
echo "Done. Files in $OUTDIR/:"
ls -la "$OUTDIR/"
echo ""
echo "Note: HDX URLs change periodically. If downloads failed, visit"
echo "  https://data.humdata.org/group/ssd"
echo "and search for the datasets manually."
