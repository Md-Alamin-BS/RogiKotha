import { describe, expect, it } from 'vitest';

import { crc32, detectImageType, extensionMatches, imageStructureValid } from './file-type';
import {
  EOI,
  PNG_SIGNATURE_BYTES,
  SOI,
  ascii,
  buildJpeg,
  buildJpegWithoutSof,
  buildPng,
  concat,
  ihdr,
  jpegSegment,
  pngChunk,
} from './image-bytes.test-helpers';

const MALFORMED = { ok: false, reason: 'malformed' };

describe('detectImageType', () => {
  it('names a JPEG by SOI followed by a marker byte', () => {
    expect(detectImageType(buildJpeg())).toBe('image/jpeg');
  });

  it('names a PNG by its signature followed by an IHDR chunk header', () => {
    expect(detectImageType(buildPng())).toBe('image/png');
  });

  it('refuses a GIF', () => {
    expect(detectImageType(ascii('GIF89a\u0001\u0000\u0001\u0000'))).toBeNull();
  });

  it('refuses a PNG signature in front of a text body', () => {
    expect(detectImageType(concat(PNG_SIGNATURE_BYTES, ascii('<html>hello</html>')))).toBeNull();
  });

  it('refuses a Windows executable renamed to .png', () => {
    const exe = concat(ascii('MZ'), [0x90, 0x00, 0x03, 0x00, 0x00, 0x00]);
    expect(detectImageType(exe)).toBeNull();
    expect(extensionMatches('setup.exe', 'image/png')).toBe(false);
  });

  it('refuses SOI without a following marker byte, and an empty head', () => {
    expect(detectImageType(Uint8Array.from([0xff, 0xd8, 0x00]))).toBeNull();
    expect(detectImageType(new Uint8Array())).toBeNull();
  });
});

describe('extensionMatches', () => {
  it.each([
    ['scan.jpg', 'image/jpeg'],
    ['scan.JPEG', 'image/jpeg'],
    ['scan.Png', 'image/png'],
    ['scan.png', 'IMAGE/PNG'],
  ])('accepts %s declared as %s', (name, mime) => {
    expect(extensionMatches(name, mime)).toBe(true);
  });

  it.each([
    ['scan.png', 'image/jpeg'],
    ['scan.jpg', 'image/png'],
    ['scan.gif', 'image/gif'],
    ['scan.pdf', 'application/pdf'],
    ['scan', 'image/png'],
    ['scan.png.exe', 'image/png'],
    ['scan.constructor', 'image/png'],
  ])('refuses %s declared as %s', (name, mime) => {
    expect(extensionMatches(name, mime)).toBe(false);
  });
});

describe('crc32', () => {
  it('matches the standard check value for "123456789"', () => {
    expect(crc32(ascii('123456789'))).toBe(0xcbf43926);
  });
});

describe('imageStructureValid: PNG', () => {
  const idat = pngChunk('IDAT', [0x78, 0x9c, 0x63, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01]);

  it('passes a minimal valid PNG', () => {
    expect(imageStructureValid(buildPng())).toEqual({ ok: true, mime: 'image/png' });
  });

  it('passes the largest allowed size, 20000 by 20000', () => {
    expect(imageStructureValid(buildPng({ width: 20_000, height: 20_000 })).ok).toBe(true);
  });

  it('fails a PNG truncated right after IHDR', () => {
    expect(imageStructureValid(concat(PNG_SIGNATURE_BYTES, ihdr(1, 1)))).toEqual(MALFORMED);
  });

  it('fails a PNG without IEND', () => {
    expect(imageStructureValid(concat(PNG_SIGNATURE_BYTES, ihdr(1, 1), idat))).toEqual(MALFORMED);
  });

  it('fails a PNG whose first chunk is not IHDR', () => {
    const bytes = concat(
      PNG_SIGNATURE_BYTES,
      pngChunk('tEXt', ascii('a\0b')),
      ihdr(1, 1),
      idat,
      pngChunk('IEND'),
    );
    expect(imageStructureValid(bytes)).toEqual(MALFORMED);
  });

  it('fails a PNG with one wrong CRC', () => {
    const bytes = buildPng();
    const idatCrcAt = 8 + 25 + 12 + 10 - 1;
    bytes[idatCrcAt] = (bytes[idatCrcAt] ?? 0) ^ 0xff;
    expect(imageStructureValid(bytes)).toEqual(MALFORMED);
  });

  it('fails a PNG with HTML after IEND', () => {
    expect(imageStructureValid(concat(buildPng(), ascii('<script>x</script>')))).toEqual(MALFORMED);
  });

  it('fails a PNG with no IDAT', () => {
    expect(imageStructureValid(concat(PNG_SIGNATURE_BYTES, ihdr(1, 1), pngChunk('IEND')))).toEqual(
      MALFORMED,
    );
  });

  it('fails an IEND that carries data', () => {
    const bytes = concat(PNG_SIGNATURE_BYTES, ihdr(1, 1), idat, pngChunk('IEND', [0]));
    expect(imageStructureValid(bytes)).toEqual(MALFORMED);
  });

  it('fails a chunk whose length runs past the end of the file', () => {
    const bytes = concat(PNG_SIGNATURE_BYTES, ihdr(1, 1), [0x7f, 0xff, 0xff, 0xff], ascii('IDAT'));
    expect(imageStructureValid(bytes)).toEqual(MALFORMED);
  });

  it.each([
    [0, 1],
    [1, 0],
    [20_001, 1],
    [1, 20_001],
  ])('fails width %i by height %i', (width, height) => {
    expect(imageStructureValid(buildPng({ width, height }))).toEqual(MALFORMED);
  });

  it('fails a PNG signature and IHDR header in front of a text body', () => {
    const bytes = concat(
      PNG_SIGNATURE_BYTES,
      [0, 0, 0, 13],
      ascii('IHDR'),
      ascii('just some text'),
    );
    expect(detectImageType(bytes)).toBe('image/png');
    expect(imageStructureValid(bytes)).toEqual(MALFORMED);
  });
});

describe('imageStructureValid: JPEG', () => {
  it('passes a baseline JPEG', () => {
    expect(imageStructureValid(buildJpeg())).toEqual({ ok: true, mime: 'image/jpeg' });
  });

  it('passes a progressive JPEG with several scans', () => {
    expect(imageStructureValid(buildJpeg({ progressive: true }))).toEqual({
      ok: true,
      mime: 'image/jpeg',
    });
  });

  it('passes a JPEG whose EXIF thumbnail has its own SOI and EOI', () => {
    expect(imageStructureValid(buildJpeg({ exif: true }))).toEqual({
      ok: true,
      mime: 'image/jpeg',
    });
  });

  it('fails a JPEG truncated before EOI', () => {
    const bytes = buildJpeg();
    expect(imageStructureValid(bytes.subarray(0, bytes.length - 2))).toEqual(MALFORMED);
  });

  it('fails a JPEG with a ZIP after EOI', () => {
    const zip = concat(ascii('PK'), [0x03, 0x04, 0x14, 0x00]);
    expect(imageStructureValid(concat(buildJpeg(), zip))).toEqual(MALFORMED);
  });

  it('fails a JPEG with no SOF before SOS', () => {
    expect(imageStructureValid(buildJpegWithoutSof())).toEqual(MALFORMED);
  });

  it('fails a JPEG whose only frame header is DHT-numbered (C4), not a SOF', () => {
    expect(
      imageStructureValid(concat(SOI, jpegSegment(0xc4, [8, 0, 1, 0, 1, 1, 1, 0x11, 0]), EOI)),
    ).toEqual(MALFORMED);
  });

  it('fails SOI followed directly by EOI, which has no scan', () => {
    expect(imageStructureValid(concat(SOI, EOI))).toEqual(MALFORMED);
  });

  it('fails a segment whose length runs past the end of the file', () => {
    expect(imageStructureValid(concat(SOI, [0xff, 0xe0, 0x7f, 0xff, 0x00]))).toEqual(MALFORMED);
  });

  it.each([
    [1, 0],
    [1, 20_001],
    [0, 1],
    [20_001, 1],
  ])('fails width %i by height %i', (width, height) => {
    expect(imageStructureValid(buildJpeg({ width, height }))).toEqual(MALFORMED);
  });

  it('passes the largest allowed size, 20000 by 20000', () => {
    expect(imageStructureValid(buildJpeg({ width: 20_000, height: 20_000 })).ok).toBe(true);
  });
});

describe('imageStructureValid: other types', () => {
  it('answers type_mismatch for bytes that start as neither PNG nor JPEG', () => {
    expect(imageStructureValid(ascii('GIF89a'))).toEqual({ ok: false, reason: 'type_mismatch' });
    expect(imageStructureValid(new Uint8Array())).toEqual({ ok: false, reason: 'type_mismatch' });
  });
});
