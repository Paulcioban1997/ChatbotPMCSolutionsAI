import "server-only";

import { del } from "@vercel/blob";
import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { NextResponse } from "next/server";
import postgres from "postgres";
import { auth } from "@/app/(auth)/auth";
import { documentChunk } from "@/lib/db/schema";

const client = postgres(process.env.POSTGRES_URL ?? "");
const db = drizzle(client);

// GET /api/documents – list unique files uploaded by the current user
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      fileName: documentChunk.fileName,
      blobUrl: documentChunk.blobUrl,
      createdAt: documentChunk.createdAt,
      chunks: sql<number>`cast(count(*) as int)`,
    })
    .from(documentChunk)
    .where(eq(documentChunk.userId, session.user.id))
    .groupBy(
      documentChunk.fileName,
      documentChunk.blobUrl,
      documentChunk.createdAt
    )
    .orderBy(documentChunk.createdAt);

  // Deduplicate by fileName (keep latest)
  const seen = new Map<string, (typeof rows)[0]>();
  for (const row of rows) {
    seen.set(row.fileName, row);
  }

  return NextResponse.json({ documents: [...seen.values()] });
}

// DELETE /api/documents?fileName=xxx – remove all chunks for a file
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get("fileName");

  if (!fileName) {
    return NextResponse.json({ error: "fileName required" }, { status: 400 });
  }

  // Get blob URL before deleting rows
  const rows = await db
    .select({ blobUrl: documentChunk.blobUrl })
    .from(documentChunk)
    .where(
      sql`${documentChunk.userId} = ${session.user.id}::uuid
          AND ${documentChunk.fileName} = ${fileName}`
    )
    .limit(1);

  // Delete all chunks for this specific file
  await db.delete(documentChunk).where(
    sql`${documentChunk.userId} = ${session.user.id}::uuid
          AND ${documentChunk.fileName} = ${fileName}`
  );

  // Try to delete from Blob storage (best effort)
  if (rows[0]?.blobUrl) {
    try {
      await del(rows[0].blobUrl);
    } catch {
      // ignore – chunks are already deleted from DB
    }
  }

  return NextResponse.json({ success: true });
}
