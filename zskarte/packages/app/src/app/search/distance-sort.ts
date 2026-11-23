import { IZsGlobalSearchConfig } from '@zskarte/types';

/**
 * Without any other filter, results are sorted by distance to the map centre. Only then the search
 * request carries the map box, and the server sorts by that centre instead of its fixed fallback point.
 */
export const sortByDistanceIfUnfiltered = (config: IZsGlobalSearchConfig): IZsGlobalSearchConfig => {
  const hasFilter = config.filterMapSection || config.filterByDistance || config.filterByArea;
  if (hasFilter || config.sortedByDistance) return config;
  return { ...config, sortedByDistance: true };
};
