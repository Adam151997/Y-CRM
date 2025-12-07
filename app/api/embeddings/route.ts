import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/embeddings
 * 
 * Note: Vector embeddings are currently disabled because
 * Railway PostgreSQL doesn't have pgvector installed.
 * 
 * To enable semantic search, migrate to:
 * - Neon (free pgvector)
 * - Supabase (free pgvector)
 * - Railway with custom PostgreSQL image
 */
export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    error: "Embeddings not available",
    message: "pgvector extension is not installed on the database. Using keyword search instead.",
  }, { status: 501 });
}
