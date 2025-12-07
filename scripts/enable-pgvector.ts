// Script to enable pgvector extension on Railway PostgreSQL
// Run with: npx tsx scripts/enable-pgvector.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Enabling pgvector extension...");

  try {
    // Enable the vector extension
    await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS vector;`);
    console.log("✅ pgvector extension enabled successfully!");

    // Verify it's enabled
    const extensions = await prisma.$queryRaw<Array<{ extname: string }>>`
      SELECT extname FROM pg_extension WHERE extname = 'vector';
    `;

    if (extensions.length > 0) {
      console.log("✅ Verified: pgvector is active");
    } else {
      console.log("⚠️ Extension may not be available on this PostgreSQL instance");
    }
  } catch (error) {
    console.error("❌ Failed to enable pgvector:", error);
    console.log("\nNote: If you see 'extension does not exist', your PostgreSQL");
    console.log("instance may not support pgvector. Railway PostgreSQL should support it.");
  } finally {
    await prisma.$disconnect();
  }
}

main();
