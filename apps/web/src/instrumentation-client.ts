// ASSUMPTION(U41): zod 4 probes `Function('')` on its first object parse in the browser; under the
// nonce CSP that probe is refused and reported as a `script-src eval` violation (BR1.x). Running
// zod without its JIT in the client keeps the browser console free of it at no visible cost.
import { z } from 'zod';

z.config({ jitless: true });
