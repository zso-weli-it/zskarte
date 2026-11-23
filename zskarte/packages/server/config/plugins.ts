import { uploadSizeLimitBytes } from './upload-limit';

// uploads are stored on the server's disk
const uploadConfig = (env) => ({
  config: {
    sizeLimit: uploadSizeLimitBytes(env('ZSK_MAX_UPLOAD_MB')),
    localServer: {
      maxage: 300000,
    },
  },
});

export default ({ env }) => ({
  upload: uploadConfig(env),
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
