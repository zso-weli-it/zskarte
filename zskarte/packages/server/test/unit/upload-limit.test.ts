import { test } from 'node:test';
import assert from 'node:assert/strict';
import pluginsConfig from '../../config/plugins';
import middlewares from '../../config/middlewares';
import { uploadSizeLimitBytes } from '../../config/upload-limit';

const MB = 1024 * 1024;
const envWith = (values: Record<string, string>) => (name: string, fallback?: unknown) => values[name] ?? fallback;

test('the default upload limit is 50 MB', () => {
  assert.equal(uploadSizeLimitBytes(undefined), 50 * MB);
});

test('ZSK_MAX_UPLOAD_MB sets the limit in megabytes', () => {
  assert.equal(uploadSizeLimitBytes('20'), 20 * MB);
});

test('a limit that is not a positive number is refused at startup', () => {
  assert.throws(() => uploadSizeLimitBytes('abc'), /ZSK_MAX_UPLOAD_MB/);
  assert.throws(() => uploadSizeLimitBytes('0'), /ZSK_MAX_UPLOAD_MB/);
});

test('the local storage provider uses the default limit', () => {
  const plugins: any = pluginsConfig({ env: envWith({ STORAGE_PROVIDER: 'local' }) });
  assert.equal(plugins.upload.config.sizeLimit, 50 * MB);
});

test('the azure storage provider uses the configured limit', () => {
  const plugins: any = pluginsConfig({ env: envWith({ STORAGE_PROVIDER: 'azure', ZSK_MAX_UPLOAD_MB: '20' }) });
  assert.equal(plugins.upload.config.sizeLimit, 20 * MB);
});

test('the body parser uses the default limit when none is set', () => {
  const body: any = (middlewares as any[]).find((m) => m.name === 'strapi::body');
  assert.equal(body.config.formidable.maxFileSize, 50 * MB);
});
