import { test } from 'node:test';
import assert from 'node:assert/strict';
import AdmZip from 'adm-zip';
import { readZipEntry } from '../../src/state/zip-entry';

const zipWith = (content: Buffer) => {
  const zip = new AdmZip();
  zip.addFile('big.bin', content);
  return new AdmZip(zip.toBuffer());
};

test('a file within the limit is read unchanged', () => {
  const content = Buffer.from('hello map layer '.repeat(1000));
  const entry = zipWith(content).getEntry('big.bin')!;
  assert.deepEqual(readZipEntry(entry, content.length), content);
});

test('a file larger than the limit is refused', () => {
  // highly compressible: 10 MB of zeros is only a few kilobytes inside the zip
  const entry = zipWith(Buffer.alloc(10 * 1024 * 1024)).getEntry('big.bin')!;
  assert.throws(() => readZipEntry(entry, 1024 * 1024), /maxOutputLength|buffer|too large/i);
});
