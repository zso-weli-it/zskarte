import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import AdmZip from 'adm-zip';
import { loadShpFromUrl } from '../../src/state/shp-loader';

// one point at (7.45, 46.95) as a shapefile
const pointShp = (() => {
  const buf = Buffer.alloc(128);
  buf.writeInt32BE(9994, 0);
  buf.writeInt32BE(64, 24);
  buf.writeInt32LE(1000, 28);
  buf.writeInt32LE(1, 32);
  buf.writeDoubleLE(7.45, 36); buf.writeDoubleLE(46.95, 44); buf.writeDoubleLE(7.45, 52); buf.writeDoubleLE(46.95, 60);
  buf.writeInt32BE(1, 100); buf.writeInt32BE(10, 104);
  buf.writeInt32LE(1, 108);
  buf.writeDoubleLE(7.45, 112); buf.writeDoubleLE(46.95, 120);
  return buf;
})();

const serve = (body: Buffer) =>
  new Promise<{ url: string; close: () => void }>((resolve) => {
    const server = http.createServer((_req, res) => res.end(body));
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number };
      resolve({ url: `http://127.0.0.1:${port}/layer.zip`, close: () => server.close() });
    });
  });

test('a shapefile in a zip is loaded', async () => {
  const zip = new AdmZip();
  zip.addFile('points.shp', pointShp);
  const { url, close } = await serve(zip.toBuffer());
  try {
    const collection = await loadShpFromUrl(url);
    assert.equal(collection.features.length, 1);
  } finally {
    close();
  }
});

test('a zip that unpacks to more than the limit is refused before it is unpacked', async () => {
  const zip = new AdmZip();
  zip.addFile('points.shp', pointShp);
  // 5 MB of zeros is only a few kilobytes inside the zip
  zip.addFile('huge.bin', Buffer.alloc(5 * 1024 * 1024));
  const { url, close } = await serve(zip.toBuffer());
  try {
    await assert.rejects(loadShpFromUrl(url, 1024 * 1024), RangeError);
  } finally {
    close();
  }
});
