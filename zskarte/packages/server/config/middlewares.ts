import { uploadSizeLimitBytes } from './upload-limit';

export default [
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': ["'self'", 'data:', 'blob:', process.env.STORAGE_URL],
          'media-src': ["'self'", 'data:', 'blob:', process.env.STORAGE_URL],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  {
    name: 'strapi::cors',
    config: {
      headers: ['Content-Type', 'Authorization', 'Origin', 'Accept', 'Identifier', 'OperationId'],
    },
  },
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  {
    name: 'strapi::body',
    config: {
      formLimit: '100mb',
      jsonLimit: '100mb',
      textLimit: '100mb',
      formidable: {
        maxFileSize: uploadSizeLimitBytes(process.env.ZSK_MAX_UPLOAD_MB),
      },
    },
  },
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
  'global::globalSecurity',
  'global::superjson',
];
