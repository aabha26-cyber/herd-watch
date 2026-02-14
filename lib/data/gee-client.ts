/**
 * Google Earth Engine Client — Singleton
 * =======================================
 * Authenticates with GEE using a service account and provides
 * helper functions for fetching satellite data.
 *
 * Server-side only — used in Next.js API routes.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

let ee: any = null;
let initialized = false;
let initPromise: Promise<any> | null = null;

/** Check if GEE credentials are configured */
export function isGEEConfigured(): boolean {
  return !!(
    process.env.GEE_SERVICE_ACCOUNT_KEY && process.env.GEE_PROJECT_ID
  );
}

/**
 * Initialize the Earth Engine client (singleton).
 * Returns the `ee` module ready for use.
 */
export async function getEE(): Promise<any> {
  if (initialized && ee) return ee;
  if (initPromise) return initPromise;

  if (!isGEEConfigured()) {
    throw new Error(
      "GEE not configured. Set GEE_SERVICE_ACCOUNT_KEY and GEE_PROJECT_ID in .env.local"
    );
  }

  initPromise = (async () => {
    // Dynamic import keeps this server-only and avoids bundling issues
    const eeModule = await import("@google/earthengine");
    ee = eeModule.default || eeModule;

    const key = JSON.parse(process.env.GEE_SERVICE_ACCOUNT_KEY!);

    await new Promise<void>((resolve, reject) => {
      ee.data.authenticateViaPrivateKey(
        key,
        () => {
          ee.initialize(
            null,
            null,
            () => {
              initialized = true;
              console.log("[GEE] Initialized successfully");
              resolve();
            },
            (err: any) =>
              reject(new Error(`GEE initialize failed: ${err}`))
          );
        },
        (err: any) => reject(new Error(`GEE auth failed: ${err}`))
      );
    });

    return ee;
  })();

  return initPromise;
}

/**
 * Promisified evaluate() for any Earth Engine object.
 * Converts the EE callback API to async/await.
 */
export function evaluate<T>(eeObj: any): Promise<T> {
  return new Promise((resolve, reject) => {
    eeObj.evaluate((result: T, error: any) => {
      if (error) reject(new Error(String(error)));
      else resolve(result);
    });
  });
}

/**
 * Create an ee.Geometry.Rectangle for the South Sudan corridor.
 * Bounding box: 5.5°N–8.2°N, 30.0°E–33.5°E
 */
export function getSouthSudanRegion(eeRef: any) {
  return eeRef.Geometry.Rectangle([30.0, 5.5, 33.5, 8.2]);
}

/**
 * Create a FeatureCollection grid of points for sampling.
 * Each point has gridLat/gridLng properties for later reconstruction.
 */
export function createSamplingGrid(eeRef: any, step: number = 0.1) {
  const features: any[] = [];
  for (let lat = 5.55; lat < 8.2; lat += step) {
    for (let lng = 30.05; lng < 33.5; lng += step) {
      const roundedLat = Math.round(lat * 100) / 100;
      const roundedLng = Math.round(lng * 100) / 100;
      features.push(
        eeRef.Feature(eeRef.Geometry.Point([roundedLng, roundedLat]), {
          gridLat: roundedLat,
          gridLng: roundedLng,
        })
      );
    }
  }
  return eeRef.FeatureCollection(features);
}
