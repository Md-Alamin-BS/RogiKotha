/// <reference types="node" />
// `Storage` port fake (03-routes-and-contracts.md §3:
// `putQuarantine(stream, {itemId}) -> key`, `getPrivate(key) -> stream`,
// `putDerivative(bytes, meta) -> key` (immutable), `head(key)`, `delete(key,
// {reason})`). In-memory `Map<key, Buffer>`, task step 5's "round-trips
// bytes" test target.
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';

import {
  portErr,
  portOk,
  type EvidenceByteStream,
  type EvidenceFileReader,
  type EvidenceFileWriter,
} from '@rogikotha/application';

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

// U48 (BR3.6): the evidence writer and reader share one in-memory store but are built separately,
// so a test holding the writer has no `readQuarantined` and the reader has no `putQuarantined`.
export type EvidenceStoreFault = 'put' | 'read' | 'delete';

export class MemoryEvidenceStore {
  readonly files = new Map<string, Uint8Array>();
  readonly deletedKeys: string[] = [];
  private faults = new Set<EvidenceStoreFault>();
  private next = 0;

  /** The next call of `operation` throws, as a full disk or a lost mount would. */
  failNext(operation: EvidenceStoreFault): void {
    this.faults.add(operation);
  }

  /** Drops a stored file without recording a deletion, as if it went missing from disk. */
  lose(key: string): void {
    this.files.delete(key);
  }

  /** Stores bytes directly under a fresh key, for tests that start after intake. */
  seed(bytes: Uint8Array): string {
    const key = this.nextKey();
    this.files.set(key, Uint8Array.from(bytes));
    return key;
  }

  nextKey(): string {
    this.next += 1;
    return this.next.toString(16).padStart(32, '0');
  }

  takeFault(operation: EvidenceStoreFault): void {
    if (this.faults.delete(operation)) {
      throw new Error(`MemoryEvidenceStore: forced ${operation} fault`);
    }
  }

  remove(key: string): void {
    this.takeFault('delete');
    this.files.delete(key);
    this.deletedKeys.push(key);
  }
}

// A forced fault rejects the returned promise, as the file-system adapter would, never throwing.
function settle<T>(work: () => T): Promise<T> {
  try {
    return Promise.resolve(work());
  } catch (error) {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
}

export function memoryEvidenceWriter(store: MemoryEvidenceStore): EvidenceFileWriter {
  return {
    async putQuarantined(stream: EvidenceByteStream, opts: { maxBytes: number }) {
      store.takeFault('put');
      const chunks: Uint8Array[] = [];
      let bytes = 0;
      for await (const chunk of stream) {
        bytes += chunk.length;
        if (bytes > opts.maxBytes) return portErr('too_large');
        chunks.push(chunk);
      }
      const body = Buffer.concat(chunks);
      const key = store.nextKey();
      store.files.set(key, new Uint8Array(body));
      return portOk({ key, bytes, sha256: createHash('sha256').update(body).digest('hex') });
    },
    delete(key: string) {
      return settle(() => store.remove(key));
    },
  };
}

export function memoryEvidenceReader(store: MemoryEvidenceStore): EvidenceFileReader {
  return {
    readQuarantined(key: string) {
      return settle(() => {
        store.takeFault('read');
        const bytes = store.files.get(key);
        if (!bytes) return portErr('original_missing');
        return portOk<EvidenceByteStream>(Readable.from([Buffer.from(bytes)]));
      });
    },
    delete(key: string) {
      return settle(() => store.remove(key));
    },
  };
}
