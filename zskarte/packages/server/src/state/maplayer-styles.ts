import { Core } from '@strapi/strapi';
import { basename } from 'node:path';
import { existsSync } from 'node:fs';
import { Folder, findOrCreateFolder, updateOrCreateMedia } from './maplayer-shared';

export async function prepareMediaFolders(strapi: Core.Strapi) {
  const parentFolder = await findOrCreateFolder(strapi, 'MapLayer');
  const entrancesFolder = await findOrCreateFolder(strapi, 'entrances', parentFolder);
  const boundariesFolder = await findOrCreateFolder(strapi, 'swissBOUNDARIES3D', parentFolder);
  const namesFolder = await findOrCreateFolder(strapi, 'swissNAMES3D', parentFolder);
  return { entrancesFolder, boundariesFolder, namesFolder };
}

export async function uploadStyleIfMissing(strapi: Core.Strapi, folder: Folder, fileLocation: string) {
  const mediaFileName = basename(fileLocation);
  let media = await strapi.documents('plugin::upload.file').findFirst({
    filters: { name: mediaFileName, folder: { documentId: { $eq: folder.documentId } } },
  });
  if (!media) {
    if (existsSync(fileLocation)) {
      media = await updateOrCreateMedia(strapi, folder, mediaFileName, fileLocation);
    }
  }
  return media;
}

export async function prepareStyleMedias(
  strapi: Core.Strapi,
  entrancesFolder: Folder,
  boundariesFolder: Folder,
  namesFolder: Folder,
) {
  const entrancesStyle = await uploadStyleIfMissing(strapi, entrancesFolder, './init/entrances-mapboxstyle.json');
  const boundariesStyle = await uploadStyleIfMissing(
    strapi,
    boundariesFolder,
    './init/swissBOUNDARIES3D-mapboxstyle.json',
  );
  const namesStyle = await uploadStyleIfMissing(strapi, namesFolder, './init/swissNAMES3D_PLY-mapboxstyle.json');
  return { entrancesStyle, boundariesStyle, namesStyle };
}

export async function configureDefaultStyleMedias(strapi: Core.Strapi, config: any) {
  const { entrancesFolder, boundariesFolder, namesFolder } = await prepareMediaFolders(strapi);
  const { entrancesStyle, boundariesStyle, namesStyle } = await prepareStyleMedias(
    strapi,
    entrancesFolder,
    boundariesFolder,
    namesFolder,
  );
  let allMediasAvailable = true;
  const configUpdate: any = {};
  if (!config.style_entrances) {
    if (entrancesStyle) {
      configUpdate.style_entrances = entrancesStyle.id;
      config.style_entrances = entrancesStyle;
    } else {
      allMediasAvailable = false;
    }
  }
  if (!config.style_swissBOUNDARIES3D) {
    if (boundariesStyle) {
      configUpdate.style_swissBOUNDARIES3D = boundariesStyle.id;
      config.style_swissBOUNDARIES3D = boundariesStyle;
    } else {
      allMediasAvailable = false;
    }
  }
  if (!config.style_swissNAMES3D) {
    if (namesStyle) {
      configUpdate.style_swissNAMES3D = namesStyle.id;
      config.style_swissNAMES3D = namesStyle;
    } else {
      allMediasAvailable = false;
    }
  }
  await strapi.documents('api::map-layer-generation-config.map-layer-generation-config').update({
    documentId: config.documentId,
    data: configUpdate,
  });
  return allMediasAvailable;
}
