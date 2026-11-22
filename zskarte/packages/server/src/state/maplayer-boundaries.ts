import { Core } from '@strapi/strapi';
import { MapLayer, MapLayerTypes } from '../definitions';
import { join } from 'node:path';
import { unlink } from 'node:fs/promises';
import AdmZip from 'adm-zip';
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';
import { CANTON_NAMES, Folder, Media, downloadIfChanged, formatForIfModifiedSince, renderUrlTemplate, updateOrCreateMedia, findLayerAndMedia, extractFilesToNewZip } from './maplayer-shared';

export async function insertOrUpdateBoundariesMapLayer(
  mapLayer: Partial<MapLayer>,
  boundariesLayerName: string,
  sourceMedia: Media,
  styleMedia: Media,
) {
  const mapLayerData = {
    label: boundariesLayerName,
    type: MapLayerTypes.SHAPE,
    //media is referenced by id not documentId
    media_source: sourceMedia.id,
    public: true,
    options: {
      hidden: false,
      opacity: 1,
      styleUrl: styleMedia?.url,
      searchable: true,
      attribution: [['swisstopo', 'https://www.swisstopo.admin.ch/de/home.html']],
      styleFormat: 'mapbox',
      styleSourceName: 'swissBOUNDARIES3D',
      styleSourceType: 'url',
      searchRegExPatterns: [['(?<NAME>\\p{L}+(?:[ -]\\p{L}+)*)', 'u']],
      searchResultLabelMask: '${NAME}',
      searchResultGroupingFilterFields: [],
    },
  };
  //always set/update all fields to make sure changes in the config/template here are always updated.
  if (mapLayer) {
    return await strapi.documents('api::map-layer.map-layer').update({
      documentId: mapLayer.documentId,
      data: mapLayerData,
    });
  } else {
    return await strapi.documents('api::map-layer.map-layer').create({
      data: mapLayerData,
    });
  }
}

export async function downloadAndExtractSwissBoundaries(params: {
  url: string;
  lastModified: string;
  tmpDir: string;
  cantonFile: string;
  districtFile: string;
}) {
  const response = await downloadIfChanged(params.url, params.lastModified);
  if (response.buffer) {
    //extract corresponding files from zip and save temporarly (required for upload Service)
    const zip = new AdmZip(response.buffer);

    let cantonSuccess = false;
    let districtSuccess = false;

    //extract canton shape files
    let fullTmpPath = join(params.tmpDir, params.cantonFile);
    const cantonAreas = await extractFilesToNewZip(zip, 'swissBOUNDARIES3D_1_5_TLM_KANTONSGEBIET', fullTmpPath);
    if (cantonAreas) {
      cantonSuccess = true;
    }

    //extract district shape files
    fullTmpPath = join(params.tmpDir, params.districtFile);
    const districtAreas = await extractFilesToNewZip(zip, 'swissBOUNDARIES3D_1_5_TLM_BEZIRKSGEBIET', fullTmpPath);
    if (districtAreas) {
      districtSuccess = true;
    }
    return { cantonSuccess, districtSuccess, downloaded: true };
  } else {
    return response;
  }
}

export async function updateSwissBoundaries(
  strapi: Core.Strapi,
  url_template: string,
  boundariesFolder: Folder,
  styleMedia: Media,
  callWorker: <T>(func: string, params: any) => Promise<T>,
) {
  try {
    const tmpDir: string = strapi.config.get('server.tmpDir') || '/tmp';
    let cantonAreasMedia: Media;
    let districtAreasMedia: Media;
    let lastModified: string;
    let year = new Date().getFullYear();
    let monthNo = new Date().getMonth() + 1;
    while (!cantonAreasMedia) {
      const month = ('0' + monthNo).slice(-2);
      //check for canton shape files
      const url = renderUrlTemplate(url_template, { year, month });
      const fileNameCanton = `swissBOUNDARIES3D_KANTONSGEBIET_${year}_${month}.zip`;
      const cantonLayerName = 'Kantonsgrenzen';
      let cantonMapLayer: Partial<MapLayer>;
      ({ mapLayer: cantonMapLayer, media: cantonAreasMedia } = await findLayerAndMedia(
        cantonLayerName,
        MapLayerTypes.SHAPE,
        fileNameCanton,
        boundariesFolder,
      ));
      lastModified = formatForIfModifiedSince(cantonAreasMedia?.updatedAt);

      //check for district shape files
      const fileNameDistrict = `swissBOUNDARIES3D_BEZIRKSGEBIET_${year}_${month}.zip`;

      const districtLayerName = 'Bezirksgrenzen';
      let districtMapLayer: Partial<MapLayer>;
      ({ mapLayer: districtMapLayer, media: districtAreasMedia } = await findLayerAndMedia(
        districtLayerName,
        MapLayerTypes.SHAPE,
        fileNameDistrict,
        boundariesFolder,
      ));
      lastModified = lastModified || formatForIfModifiedSince(cantonAreasMedia?.updatedAt);

      const cantonFile = `strapi-${Date.now()}-${Math.random().toString(36).slice(2)}-${fileNameCanton}`;
      const districtFile = `strapi-${Date.now()}-${Math.random().toString(36).slice(2)}-${fileNameDistrict}`;
      const response = await callWorker<{
        status?: number;
        lastModified?: string;
        age?: string;
        cantonSuccess?: boolean;
        districtSuccess?: boolean;
        downloaded?: boolean;
      }>('downloadAndExtractSwissBoundaries', { url, lastModified, tmpDir, cantonFile, districtFile });
      if (response.downloaded) {
        strapi.log.info(`updateSwissBoundaries: new data loaded from ${url}`);
        let fullTmpPath = join(tmpDir, cantonFile);
        try {
          if (response.cantonSuccess) {
            cantonAreasMedia = await updateOrCreateMedia(strapi, boundariesFolder, fileNameCanton, fullTmpPath);
            strapi.log.info(`updateSwissBoundaries: media ${fileNameCanton} saved: ${cantonAreasMedia.id}`);
          }
        } finally {
          await unlink(fullTmpPath).catch((err) => {
            strapi.log.warn(`updateSwissBoundaries: remove temp file failed: "${fullTmpPath}", ${err}`);
          });
        }

        //extract district shape files
        fullTmpPath = join(tmpDir, districtFile);
        try {
          if (response.districtSuccess) {
            districtAreasMedia = await updateOrCreateMedia(strapi, boundariesFolder, fileNameDistrict, fullTmpPath);
            strapi.log.info(`updateSwissBoundaries: media ${fileNameDistrict} saved: ${districtAreasMedia.id}`);
          }
        } finally {
          await unlink(fullTmpPath).catch((err) => {
            strapi.log.warn(`updateSwissBoundaries: remove temp file failed: "${fullTmpPath}", ${err}`);
          });
        }
      } else if (response.status === 304) {
        strapi.log.info(
          `updateSwissBoundaries: content ${year}_${month} not changed since: ${response.lastModified} / age: ${response.age}`,
        );
      } else if (response.status === 404) {
        strapi.log.info(`updateSwissBoundaries: ${year}_${month} file not found ${url}`);
      } else {
        throw new Error(`${url}: HTTP ${response.status}`);
      }
      if (!cantonAreasMedia) {
        monthNo -= 1;
        if (monthNo <= 0) {
          year -= 1;
          if (year < 2025) {
            return;
          }
        }
      } else {
        const savedLayer = await insertOrUpdateBoundariesMapLayer(
          cantonMapLayer,
          cantonLayerName,
          cantonAreasMedia,
          styleMedia,
        );
        strapi.log.info(
          `updateSwissBoundaries canton: maplayer "${cantonLayerName}" ${cantonMapLayer ? 'updated' : 'saved'}: ${savedLayer.id}`,
        );
        if (districtAreasMedia) {
          const savedLayer = await insertOrUpdateBoundariesMapLayer(
            districtMapLayer,
            districtLayerName,
            districtAreasMedia,
            styleMedia,
          );
          strapi.log.info(
            `updateSwissBoundaries district: maplayer "${districtLayerName}" ${districtMapLayer ? 'updated' : 'saved'}: ${savedLayer.id}`,
          );
        }
      }
    }
    return { cantonAreasMedia, districtAreasMedia };
  } catch (error) {
    strapi.log.error(`updateSwissBoundaries: error ${error.stack ?? error}`);
    return null;
  }
}

export function getCantonFeature(cantonAreasGeoJSON: FeatureCollection, canton: string) {
  if (!cantonAreasGeoJSON) {
    return null;
  }
  const cantonName = CANTON_NAMES[canton];
  return cantonAreasGeoJSON.features.find((feature) => feature.properties?.NAME === cantonName) as Feature<
    Polygon | MultiPolygon
  >;
}

export function getDistrictFeatures(cantonFeature: Feature, districtAreasGeoJSON: FeatureCollection) {
  if (!cantonFeature || !districtAreasGeoJSON) {
    return null;
  }
  const cantonNo = cantonFeature.properties?.KANTONSNUM;
  return districtAreasGeoJSON.features.filter((feature) => feature.properties?.KANTONSNUM === cantonNo) as Feature<
    Polygon | MultiPolygon
  >[];
}
