/**
 * Integration Tools API - DEPRECATED
 * Tools are now accessed directly via native integration clients.
 * Use the Google and Slack clients directly instead.
 */

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { 
      error: "This endpoint is deprecated. Use native integration clients directly.",
      tools: [],
      connectedApps: [],
      totalTools: 0
    },
    { status: 410 }
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is deprecated. Use native integration clients directly." },
    { status: 410 }
  );
}
