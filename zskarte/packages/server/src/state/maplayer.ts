export * from './maplayer-styles';
export * from './maplayer-swiss-names';
export * from './maplayer-boundaries';
export * from './maplayer-entrances';
export * from './maplayer-shared';
import { Core } from '@strapi/strapi';
import type { FeatureCollection } from 'geojson';
import { Worker } from 'node:worker_threads';
import { getMediaFetchUrl } from './maplayer-shared';
import { loadShpFromUrl } from './shp-loader';
import { updateEntrance } from './maplayer-entrances';
import { updateSwissBoundaries, getCantonFeature, getDistrictFeatures } from './maplayer-boundaries';
import { updateSwissNamesNational, updateSwissNames } from './maplayer-swiss-names';
import { prepareMediaFolders, configureDefaultStyleMedias } from './maplayer-styles';

/** Every canton in the list must be a code without spaces, so a space after a comma cannot hide a canton. */
export function assertCantonList(cantons: string): void {
  if (cantons.trim().split(',').some((canton) => canton.includes(' '))) {
    throw new Error('updateMapLayerMedias failed: cantons need to be splited by ","');
  }
}

export async function getAndVerifyMapLayerGenerationConfig(strapi: Core.Strapi) {
  //read and verify config
  const config = await strapi.documents('api::map-layer-generation-config.map-layer-generation-config').findFirst({
    populate: ['style_entrances', 'style_swissBOUNDARIES3D', 'style_swissNAMES3D'],
  });
  if (!config) {
    throw new Error('updateMapLayerMedias failed: no map-layer-generation-config defined');
  }
  if (!config.enabled) {
    throw new Error('updateMapLayerMedias skipped: update is disabled');
  }
  if (!config.cantons?.trim()) {
    throw new Error('updateMapLayerMedias failed: cantons to update is empty');
  }
  assertCantonList(config.cantons);

  if (!config.style_entrances || !config.style_swissBOUNDARIES3D || !config.style_swissNAMES3D) {
    //try to autofix and continue
    const allMediasAvailable = await configureDefaultStyleMedias(strapi, config);
    if (!allMediasAvailable) {
      throw new Error(
        'updateMapLayerMedias failed: style_entrances or style_swissBOUNDARIES3D or style_swissNAMES3D not set',
      );
    }
  }
  return config;
}

export async function loadShpFile(mediaUrl: string): Promise<FeatureCollection> {
  return loadShpFromUrl(mediaUrl);
}

export async function updateMapLayerMedias(strapi: Core.Strapi) {
  const { callWorker, stopWorker } = startWorker(strapi);
  let configId: string;
  try {
    const config = await getAndVerifyMapLayerGenerationConfig(strapi);
    configId = config.documentId;
    await strapi.documents('api::map-layer-generation-config.map-layer-generation-config').update({
      documentId: configId,
      data: { lastStartDate: new Date(), lastEndDate: null },
    });

    const cantonsToUpdate = config.cantons.trim().toUpperCase().split(',');

    const { entrancesFolder, boundariesFolder, namesFolder } = await prepareMediaFolders(strapi);

    //updateSwissBoundaries
    strapi.log.info('updateMapLayerMedias: start update boundaries');
    const boundaries = await updateSwissBoundaries(
      strapi,
      config.url_swissBOUNDARIES3D,
      boundariesFolder,
      config.style_swissBOUNDARIES3D,
      callWorker,
    );
    strapi.log.info('updateMapLayerMedias: finished update boundaries');

    let cantonAreasGeoJSON: FeatureCollection;
    let districtAreasGeoJSON: FeatureCollection;
    if (boundaries) {
      const { cantonAreasMedia, districtAreasMedia } = boundaries;
      cantonAreasGeoJSON = await callWorker('loadShpFile', getMediaFetchUrl(cantonAreasMedia));
      districtAreasGeoJSON = await callWorker('loadShpFile', getMediaFetchUrl(districtAreasMedia));
    }

    //updateEntrance
    strapi.log.info('updateMapLayerMedias: start updateEntrance');
    for (const canton of cantonsToUpdate) {
      try {
        strapi.log.info(`updateMapLayerMedias: start updateEntrance ${canton}`);
        const cantonFeature = getCantonFeature(cantonAreasGeoJSON, canton);
        const districtFeaures = getDistrictFeatures(cantonFeature, districtAreasGeoJSON);
        await updateEntrance(
          strapi,
          config.url_madd,
          canton,
          entrancesFolder,
          config.style_entrances,
          config.allwaysCreateDistrict,
          districtFeaures,
          callWorker,
        );
        strapi.log.info(`updateMapLayerMedias: finished updateEntrance ${canton}`);
      } catch (error) {
        strapi.log.error(error);
      }
    }
    strapi.log.info('updateMapLayerMedias: finished all updateEntrance');

    //updateSwissNamesNational
    strapi.log.info('updateMapLayerMedias: start updateSwissNamesNational');
    const namesMedia = await updateSwissNamesNational(
      strapi,
      config.url_swissNAMES3D,
      namesFolder,
      config.file_swissNAMES3D,
      config.style_swissNAMES3D,
      callWorker,
    );
    strapi.log.info('updateMapLayerMedias: finished updateSwissNamesNational');

    //updateSwissNames
    if (cantonAreasGeoJSON) {
      if (namesMedia?.url) {
        strapi.log.info('updateMapLayerMedias: start updateSwissNames');
        const fieldsToKeep = config.fields_swissNAMES3D.trim().split(',');

        for (const canton of cantonsToUpdate) {
          try {
            strapi.log.info(`updateMapLayerMedias: start updateSwissNames ${canton}`);
            const cantonFeature = getCantonFeature(cantonAreasGeoJSON, canton);
            await updateSwissNames(
              strapi,
              canton,
              namesFolder,
              config.style_swissNAMES3D,
              namesMedia.updatedAt,
              namesMedia,
              cantonFeature,
              config.file_swissNAMES3D,
              fieldsToKeep,
              callWorker,
            );
            strapi.log.info(`updateMapLayerMedias: finished updateSwissNames ${canton}`);
          } catch (error) {
            strapi.log.error(error);
          }
        }
        strapi.log.info('updateMapLayerMedias: finished all updateSwissNames');
      } else {
        strapi.log.error('updateMapLayerMedias: swissNames not loaded');
      }
      strapi.log.info('updateMapLayerMedias: done');
    } else {
      strapi.log.error('updateMapLayerMedias: cannot split swissNames without boundaries');
    }
  } catch (error) {
    strapi.log.error(error);
  }
  if (configId) {
    await strapi.documents('api::map-layer-generation-config.map-layer-generation-config').update({
      documentId: configId,
      data: { lastEndDate: new Date() },
    });
  }
  await stopWorker();
}

export function startWorker(strapi: Core.Strapi) {
  const worker = new Worker('./dist/src/workers/map-layer-processor.js');

  const pendingRequests = new Map<
    number,
    { resolve: (value: any | PromiseLike<any>) => void; reject: (reason?: any) => void; func: string }
  >();
  let requestId = 0;

  worker.on('message', (msg) => {
    if (!msg.id) {
      strapi.log.error('Worker message without id:' + JSON.stringify(msg));
      return;
    }
    const request = pendingRequests.get(msg.id);
    if (!request) {
      strapi.log.error(`Worker message id ${msg.id} (func:${msg.func}) not found in pending requests.`);
      return;
    }
    pendingRequests.delete(msg.id);
    const { resolve, reject } = request;
    if (msg.type === 'RESULT') {
      strapi.log.info(`Worker response for id ${msg.id} (func:${msg.func}) recived.`);
      resolve(msg.value);
    } else if (msg.type === 'ERROR') {
      strapi.log.error(`Worker returned error for id ${msg.id} (func:${msg.func}):` + JSON.stringify(msg.value));
      if (msg.value.stack) {
        reject(msg.value.stack);
      } else if (msg.value.error) {
        reject(msg.value.error);
      } else {
        reject(msg.value);
      }
    }
  });

  worker.on('error', (error) => {
    strapi.log.error('Worker Error:' + JSON.stringify(error));
  });

  const callWorker = <T>(func: string, params: any) => {
    const id = ++requestId;
    return new Promise<T>((resolve, reject) => {
      pendingRequests.set(id, { resolve, reject, func });

      worker.postMessage({
        id,
        func: func,
        params: params,
      });

      // 5min Timeout
      setTimeout(() => {
        const req = pendingRequests.get(id);
        if (req) {
          pendingRequests.delete(id);
          strapi.log.error(`Worker timeout for id ${id} (func:${func})`);
          req.reject(new Error('worker call timeout'));
        }
      }, 300000);
    });
  };

  const stopWorker = async () => {
    await callWorker('shutdown', null);
    pendingRequests.forEach((req, id) => {
      strapi.log.warn(`Worker shutdown but there was pendingRequests ${id}, func: ${req.func}`);
      req.reject(new Error('worker terminated'));
    });
    await worker.terminate();
  };

  return { callWorker, stopWorker };
}

