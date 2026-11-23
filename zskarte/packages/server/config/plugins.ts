import { uploadSizeLimitBytes } from './upload-limit';

const uploadProviders = (env) => {
  const sizeLimit = uploadSizeLimitBytes(env('ZSK_MAX_UPLOAD_MB'));
  const providers = {
    local: {
      config: {
        sizeLimit,
        localServer: {
          maxage: 300000,
        },
      },
    },
    azure: {
      config: {
        provider: 'strapi-provider-upload-azure-storage',
        providerOptions: {
          authType: env('STORAGE_AUTH_TYPE', 'default'),
          account: env('STORAGE_ACCOUNT'),
          accountKey: env('STORAGE_ACCOUNT_KEY'),
          serviceBaseURL: env('STORAGE_URL'),
          containerName: env('STORAGE_CONTAINER_NAME'),
          defaultPath: '',
          maxConcurrent: 10,
        },
        sizeLimit,
      },
    },
  };
  return providers[env('STORAGE_PROVIDER', 'local')];
};

export default ({ env }) => ({
  upload: uploadProviders(env),
  'users-permissions': {
    config: {
      ratelimit: {
        enabled: true,
        interval: { min: 1 },
        max: 100,
      },
    },
  }
});
