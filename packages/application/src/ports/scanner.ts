// The malware scanner port (BR4.4, BR4.5). It never rejects: a timeout, a refused connection, an
// abort or an unexpected reply is `unavailable`, so the caller fails closed.
import type { EvidenceByteStream } from './evidence-storage';

/** The part of `AbortSignal` the scanner uses; `application` has no DOM or Node types. */
export interface ScanAbortSignal {
  readonly aborted: boolean;
  addEventListener(type: 'abort', listener: () => void, options?: { once?: boolean }): void;
  removeEventListener(type: 'abort', listener: () => void): void;
}

export type ScanResult = 'clean' | 'infected' | 'unavailable';

export interface ScanReport {
  result: ScanResult;
  /** Present when the scanner reports its version. */
  scannerVersion?: string;
}

export interface ScannerPort {
  scan(stream: EvidenceByteStream, opts: { signal: ScanAbortSignal }): Promise<ScanReport>;
}
