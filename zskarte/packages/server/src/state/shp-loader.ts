import shp from 'shpjs';
import type { FeatureCollection } from 'geojson';
import { assertZipWithinLimits, MAX_ZIP_TOTAL_BYTES } from './zip-entry';

const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

/**
 * Loads a shapefile from a URL. A zip is checked before it is unpacked, because shpjs unpacks it without a
 * size limit. A plain .shp file is not compressed and is passed on as before.
 */
export const loadShpFromUrl = async (
  url: string,
  maxTotalBytes = MAX_ZIP_TOTAL_BYTES,
): Promise<FeatureCollection> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`cannot load ${url}: HTTP ${response.status}`);
  const content = Buffer.from(await response.arrayBuffer());
  if (content.subarray(0, 4).equals(ZIP_SIGNATURE)) {
    assertZipWithinLimits(content, maxTotalBytes);
    return shp(content) as Promise<FeatureCollection>;
  }
  return shp(url) as Promise<FeatureCollection>;
};
