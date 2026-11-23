import { Core } from '@strapi/strapi';
import { MapLayer, MapLayerTypes } from '../definitions';
import { join } from 'node:path';
import { unlink } from 'node:fs/promises';
import { DateTimeValue } from '@strapi/types/dist/schema/attribute';
import AdmZip from 'adm-zip';
import proj4 from 'proj4';
import type { Feature, Polygon, MultiPolygon } from 'geojson';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { inferSchema, initParser } from 'udsv';
import { swissNAMES3D_fieldX, swissNAMES3D_fieldY, Folder, Media, SwissNamesRow, getMediaFetchUrl, downloadIfChanged, formatForIfModifiedSince, renderUrlTemplate, updateOrCreateMedia, findLayerAndMedia, exportToCSV } from './maplayer-shared';

export async function downloadAndExtractSwissNamesNational(params: {
  url: string;
  lastModified: string;
  tmpDir: string;
  namesFileName: string;
  nationalFileName: string;
}) {
  let success = false;
  const response = await downloadIfChanged(params.url, params.lastModified);
  if (response.buffer) {
    //extract corresponding file from zip and save temporarly (required for upload Service)
    const zip = new AdmZip(response.buffer);
    const targetEntry = zip.getEntry(`${params.namesFileName}.csv`);
    if (!targetEntry) {
      throw new Error(`updateSwissNamesNational: swissNAMES3D zip have no "${params.namesFileName}.csv"`);
    }
    const fileSize = targetEntry.header.size;
    success = zip.extractEntryTo(targetEntry, params.tmpDir, false, true, false, params.nationalFileName);
    return { success, fileSize };
  } else {
    return response;
  }
}

export async function updateSwissNamesNational(
  strapi: Core.Strapi,
  url_template: string,
  namesFolder: Folder,
  namesFileName: string,
  styleMedia: Media,
  callWorker: <T>(func: string, params: any) => Promise<T>,
) {
  try {
    const tmpDir: string = strapi.config.get('server.tmpDir') || '/tmp';
    let media: Media;
    let year = new Date().getFullYear();
    while (!media) {
      //check swissNAMES3D file
      const url = renderUrlTemplate(url_template, { year });
      const fileName = `${namesFileName}_${year}.csv`;
      const namesLayerName = `${namesFileName} Siedlungsgebiete (Ganze Schweiz)`;
      let mapLayer: Partial<MapLayer>;
      ({ mapLayer, media } = await findLayerAndMedia(namesLayerName, MapLayerTypes.CSV, fileName, namesFolder));
      const lastModified = formatForIfModifiedSince(media?.updatedAt);
      const nationalFileName = `strapi-${Date.now()}-${Math.random().toString(36).slice(2)}-${fileName}`;
      const response = await callWorker<{
        status?: number;
        lastModified?: string;
        age?: string;
        success?: boolean;
        fileSize?: number;
      }>('downloadAndExtractSwissNamesNational', { url, lastModified, tmpDir, namesFileName, nationalFileName });
      if (response.fileSize) {
        const fullTmpPath = join(tmpDir, nationalFileName);
        if (!response.success) {
          strapi.log.error(`updateSwissNamesNational: extract "${namesFileName}.csv" to "${fullTmpPath}" failed`);
          return;
        }
        try {
          media = await updateOrCreateMedia(strapi, namesFolder, fileName, fullTmpPath, response.fileSize);
          strapi.log.info(`updateSwissNamesNational: media "${fileName}" saved: ${media.id}`);
        } finally {
          await unlink(fullTmpPath).catch((err) => {
            strapi.log.warn(`updateSwissNamesNational: remove temp file failed: "${fullTmpPath}", ${err}`);
          });
        }
      } else if (response.status === 304) {
        strapi.log.info(`updateSwissNamesNational: content ${year} not changed since: ${response.lastModified}`);
      } else if (response.status === 404) {
        strapi.log.debug(`updateSwissNamesNational: ${year} file not found ${url}`);
      } else {
        throw new Error(`${url}: HTTP ${response.status}`);
      }
      if (media) {
        const savedLayer = await insertOrUpdateSwissNamesMapLayer(mapLayer, namesLayerName, media, styleMedia);
        strapi.log.info(
          `updateSwissNamesNational: maplayer "${namesLayerName}" ${mapLayer ? 'updated' : 'saved'}: ${savedLayer.id}`,
        );
      } else {
        year -= 1;
        if (year < 2025) {
          return;
        }
      }
    }
    return media;
  } catch (error) {
    strapi.log.error(`updateSwissNamesNational: error ${error.stack ?? error}`);
    return null;
  }
}

export async function prepareSwissNamesContent(params: { namesMediaUrl: string; fieldsToKeep: string[] }): Promise<
  SwissNamesRow[]
> {
  const coordConverter = proj4('EPSG:2056', 'EPSG:4326');
  return fetch(params.namesMediaUrl)
    .then((response) => response.text())
    .then((csvContent) => {
      const schema = inferSchema(csvContent);
      const parser = initParser(schema);
      const csvLines = parser
        .typedObjs(csvContent)
        .filter(
          (row) =>
            !(
              isNaN(row[swissNAMES3D_fieldX]) ||
              isNaN(row[swissNAMES3D_fieldY]) ||
              (row[swissNAMES3D_fieldX] === 0 && row[swissNAMES3D_fieldY] === 0)
            ),
        )
        .map((row) => {
          const x = parseFloat(row[swissNAMES3D_fieldX]);
          const y = parseFloat(row[swissNAMES3D_fieldY]);
          const newRow: SwissNamesRow = {};
          for (const field of params.fieldsToKeep) {
            newRow[field] = row[field];
          }
          //shpjs does a automatic reprojection to EPSG:4326 - WGS84, the original was EPSG:2056 – CH1903+ / LV95 (as defined in prj file)
          //to allow compare need to reproject namesContent also
          newRow.coord = coordConverter.forward([x, y]);
          return newRow;
        });
      return csvLines;
    });
}

export async function insertOrUpdateSwissNamesMapLayer(
  mapLayer: Partial<MapLayer>,
  namesLayerName: string,
  sourceMedia: Media,
  styleMedia: Media,
) {
  const mapLayerData = {
    label: namesLayerName,
    type: MapLayerTypes.CSV,
    //media is referenced by id not documentId
    media_source: sourceMedia.id,
    public: true,
    options: {
      fieldX: swissNAMES3D_fieldX,
      fieldY: swissNAMES3D_fieldY,
      hidden: false,
      opacity: 1,
      styleUrl: styleMedia?.url,
      attribution: [['swisstopo', 'https://www.swisstopo.admin.ch/de/home.html']],
      delimiter: ';',
      searchable: true,
      styleFormat: 'mapbox',
      dataProjection: 'EPSG:2056',
      styleSourceName: 'swissNAMES3D',
      styleSourceType: 'url',
      filterRegExPattern: [
        ['OBJEKTKLASSE_TLM', 'TLM_SIEDLUNGSNAME', ''],
        ['EINWOHNERKATEGORIE', '.*(?<!< 20)', ''],
      ],
      searchRegExPatterns: [
        ['(?<NAME>.+)', 'u'],
        ['(?<NAME>.+) \\((?<OBJEKTART>.+)\\)', 'u'],
      ],
      searchResultLabelMask: '${NAME} (${OBJEKTART})',
      searchResultGroupingFilterFields: [],
    },
  };
  if (mapLayer) {
    //always set/update all fields to make sure changes in the config/template here are always updated.
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

export async function extractSwissNamesCanton(
  params: {
    tmpDir: string;
    cantonFileName: string;
    fieldsToKeep: string[];
    namesMediaUrl: string;
    cantonFeature: Feature<Polygon | MultiPolygon>;
  },
  nameCache: { names: SwissNamesRow[] },
) {
  let success = false;
  const fullTmpPath = join(params.tmpDir, params.cantonFileName);

  let names = nameCache.names;
  if (!names) {
    names = await prepareSwissNamesContent(params);
    nameCache.names = names;
  }

  const filtered = names.filter((obj) => booleanPointInPolygon(obj.coord, params.cantonFeature));
  if (filtered.length > 0) {
    await exportToCSV(params.fieldsToKeep, filtered, fullTmpPath);
    success = true;
  }

  return { success };
}

export async function updateSwissNames(
  strapi: Core.Strapi,
  canton: string,
  mediaFolder: Folder,
  styleMedia: Media,
  namesMediaUpdatedAt: DateTimeValue,
  namesMedia: Media,
  cantonFeature: Feature<Polygon | MultiPolygon>,
  filePrefix: string,
  fieldsToKeep: string[],
  callWorker: <T>(func: string, params: any) => Promise<T>,
) {
  try {
    const namesLayerName = `${filePrefix} Siedlungsgebiete (${canton})`;
    const fileName = `${filePrefix}_removed_cols_${canton}.csv`;
    let { mapLayer, media } = await findLayerAndMedia(namesLayerName, MapLayerTypes.CSV, fileName, mediaFolder);
    const lastModified = media?.updatedAt;

    if (!lastModified || lastModified < namesMediaUpdatedAt) {
      const tmpDir: string = strapi.config.get('server.tmpDir') || '/tmp';
      const cantonFileName = `strapi-${Date.now()}-${Math.random().toString(36).slice(2)}-${fileName}`;
      const namesMediaUrl = getMediaFetchUrl(namesMedia);

      const response = await callWorker<{ success: boolean }>('extractSwissNamesCanton', {
        tmpDir,
        cantonFileName,
        fieldsToKeep,
        namesMediaUrl,
        cantonFeature,
      });
      if (response.success) {
        const fullTmpPath = join(tmpDir, cantonFileName);
        try {
          media = await updateOrCreateMedia(strapi, mediaFolder, fileName, fullTmpPath);
          strapi.log.info(`updateSwissNames for ${canton}: media ${fileName} saved: ${media.id}`);
        } finally {
          await unlink(fullTmpPath).catch(() => {
            strapi.log.warn(`updateSwissNames for ${canton}: remove temp file failed: "${fullTmpPath}"`);
          });
        }
      } else {
        strapi.log.error(`updateSwissNames for ${canton}: swissNAMES no data after geo filtering`);
      }
    } else {
      strapi.log.info(`updateSwissNames for ${canton}: swissNAMES not changed since: ${namesMediaUpdatedAt}`);
    }
    if (media) {
      const savedLayer = await insertOrUpdateSwissNamesMapLayer(mapLayer, namesLayerName, media, styleMedia);
      strapi.log.info(
        `updateSwissNames for ${canton}: maplayer "${namesLayerName}" ${mapLayer ? 'updated' : 'saved'}: ${savedLayer.id}`,
      );
    }
  } catch (error) {
    strapi.log.error(`updateSwissNames for ${canton}: error ${error.stack ?? error}`);
  }
}
