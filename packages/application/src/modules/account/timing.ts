// Timing floors for the commands whose answer must not reveal whether an address has an account
// (T-101 BR1.6, BR2.4, BR5.1, § 10.3). The wait happens after the transaction, so no connection is
// held while it runs.
import type { Command, CommandCall } from '../../command';

// ASSUMPTION(T-101): placeholder floors until the Step 14 measurement (median of the slower branch
// over 20 runs on the dev machine, plus 20 %) replaces them; recorded in the hand-off (F18).
export const REGISTER_FLOOR_MS = 900;
export const RESEND_FLOOR_MS = 400;
export const RESET_REQUEST_FLOOR_MS = 400;

/** Waits until `floorMs` has passed since `startedAt`. */
export async function waitForFloor(call: CommandCall, startedAt: Date, floorMs: number) {
  const elapsed = call.ports.clock.now().getTime() - startedAt.getTime();
  if (elapsed < floorMs) await call.ports.sleeper.sleep(floorMs - elapsed);
}

/**
 * Wraps a command so every successful answer returns no earlier than `floorMs` after the call
 * began. Refusals that look the same for every address (validation, rate limits) are not delayed.
 */
export function withTimingFloor<I, O>(command: Command<I, O>, floorMs: number): Command<I, O> {
  return {
    ...command,
    async execute(raw, call) {
      const startedAt = call.ports.clock.now();
      const result = await command.execute(raw, call);
      if (result.ok) await waitForFloor(call, startedAt, floorMs);
      return result;
    },
  };
}
