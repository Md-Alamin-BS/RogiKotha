import { toNextJsHandler } from 'better-auth/next-js';

import { getAuth } from '@/server/auth/instance';

// Better Auth's own endpoints (sign-in, sign-up, sign-out, get-session) under /api/auth/*.
export const { GET, POST } = toNextJsHandler((request) => getAuth().handler(request));
