import zlib from 'node:zlib';
import AdmZip, { IZipEntry } from 'adm-zip';

// The uncompressed size of one file in an uploaded zip is capped: a small zip can expand to gigabytes.
export const MAX_ZIP_ENTRY_BYTES = 200 * 1024 * 1024;
// all files of one zip together: many small files could otherwise add up to a huge amount
export const MAX_ZIP_TOTAL_BYTES = 500 * 1024 * 1024;

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

/** Reads every file of a zip and throws if the files together are larger than maxTotalBytes. */
export const assertZipWithinLimits = (zipContent: Buffer, maxTotalBytes = MAX_ZIP_TOTAL_BYTES): void => {
  let total = 0;
  for (const entry of new AdmZip(zipContent).getEntries()) {
    if (entry.isDirectory) continue;
    total += readZipEntry(entry).length;
    if (total > maxTotalBytes) throw new RangeError('zip is too large when unpacked');
  }
};
