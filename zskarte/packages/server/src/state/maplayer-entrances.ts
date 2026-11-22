import { Core } from '@strapi/strapi';
import { MapLayer, MapLayerTypes } from '../definitions';
import { join } from 'node:path';
import { unlink, writeFile } from 'node:fs/promises';
import { DateTimeValue } from '@strapi/types/dist/schema/attribute';
import AdmZip from 'adm-zip';
import proj4 from 'proj4';
import type { FeatureCollection, Feature, Polygon, MultiPolygon } from 'geojson';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { ENTRANCE_NEED_SPLIT_SIZE, ENTRANCE_TO_BIG_SIZE, Folder, Media, FeatureCollectionWithCRS, getMediaFetchUrl, downloadIfChanged, formatForIfModifiedSince, renderUrlTemplate, updateOrCreateMedia, findLayerAndMedia } from './maplayer-shared';

export async function insertOrUpdateEntrancesMapLayer(
  mapLayer: Partial<MapLayer>,
  entrancesLayerName: string,
  sourceMedia: Media,
  styleMedia: Media,
) {
  const mapLayerData = {
    label: entrancesLayerName,
    type: MapLayerTypes.GEOJSON,
    //media is referenced by id not documentId
    media_source: sourceMedia.id,
    public: true,
    options: {
      hidden: false,
      opacity: 1,
      styleUrl: styleMedia?.url,
      searchable: true,
      attribution: [
        [
          'Bundesamt für Statistik; Eidg. Gebäude- und Wohnungsregister',
          'https://www.housing-stat.ch/de/madd/public.html',
        ],
      ],
      styleFormat: 'mapbox',
      styleSourceName: 'entrances',
      styleSourceType: 'url',
      searchRegExPatterns: [
        [
          '(?<streetName>\\p{L}+(?:[ -]\\p{L}+)*) (?<entranceNumber>\\d+ ?\\p{L}?),? (?<zip>\\d\\d\\d\\d) (?<locality>\\p{L}+(?: \\p{L}+)*)',
          'u',
        ],
        [
          '(?<streetName>\\p{L}+(?:[ -]\\p{L}+)*) (?<entranceNumber>\\d+ ?\\p{L}?),? (?<locality>\\p{L}+(?: \\p{L}+)*)',
          'u',
        ],
        ['(?<streetName>\\p{L}+(?:[ -]\\p{L}+)*) (?<entranceNumber>\\d+ ?\\p{L}?),? (?<zip>\\d{1,4})', 'u'],
        ['(?<streetName>\\p{L}+(?:[ -]\\p{L}+)*) (?<entranceNumber>\\d+\\p{L}?)', 'u'],
        ['(?<streetName>\\p{L}+(?:[ -]\\p{L}+)*),? (?<locality>\\p{L}+(?:[ .-]\\p{L}+)*?)', 'u'],
        ['(?<streetName>\\p{L}+(?:[ -]\\p{L}+)*)', 'u'],
        ['(?<entranceNumber>\\d+ ?\\p{L}?),? (?<zip>\\d\\d\\d\\d) (?<locality>\\p{L}+(?:[ .-]\\p{L}+)*)', 'u'],
        ['(?<entranceNumber>\\d+ ?\\p{L}?),? (?<locality>\\p{L}+(?:[ .-]\\p{L}+)*)', 'u'],
      ],
      searchResultLabelMask: '${streetName} ${entranceNumber}, ${zip} ${locality}',
      searchResultGroupingFilterFields: ['zip', 'locality', 'streetName'],
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

export async function extractEntranceDistrict(
  params: { district: Feature<Polygon | MultiPolygon>; cantonFile: string; tmpDir: string; districtFile: string },
  fileCache: Map<string, FeatureCollection>,
) {
  let coordConverter: proj4.Converter;
  let geojson: FeatureCollectionWithCRS = fileCache.get(params.cantonFile);
  if (!geojson) {
    if (!params.cantonFile.startsWith('http')) {
      throw new Error("cantonFile is a local one but it's not in cache");
    }
    const response = await fetch(params.cantonFile);
    geojson = (await response.json()) as FeatureCollection;
  }
  const match = geojson.crs?.properties?.name?.match(/(\d+)\s*$/);
  if (match) {
    coordConverter = proj4('EPSG:' + match[1], 'EPSG:4326');
  } else {
    //default in new RFC‑7946 is no crs and data in EPSG:4326 -> no conversion required
    coordConverter = { forward: (c) => c, inverse: (c) => c };
  }

  const newCollection: FeatureCollectionWithCRS = {
    type: 'FeatureCollection',
    features: geojson.features.filter(
      (feature) =>
        feature.geometry.type === 'Point' &&
        booleanPointInPolygon(coordConverter.forward(feature.geometry.coordinates), params.district),
    ),
  };
  if (geojson.crs) {
    newCollection.crs = geojson.crs;
  }
  let districtSuccess = false;
  if (newCollection.features.length > 0) {
    const fullTmpPath = join(params.tmpDir, params.districtFile);
    await writeFile(fullTmpPath, JSON.stringify(newCollection), 'utf8');
    districtSuccess = true;
  }
  return { districtSuccess };
}

export async function updateEntranceDistrict(
  strapi: Core.Strapi,
  canton: string,
  mediaFolder: Folder,
  styleMedia: Media,
  allwaysCreateDistrict: boolean,
  districtFeaures: Feature<Polygon | MultiPolygon>[],
  mediaUpdatedAt: DateTimeValue | undefined,
  dataSize: number,
  cantonFile: string,
  callWorker: <T>(func: string, params: any) => Promise<T>,
) {
  const tmpDir: string = strapi.config.get('server.tmpDir') || '/tmp';
  const fileNeedSplit = dataSize > ENTRANCE_NEED_SPLIT_SIZE;
  if (allwaysCreateDistrict || fileNeedSplit) {
    if (!districtFeaures || districtFeaures.length < 2) {
      strapi.log.info(
        `updateEntranceDistrict for ${canton}: no district splitting (have ${districtFeaures?.length} definitions)`,
      );
      return;
    }
    strapi.log.info(`updateEntranceDistrict for ${canton}: start`);

    for (const district of districtFeaures) {
      try {
        const districtName = district.properties.NAME;
        strapi.log.info(`updateEntranceDistrict for ${canton}: start ${districtName}`);
        const entrancesDistrictLayerName = `Hausnummern / Addressuche (${canton}: ${districtName})`;
        const districtFileName = `entrances_${canton}_${districtName.replace(/[^a-zA-Z]/g, '_')}.geojson`;
        let { mapLayer: districtMapLayer, media: districtMedia } = await findLayerAndMedia(
          entrancesDistrictLayerName,
          MapLayerTypes.GEOJSON,
          districtFileName,
          mediaFolder,
        );
        if (!districtMedia || !mediaUpdatedAt || districtMedia.updatedAt < mediaUpdatedAt) {
          const districtFile = `strapi-${Date.now()}-${Math.random().toString(36).slice(2)}-${districtFileName}`;
          const response = await callWorker<{ districtSuccess?: boolean }>('extractEntranceDistrict', {
            district,
            cantonFile,
            tmpDir,
            districtFile,
          });
          if (response.districtSuccess) {
            const fullTmpPath = join(tmpDir, districtFile);
            try {
              districtMedia = await updateOrCreateMedia(strapi, mediaFolder, districtFileName, fullTmpPath);
              strapi.log.info(
                `updateEntranceDistrict for ${canton} / ${districtName}: media ${districtFileName} saved: ${districtMedia.id}`,
              );
            } finally {
              await unlink(fullTmpPath).catch((err) => {
                strapi.log.warn(
                  `updateEntranceDistrict for ${canton} / ${districtName}: remove temp file failed: "${fullTmpPath}", ${err}`,
                );
              });
            }
          } else {
            strapi.log.error(`updateEntranceDistrict for ${canton} / ${districtName}: no data after geo filtering`);
          }
        }

        if (districtMedia) {
          const savedLayer = await insertOrUpdateEntrancesMapLayer(
            districtMapLayer,
            entrancesDistrictLayerName,
            districtMedia,
            styleMedia,
          );
          strapi.log.info(
            `updateEntranceDistrict for ${canton} / ${districtName}: maplayer "${entrancesDistrictLayerName}" ${districtMapLayer ? 'updated' : 'saved'}: ${savedLayer.id}`,
          );
        }
        strapi.log.info(`updateEntranceDistrict for ${canton}: finished ${districtName}`);
      } catch (error) {
        strapi.log.error(error);
      }
    }
    strapi.log.info(`updateEntranceDistrict for ${canton}: finished all`);
  } else {
    strapi.log.info(`updateEntranceDistrict for ${canton}: no district splitting required`);
  }
  callWorker('extractEntranceDistrictEnd', cantonFile);
}

export async function downloadAndExtractEntrance(
  params: {
    url: string;
    lastModified: string;
    tmpDir: string;
    canton: string;
    cantonFile: string;
    allwaysCreateDistrict: boolean;
    districtFile: string;
  },
  fileCache: Map<string, FeatureCollection>,
) {
  const response = await downloadIfChanged(params.url, params.lastModified);
  if (response.buffer) {
    //extract corresponding file from zip and save temporarly (required for upload Service)
    const zip = new AdmZip(response.buffer);
    const targetEntry = zip.getEntry('entrances.geojson');
    if (!targetEntry) {
      throw new Error(`updateEntrance for ${params.canton}: MADD zip have no entrances.geojson`);
    }

    let cantonSuccess = false;
    const fileToBig = targetEntry.header.size > ENTRANCE_TO_BIG_SIZE;
    if (!fileToBig) {
      //only save full canton file as media & layer if not to big
      const success = zip.extractEntryTo(targetEntry, params.tmpDir, false, true, false, params.cantonFile);
      if (success) {
        cantonSuccess = true;
      }
    }
    const fileNeedSplit = targetEntry.header.size > ENTRANCE_NEED_SPLIT_SIZE;
    if (params.allwaysCreateDistrict || fileNeedSplit) {
      const geojsonText = targetEntry.getData().toString('utf8');
      const fullTmpPath = join(params.tmpDir, params.cantonFile);
      fileCache.set(fullTmpPath, JSON.parse(geojsonText) as FeatureCollection);
    }

    return { fileToBig, cantonSuccess, fileSize: targetEntry.header.size };
  } else {
    return response;
  }
}

export async function updateEntrance(
  strapi: Core.Strapi,
  url_template: string,
  canton: string,
  mediaFolder: Folder,
  styleMedia: Media,
  allwaysCreateDistrict: boolean,
  districtFeaures: Feature<Polygon | MultiPolygon>[],
  callWorker: <T>(func: string, params: any) => Promise<T>,
) {
  try {
    const entrancesLayerName = `Hausnummern / Addressuche (${canton})`;
    const fileName = `entrances_${canton}.geojson`;
    let { mapLayer, media } = await findLayerAndMedia(entrancesLayerName, MapLayerTypes.GEOJSON, fileName, mediaFolder);
    const lastModified = formatForIfModifiedSince(media?.updatedAt);
    //For files bigger than ENTRANCE_TO_BIG_SIZE it always download the file, as it have no lastModified information to compare.
    //But as the MADD data changes daily in normal case it's loaded anyway.

    const url = renderUrlTemplate(url_template, { canton: canton.toLowerCase() });
    const tmpDir: string = strapi.config.get('server.tmpDir') || '/tmp';
    const cantonFile = `strapi-${Date.now()}-${Math.random().toString(36).slice(2)}-${fileName}`;
    const fullTmpPath = join(tmpDir, cantonFile);
    let districtUpdated = false;
    const response = await callWorker<{
      status?: number;
      lastModified?: string;
      age?: string;
      fileToBig: boolean;
      cantonSuccess?: boolean;
      fileSize?: number;
    }>('downloadAndExtractEntrance', { url, lastModified, tmpDir, canton, cantonFile });
    if (response.fileSize) {
      strapi.log.info(`updateEntrance for ${canton}: new media loaded from ${url}`);
      //extract corresponding file from zip and save temporarly (required for upload Service)
      await updateEntranceDistrict(
        strapi,
        canton,
        mediaFolder,
        styleMedia,
        allwaysCreateDistrict,
        districtFeaures,
        media?.updatedAt || (response.lastModified ? new Date(response.lastModified) : null),
        response.fileSize,
        fullTmpPath,
        callWorker,
      );

      districtUpdated = true;
      if (!response.fileToBig) {
        try {
          if (!response.cantonSuccess) {
            strapi.log.error(`updateEntrance for ${canton}: extract entrances.geojson to "${fullTmpPath}" failed`);
            return;
          }
          strapi.log.info(`updateEntrance for ${canton}: entrances.geojson extracted`);

          media = await updateOrCreateMedia(strapi, mediaFolder, fileName, fullTmpPath, response.fileSize);
          strapi.log.info(`updateEntrance for ${canton}: media ${fileName} saved: ${media.id}`);
        } finally {
          await unlink(fullTmpPath).catch((err) => {
            strapi.log.warn(`updateEntrance for ${canton}: remove temp file failed: "${fullTmpPath}", ${err}`);
          });
        }
      }
    } else if (response.status === 304) {
      strapi.log.info(`updateEntrance for ${canton}: MADD content not changed since: ${response.lastModified}`);
    } else {
      throw new Error(`${url}: HTTP ${response.status}`);
    }
    if (media) {
      if (!districtUpdated) {
        await updateEntranceDistrict(
          strapi,
          canton,
          mediaFolder,
          styleMedia,
          allwaysCreateDistrict,
          districtFeaures,
          media?.updatedAt,
          media.size * 1000,
          getMediaFetchUrl(media),
          callWorker,
        );
      }

      const savedLayer = await insertOrUpdateEntrancesMapLayer(mapLayer, entrancesLayerName, media, styleMedia);
      strapi.log.info(
        `updateEntrance for ${canton}: maplayer "${entrancesLayerName}" ${mapLayer ? 'updated' : 'saved'}: ${savedLayer.id}`,
      );
    }
  } catch (error) {
    strapi.log.error(`updateEntrance for ${canton}: error ${error.stack ?? error}`);
  }
}
