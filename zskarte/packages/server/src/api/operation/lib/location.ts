import _ from 'lodash';

export type LongLat = { long: number; lat: number };

/** A position is either cleared (empty body) or a longitude and a latitude that are both numbers. */
export const isValidLocation = (body: Partial<LongLat> | undefined): boolean =>
  _.isEmpty(body) || (typeof body.long === 'number' && typeof body.lat === 'number');
