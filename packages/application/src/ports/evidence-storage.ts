// Private evidence file storage, split by tier (BR3.6): the web tier holds only the writer, the
// worker only the reader. No method returns a path or a URL.
// ASSUMPTION(U48): the unit entry names `ports/storage.ts`; this follows the design's
// `evidence-storage.ts`, which keeps the generic name free.
import type { PortResult } from './port-result';

/** Bytes as an async stream; a Node `Readable` and a web `ReadableStream` both satisfy it. */
export type EvidenceByteStream = AsyncIterable<Uint8Array>;

export interface QuarantinedFile {
  /** `^[0-9a-f]{32}$` (BR3.1). */
  key: string;
  bytes: number;
  /** 64 lowercase hex over the stored bytes. */
  sha256: string;
}

export interface EvidenceFileWriter {
  /** Streams the body into quarantine; past `maxBytes` the partial file is deleted (BR3.4). */
  putQuarantined(
    stream: EvidenceByteStream,
    opts: { maxBytes: number },
  ): Promise<PortResult<QuarantinedFile, 'too_large'>>;
  /** Deleting a missing key is not an error. */
  delete(key: string): Promise<void>;
}

export interface EvidenceFileReader {
  readQuarantined(key: string): Promise<PortResult<EvidenceByteStream, 'original_missing'>>;
  /** Deleting a missing key is not an error. */
  delete(key: string): Promise<void>;
}
