// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { checkDeclaredLength, readCappedFormData, UPLOAD_OVERHEAD_BYTES } from '../request-limits';

const CAP = 15_728_640 + UPLOAD_OVERHEAD_BYTES;
const URL_ = 'http://localhost:3000/api/evidence/upload';

async function multipartBody(): Promise<{ bytes: Uint8Array<ArrayBuffer>; contentType: string }> {
  const form = new FormData();
  form.set('reviewPublicId', 'abcdefghij');
  form.set(
    'file',
    new File([new Uint8Array(2048).fill(7)], 'synthetic-scan.png', { type: 'image/png' }),
  );
  const encoded = new Request(URL_, { method: 'POST', body: form });
  return {
    bytes: new Uint8Array(await encoded.arrayBuffer()),
    contentType: encoded.headers.get('content-type') ?? '',
  };
}

function uploadRequest(body: BodyInit | null, contentType: string): Request {
  return new Request(URL_, {
    method: 'POST',
    headers: { 'content-type': contentType },
    body,
    duplex: 'half',
  } as RequestInit & { duplex: 'half' });
}

describe('checkDeclaredLength (BR4.2, design § 4.2)', () => {
  it('passes a declared length exactly at the cap and an absent one', () => {
    expect(checkDeclaredLength(new Headers({ 'content-length': String(CAP) }), CAP)).toEqual({
      outcome: 'allowed',
    });
    expect(checkDeclaredLength(new Headers(), CAP)).toEqual({ outcome: 'allowed' });
  });

  it('refuses one byte more than the cap as too_large', () => {
    expect(checkDeclaredLength(new Headers({ 'content-length': String(CAP + 1) }), CAP)).toEqual({
      outcome: 'refused',
      kind: 'too_large',
    });
    expect(CAP + 1).toBe(15_794_177);
  });

  it.each(['abc', '-1', '1234567890123456', '1e3', '12 34', ''])(
    'refuses the declared length %j as length_invalid',
    (value) => {
      expect(checkDeclaredLength(new Headers({ 'content-length': value }), CAP)).toEqual({
        outcome: 'refused',
        kind: 'length_invalid',
      });
    },
  );
});

describe('readCappedFormData (BR4.3, WF3)', () => {
  it('parses a counted body of exactly the cap', async () => {
    const { bytes, contentType } = await multipartBody();

    const result = await readCappedFormData(uploadRequest(bytes, contentType), bytes.byteLength);

    expect('ok' in result && result.ok.get('reviewPublicId')).toBe('abcdefghij');
    expect('ok' in result && (result.ok.get('file') as File).size).toBe(2048);
  });

  it('stops a counted body one byte over the cap', async () => {
    const { bytes, contentType } = await multipartBody();

    const result = await readCappedFormData(
      uploadRequest(bytes, contentType),
      bytes.byteLength - 1,
    );

    expect(result).toEqual({ refused: 'too_large' });
  });

  it('cancels a 16 MB chunked stream before it is fully pulled', async () => {
    const { contentType } = await multipartBody();
    const chunk = new Uint8Array(65_536).fill(65);
    const totalChunks = (16 * 1024 * 1024) / chunk.byteLength;
    let pulled = 0;
    let cancelled = false;
    const source = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (pulled === totalChunks) {
          controller.close();
          return;
        }
        pulled += 1;
        controller.enqueue(chunk);
      },
      cancel() {
        cancelled = true;
      },
    });

    const result = await readCappedFormData(uploadRequest(source, contentType), CAP);

    expect(result).toEqual({ refused: 'too_large' });
    expect(cancelled).toBe(true);
    expect(pulled).toBeLessThan(totalChunks);
    expect(pulled * chunk.byteLength).toBeLessThan(CAP + 8 * chunk.byteLength);
  });

  it('answers malformed for a body that is not multipart', async () => {
    const result = await readCappedFormData(
      uploadRequest('not a form', 'multipart/form-data; boundary=x'),
      CAP,
    );

    expect(result).toEqual({ malformed: true });
  });

  it('answers malformed for a null body', async () => {
    const result = await readCappedFormData(new Request(URL_, { method: 'POST' }), CAP);

    expect(result).toEqual({ malformed: true });
  });
});
