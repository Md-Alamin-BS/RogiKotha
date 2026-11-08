import { NextResponse } from 'next/server';

import { healthReport } from '@/server/health';

// 03-routes-and-contracts.md §1: database, queue, mail and scanner are probed on every request
// (U50 BR9.1, BR9.2); a down scanner alone leaves `ok` true.
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await healthReport());
}
