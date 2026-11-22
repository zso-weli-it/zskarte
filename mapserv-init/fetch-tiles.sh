#!/bin/sh
# Downloads the swisstopo MBTiles only when the remote file changed.
set -e

URL='https://vectortiles.geo.admin.ch/tiles/ch.swisstopo.base.vt/v1.0.0/ch.swisstopo.base.vt.mbtiles'
OUT=/data/tiles.mbtiles
TMP=/data/tiles.mbtiles.part
META=/data/tiles.mbtiles.meta

mkdir -p /data

# Headers only (no 1 GB transfer). -L follows redirects, so keep the last block.
HEADERS=$(curl -sIL --fail --retry 3 --retry-delay 3 "$URL" | tr -d '\r')
ETAG=$(echo "$HEADERS" | grep -i '^etag:' | tail -1 | cut -d' ' -f2- || true)
LASTMOD=$(echo "$HEADERS" | grep -i '^last-modified:' | tail -1 | cut -d' ' -f2- || true)
SIZE=$(echo "$HEADERS" | grep -i '^content-length:' | tail -1 | cut -d' ' -f2- || true)
REMOTE_ID="etag=$ETAG lastmod=$LASTMOD size=$SIZE"

if [ -s "$OUT" ] && [ -f "$META" ] && [ "$(cat "$META")" = "$REMOTE_ID" ] && [ "$(wc -c < "$OUT")" = "$SIZE" ]; then
  echo 'Local MBTiles is up to date (remote ETag/size unchanged), skipping download.'
  exit 0
fi

echo 'Downloading MBTiles...'
rm -f "$TMP"
curl -L --fail --show-error --retry 5 --retry-delay 3 -o "$TMP" "$URL"

echo 'Validating download...'
if [ ! -s "$TMP" ]; then
  echo 'ERROR: File is empty after download'
  exit 1
fi
if [ -n "$SIZE" ] && [ "$(wc -c < "$TMP")" != "$SIZE" ]; then
  echo 'ERROR: Downloaded size does not match remote Content-Length'
  exit 1
fi

# Atomic replace: the old file stays in place until the new one is complete
mv "$TMP" "$OUT"
echo "$REMOTE_ID" > "$META"
chmod a+rw "$OUT" "$META"
echo 'MBTiles downloaded and validated successfully.'
