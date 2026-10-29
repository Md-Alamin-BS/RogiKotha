/// <reference types="node" />
// `MalwareScanner` port fake (03-routes-and-contracts.md §3:
// `scan(stream) -> {status: 'clean'|'detected'|'unavailable', signatureVersion?}`).
// Task step 5: "ScriptedScanner (`nextResults.push('clean'|'detected'|'unavailable')`)".
import type { Readable } from 'node:stream';

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
