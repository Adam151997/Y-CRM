/**
 * Credentials API - DEPRECATED
 * All integrations now use OAuth. This endpoint is no longer needed.
 */

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "This endpoint is deprecated. All integrations use OAuth authentication." },
    { status: 410 }
  );
}
