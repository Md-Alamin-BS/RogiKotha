// `pnpm --filter @rogikotha/adapters bench:argon2` (BR7.6): the median of 5 hashes with the
// production parameters. A median above 500 ms keeps the parameters and is noted in the hand-off.
import {
  ARGON2ID_PARAMS,
  createArgon2PasswordHasher,
} from '../src/password-argon2/password-argon2.ts';

const RUNS = 5;
const NOTE_ABOVE_MS = 500;

const hasher = createArgon2PasswordHasher();
// One warm-up hash, so loading the native module is not timed.
await hasher.hash('synthetic-warm-up-password');

const timings: number[] = [];
for (let run = 1; run <= RUNS; run += 1) {
  const started = performance.now();
  await hasher.hash(`synthetic-bench-password-${run}`);
  timings.push(performance.now() - started);
}

timings.sort((a, b) => a - b);
const median = timings[Math.floor(RUNS / 2)] ?? Number.NaN;
const params = `m=${ARGON2ID_PARAMS.memoryCost},t=${ARGON2ID_PARAMS.timeCost},p=${ARGON2ID_PARAMS.parallelism}`;

process.stdout.write(
  `argon2id ${params}: median ${median.toFixed(1)} ms over ${RUNS} hashes ` +
    `(runs: ${timings.map((ms) => ms.toFixed(1)).join(', ')} ms)\n`,
);
if (median > NOTE_ABOVE_MS) {
  process.stdout.write(
    `median is above ${NOTE_ABOVE_MS} ms: parameters kept, note it in the hand-off\n`,
  );
}
