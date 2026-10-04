import { NextResponse } from 'next/server';

// Task step 15 / 03-routes-and-contracts.md §1: real probes are wired by
// T-101 (db), T-009 (queue), T-304 (scanner); mail stays 'unknown' until a
// task wires the Mailer port's health check.
export function GET() {
  return NextResponse.json({
    ok: true,
    db: 'unknown',
    queue: 'unknown',
    mail: 'unknown',
    scanner: 'unknown',
    mode: process.env.APP_MODE ?? 'unknown',
  });
}
