import zlib from 'node:zlib';
import type { IZipEntry } from 'adm-zip';

// The uncompressed size of one file in an uploaded zip is capped: a small zip can expand to gigabytes.
export const MAX_ZIP_ENTRY_BYTES = 200 * 1024 * 1024;

const STORED = 0;
const DEFLATED = 8;

/**
 * Reads one file of a zip. The library's own getData() inflates without a size limit, so the data is
 * inflated here with maxOutputLength. Throws if the file is larger than maxBytes.
 */
export const readZipEntry = (entry: IZipEntry, maxBytes = MAX_ZIP_ENTRY_BYTES): Buffer => {
  const compressed = entry.getCompressedData();
  switch (entry.header.method) {
    case STORED:
      if (compressed.length > maxBytes) throw new RangeError(`zip entry ${entry.entryName} is too large`);
      return compressed;
    case DEFLATED:
      return zlib.inflateRawSync(compressed, { maxOutputLength: maxBytes });
    default:
      throw new Error(`zip entry ${entry.entryName} uses an unsupported compression method`);
  }
};
