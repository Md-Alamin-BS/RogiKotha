import { NextResponse } from 'next/server';

import { healthReport } from '@/server/health';

// 03-routes-and-contracts.md §1: the database probe is T-101's; queue, mail and scanner probes
// stay 'unknown' until their tasks wire them.
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(await healthReport());
}
