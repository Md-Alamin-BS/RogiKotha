/// <reference types="node" />
// `MalwareScanner` port fake (03-routes-and-contracts.md §3:
// `scan(stream) -> {status: 'clean'|'detected'|'unavailable', signatureVersion?}`).
// Task step 5: "ScriptedScanner (`nextResults.push('clean'|'detected'|'unavailable')`)".
import type { Readable } from 'node:stream';

import type {
  EvidenceByteStream,
  ScanAbortSignal,
  ScannerPort,
  ScanReport,
} from '@rogikotha/application';

export type ScanStatus = 'clean' | 'detected' | 'unavailable';

export class ScriptedScanner {
  readonly nextResults: ScanStatus[] = [];

  scan(_stream: Readable): Promise<{ status: ScanStatus; signatureVersion?: string }> {
    void _stream;
    // Falls back to 'unavailable' once the script runs out — matches the
    // real scanner's fail-closed behaviour when it cannot be reached.
    const status = this.nextResults.shift() ?? 'unavailable';
    return Promise.resolve(
      status === 'detected' ? { status, signatureVersion: 'test-1' } : { status },
    );
  }
}

// U48 (BR4.4 to BR4.6): a scripted `ScannerPort`. It reads the whole stream, as clamd INSTREAM
// does, and never rejects. `hang` waits until the signal aborts and then answers `unavailable`.
export type EvidenceScanStep = 'clean' | 'infected' | 'unavailable' | 'hang';

export const FAKE_SCANNER_VERSION = 'fake-clamd 1.0/27000';

export class ScriptedEvidenceScanner implements ScannerPort {
  readonly script: EvidenceScanStep[] = [];
  /** The bytes of every scan, in order. */
  readonly scanned: Uint8Array[] = [];

  constructor(script: readonly EvidenceScanStep[] = []) {
    this.script.push(...script);
  }

  async scan(stream: EvidenceByteStream, opts: { signal: ScanAbortSignal }): Promise<ScanReport> {
    const chunks: Uint8Array[] = [];
    try {
      for await (const chunk of stream) chunks.push(chunk);
    } catch {
      return { result: 'unavailable' };
    }
    this.scanned.push(new Uint8Array(Buffer.concat(chunks)));
    // An empty script fails closed, like a scanner that cannot be reached.
    const step = this.script.shift() ?? 'unavailable';
    if (opts.signal.aborted) return { result: 'unavailable' };
    if (step === 'hang') {
      await new Promise<void>((resolve) => {
        opts.signal.addEventListener('abort', () => resolve(), { once: true });
      });
      return { result: 'unavailable' };
    }
    if (step === 'unavailable') return { result: 'unavailable' };
    return { result: step, scannerVersion: FAKE_SCANNER_VERSION };
  }
}
