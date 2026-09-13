/// <reference types="node" />
// `ImageSanitiser` port fake (03-routes-and-contracts.md §3:
// `sanitise(bytes, {maxPixels}) -> {png, width, height, version}`). Task
// step 5: "PassthroughImageSanitiser (returns a 1x1 PNG)" — a real,
// minimal, valid PNG byte sequence (not a stub that throws), so callers
// that decode the result in a test get something real to check.
// 1x1 transparent PNG, hand-verified valid (IHDR/IDAT/IEND, correct CRCs).
const ONE_BY_ONE_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

export class PassthroughImageSanitiser {
  sanitise(
    _bytes: Buffer,
    _opts: { maxPixels: number },
  ): Promise<{ png: Buffer; width: number; height: number; version: string }> {
    void _bytes;
    void _opts;
    return Promise.resolve({ png: ONE_BY_ONE_PNG, width: 1, height: 1, version: 'passthrough-1' });
  }
}
