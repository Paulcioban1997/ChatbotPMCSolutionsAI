import "server-only";

import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";
import { ingestDocument } from "@/lib/rag";

const ALLOWED_EXTENSIONS = /\.(txt|md)$/i;
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

export async function POST(request: Request): Promise<NextResponse> {
  // 1. Require an authenticated user
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse form data
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // 3. Validate file type
  if (!ALLOWED_EXTENSIONS.test(file.name)) {
    return NextResponse.json(
      { error: "Only .txt and .md files are supported" },
      { status: 400 }
    );
  }

  // 4. Validate file size
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "File too large (max 4 MB)" },
      { status: 400 }
    );
  }

  // 5. Upload the original file to Vercel Blob
  let blob: Awaited<ReturnType<typeof put>>;
  try {
    blob = await put(`documents/${session.user.id}/${file.name}`, file, {
      access: "private",
      allowOverwrite: true,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Blob upload failed";
    return NextResponse.json({ error: `Blob error: ${msg}` }, { status: 500 });
  }

  // 6. Extract text, chunk, embed and save to pgvector
  const text = await file.text();
  let chunks: number;
  try {
    const result = await ingestDocument({
      text,
      fileName: file.name,
      blobUrl: blob.url,
      userId: session.user.id,
    });
    chunks = result.chunks;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ingestion failed";
    return NextResponse.json(
      { error: `Embedding error: ${msg}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    fileName: file.name,
    url: blob.url,
    chunks,
  });
}
