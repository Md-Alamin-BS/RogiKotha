import { getContainer } from '@/server/container';

// BR7.1: only these library paths answer over HTTP. Every flow a command owns (sign-up, sign-in,
// reset, verify, sign-out, sessions) goes through server actions, so the limits, the delay and the
// domain rows cannot be skipped. The handler comes from the container per request, never at
// module load (BR7.2).
// The library's get-session is closed too: it hands the browser the session token and the full
// address, and it skips `getActor`'s status and 30-day checks (BR4.1, BR4.8, BR8.3, FD-096).
// ASSUMPTION(T-101): closing it narrows BR7.1's allowlist; nothing in the app calls it.
const ALLOWED_AUTH_PATHS: ReadonlySet<string> = new Set(['/api/auth/ok']);

// A JSON null, so a stray library client reads "no session" instead of failing to parse.
function notFound(): Response {
  return Response.json(null, { status: 404 });
}

async function handle(request: Request): Promise<Response> {
  const path = new URL(request.url).pathname.replace(/\/+$/, '');
  if (!ALLOWED_AUTH_PATHS.has(path)) return notFound();
  return getContainer().auth.handler(request);
}

export const GET = handle;
export const POST = handle;
