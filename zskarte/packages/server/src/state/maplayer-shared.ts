import { readZipEntry } from './zip-entry';
import { Core } from '@strapi/strapi';
import { MapLayerType } from '../definitions';
import { fileTypeFromFile } from 'file-type';
import { basename } from 'node:path';
import { stat, writeFile } from 'node:fs/promises';
import { DateTimeValue } from '@strapi/types/dist/schema/attribute';
import AdmZip from 'adm-zip';
import proj4 from 'proj4';
import type { FeatureCollection } from 'geojson';
import { writeToString } from '@fast-csv/format';

proj4.defs(
  'EPSG:2056',
  '+proj=somerc +lat_0=46.95240555555556 +lon_0=7.439583333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs',
);

//mappings for canton to shape name in SwissBoundaries
export const CANTON_NAMES = {
  AG: 'Aargau',
  AI: 'Appenzell Ausserrhoden',
  AR: 'Appenzell Innerrhoden',
  BE: 'Bern',
  BL: 'Basel-Landschaft',
  BS: 'Basel-Stadt',
  FR: 'Fribourg',
  GE: 'Genève',
  GL: 'Glarus',
  GR: 'Graubünden',
  JU: 'Jura',
  LU: 'Luzern',
  NE: 'Neuchâtel',
  NW: 'Nidwalden',
  OW: 'Obwalden',
  SG: 'St. Gallen',
  SH: 'Schaffhausen',
  SO: 'Solothurn',
  SZ: 'Schwyz',
  TG: 'Thurgau',
  TI: 'Ticino',
  UR: 'Uri',
  VD: 'Vaud',
  VS: 'Valais',
  ZG: 'Zug',
  ZH: 'Zürich',
};

export const swissNAMES3D_fieldX = 'E';
export const swissNAMES3D_fieldY = 'N';

export const ENTRANCE_NEED_SPLIT_SIZE = 25_000_000;
export const ENTRANCE_TO_BIG_SIZE = 50_000_000;

export interface Folder {
  id: number | string;
  documentId: string;
  name?: string;
}

export interface Media {
  id: number | string;
  documentId: string;
  name?: string;
  url?: string;
  size?: number;
  updatedAt?: DateTimeValue;
}

export interface SwissNamesRow {
  coord?: number[];
  [key: string]: string | number | number[];
}

export type FeatureCollectionWithCRS = FeatureCollection & { crs?: { type: string; properties: { name?: string } } };

//for handle media url saved with local provider (to fetch internally)
export function getMediaFetchUrl(media: Media) {
  if (!media) {
    return null;
  }
  let url = media.url;
  if (url.startsWith('/')) {
    url = `http${process.env.HTTPS === '1' ? 's' : ''}://localhost:${strapi.config.get('server.port', 1337)}${url}`;
  }
  return url;
}

export async function findOrCreateFolder(strapi: Core.Strapi, folderName: string, parent: Folder | null = null) {
  let folder = await strapi.documents('plugin::upload.folder').findFirst({
    filters: {
      name: { $eq: folderName },
      parent: {
        documentId: { $eq: parent?.documentId ?? null },
      },
    },
    fields: ['id', 'name'],
  });

  if (!folder) {
    strapi.log.info('create new folder:', { name: folderName, parent: parent });
    const folderService = strapi.plugin('upload').service('folder');
    folder = await folderService.create({
      //folder service internally(in setPathIdAndPath) still use id not documentId
      name: folderName,
      parent: parent?.id,
    });
  }
  return folder;
}

export async function downloadIfChanged(url: string, lastModified: string) {
  const getOptions = {
    headers: lastModified ? { 'If-Modified-Since': lastModified } : {},
  };
  const response = await fetch(url, getOptions);
  if (response.status === 304) {
    return {
      lastModified: response.headers.get('last-modified'),
      age: response.headers.get('age'),
      status: response.status,
    };
  }

  if (!response.ok) {
    return { status: response.status };
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    lastModified: response.headers.get('last-modified'),
    age: response.headers.get('age'),
    status: response.status,
  };
}

export function formatForIfModifiedSince(timestamp: any) {
  if (!timestamp) return null;

  let date: Date;
  if (typeof timestamp === 'number') {
    // Unix-Timestamp (sec) → ms multiply
    date = new Date(timestamp * 1000);
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) {
    throw new Error('invalid Timestamp');
  }

  return date.toUTCString(); // → "Wed, 21 Oct 2015 07:28:00 GMT"
}

export function renderUrlTemplate(tmpl: string, data: any) {
  return tmpl.replace(/\$\{(\w+)\}/g, (_, key) => (key in data ? data[key] : ''));
}

export async function updateOrCreateMedia(
  strapi: Core.Strapi,
  folder: Folder,
  fileName: string,
  tempFilePath: string,
  size: number | undefined = undefined,
): Promise<Media> {
  const fileType = await fileTypeFromFile(tempFilePath);
  const mimetype = fileType?.mime || 'application/octet-stream';

  const fileData = {
    filepath: tempFilePath,
    originalFilename: fileName,
    mimetype: mimetype,
    size: size || (await stat(tempFilePath)).size,
  };
  //the upload service require id not documentId
  const metaData = { fileInfo: { name: fileName, folder: folder.id } };

  const existingFile = await strapi.documents('plugin::upload.file').findFirst({
    filters: { name: fileName, folder: { documentId: { $eq: folder.documentId } } },
    fields: ['id'],
  });
  const uploadService = strapi.plugin('upload').service('upload');
  if (existingFile) {
    return await uploadService.replace(existingFile.id, { data: metaData, file: fileData });
  } else {
    const result = await uploadService.upload({ data: metaData, files: fileData });
    return result[0];
  }
}

export async function findLayerAndMedia(
  layerLabel: string,
  layerType: MapLayerType,
  mediaFileName: string,
  mediaFolder: Folder,
) {
  //check existing Layer / Media for check update required
  const mapLayer = await strapi.documents('api::map-layer.map-layer').findFirst({
    filters: { type: layerType, label: layerLabel, organization: null },
    populate: ['media_source'],
  });
  let media: Media;
  if (mapLayer) {
    if (mapLayer.media_source?.name === mediaFileName) {
      media = mapLayer.media_source;
    }
  }
  if (!media) {
    media = await strapi.documents('plugin::upload.file').findFirst({
      filters: { name: mediaFileName, folder: { documentId: { $eq: mediaFolder.documentId } } },
    });
  }
  return { mapLayer, media };
}

export async function extractFilesToNewZip(inputZip: any, filterBasename: string, outputPath: string) {
  const outputZip = new AdmZip();
  let foundFiles = 0;
  for (const entry of inputZip.getEntries()) {
    if (basename(entry.entryName).startsWith(filterBasename)) {
      outputZip.addFile(entry.entryName, readZipEntry(entry), '');
      foundFiles++;
    }
  }

  if (foundFiles === 0) {
    return null;
  }

  outputZip.writeZip(outputPath);
  return outputZip;
}

export async function exportToCSV(headers: string[], data: SwissNamesRow[], filePath: string) {
  const csvContent = await writeToString(data, {
    headers,
    delimiter: ';',
  });
  await writeFile(filePath, csvContent, 'utf8');
}
