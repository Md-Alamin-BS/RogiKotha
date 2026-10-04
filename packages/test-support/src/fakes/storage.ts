/// <reference types="node" />
// `Storage` port fake (03-routes-and-contracts.md §3:
// `putQuarantine(stream, {itemId}) -> key`, `getPrivate(key) -> stream`,
// `putDerivative(bytes, meta) -> key` (immutable), `head(key)`, `delete(key,
// {reason})`). In-memory `Map<key, Buffer>`, task step 5's "round-trips
// bytes" test target.
import { Readable } from 'node:stream';

import { seqId } from '../builders/seq.js';

export interface StorageMeta {
  [k: string]: unknown;
}

export class MemoryStorage {
  private readonly files = new Map<string, Buffer>();
  private readonly deleted = new Map<string, string>();

  private async readAll(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Buffer | string>) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  async putQuarantine(stream: Readable, meta: { itemId: string }): Promise<string> {
    const bytes = await this.readAll(stream);
    const key = `quarantine/${meta.itemId}/${seqId('obj')}`;
    this.files.set(key, bytes);
    return key;
  }

  getPrivate(key: string): Readable {
    const bytes = this.files.get(key);
    if (!bytes || this.deleted.has(key)) throw new Error(`MemoryStorage: no such key ${key}`);
    return Readable.from(bytes);
  }

  putDerivative(bytes: Buffer, meta: StorageMeta): Promise<string> {
    const itemId = typeof meta.itemId === 'string' ? meta.itemId : 'unknown';
    const key = `public/${itemId}/${seqId('derivative')}`;
    this.files.set(key, bytes);
    return Promise.resolve(key);
  }

  head(key: string): Promise<{ bytes: number } | null> {
    const bytes = this.files.get(key);
    if (!bytes || this.deleted.has(key)) return Promise.resolve(null);
    return Promise.resolve({ bytes: bytes.length });
  }

  delete(key: string, opts: { reason: string }): Promise<void> {
    this.deleted.set(key, opts.reason);
    return Promise.resolve();
  }

  /** Test-only helper: the reason a key was deleted, if it was. */
  deletionReason(key: string): string | undefined {
    return this.deleted.get(key);
  }

  /** Test-only helper: read back exactly what was stored, ignoring deletion. */
  peek(key: string): Buffer | undefined {
    return this.files.get(key);
  }
}
