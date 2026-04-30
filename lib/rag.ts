import "server-only";

import { voyage } from "@ai-sdk/voyage";
import { embed, embedMany } from "ai";
import postgres from "postgres";

const client = postgres(process.env.POSTGRES_URL ?? "");

// Voyage AI free tier: 200 million tokens free, no credit card required.
// voyage-3-lite produces 512-dimensional embeddings — fast and free.
const embeddingModel = voyage.textEmbeddingModel("voyage-3-lite");

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

/**
 * Splits a long piece of text into smaller overlapping chunks.
 *
 * chunkSize = how many words per chunk (400 is a good default)
 * overlap   = how many words to repeat at the start of the next chunk
 */
function chunkText(text: string, chunkSize = 400, overlap = 50): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];

  for (let i = 0; i < words.length; i += chunkSize - overlap) {
    const chunk = words
      .slice(i, i + chunkSize)
      .join(" ")
      .trim();
    if (chunk.length > 0) {
      chunks.push(chunk);
    }
    if (i + chunkSize >= words.length) {
      break;
    }
  }

  return chunks;
}

// ---------------------------------------------------------------------------
// Ingest (store a new document)
// ---------------------------------------------------------------------------

/**
 * Takes the full text of a document, chunks it, generates an embedding for
 * each chunk using Voyage AI, and saves everything to the database.
 */
export async function ingestDocument({
  text,
  fileName,
  blobUrl,
  userId,
}: {
  text: string;
  fileName: string;
  blobUrl: string;
  userId: string;
}) {
  const chunks = chunkText(text);
  console.log("[RAG] ingestDocument:", fileName, "→", chunks.length, "chunks");
  if (chunks.length === 0) {
    return { chunks: 0 };
  }

  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: chunks,
  });

  for (let i = 0; i < chunks.length; i++) {
    const vectorStr = `[${embeddings[i].join(",")}]`;
    console.log(
      `[RAG] inserting chunk ${i + 1}/${chunks.length} for user ${userId}`
    );
    await client`
      INSERT INTO "DocumentChunk" ("fileName", "blobUrl", "content", "embedding", "userId")
      VALUES (${fileName}, ${blobUrl}, ${chunks[i]}, ${vectorStr}::vector, ${userId}::uuid)
    `;
  }

  return { chunks: chunks.length };
}

// ---------------------------------------------------------------------------
// Search (find relevant chunks for a query)
// ---------------------------------------------------------------------------

export type ChunkResult = {
  fileName: string;
  content: string;
  similarity: number;
};

/**
 * Converts a search query into a Voyage AI embedding and finds the most
 * similar document chunks stored in the database using cosine similarity.
 */
export async function findRelevantChunks(
  query: string,
  limit = 5
): Promise<ChunkResult[]> {
  console.log("[RAG] findRelevantChunks query:", query);

  const { embedding } = await embed({ model: embeddingModel, value: query });
  const vectorStr = `[${embedding.join(",")}]`;

  // First: log all chunks + their raw similarity scores (no threshold)
  const allResults = await client<ChunkResult[]>`
    SELECT
      "fileName",
      "content",
      (1 - ("embedding" <=> ${vectorStr}::vector))::float AS similarity
    FROM "DocumentChunk"
    WHERE "embedding" IS NOT NULL
    ORDER BY similarity DESC
    LIMIT 10
  `;

  console.log(
    "[RAG] all chunks (no threshold):",
    allResults.map((r) => ({
      fileName: r.fileName,
      similarity: r.similarity,
      preview: r.content.slice(0, 80),
    }))
  );

  const results = allResults.filter((r) => r.similarity > 0.2).slice(0, limit);

  console.log("[RAG] results after threshold (>0.2):", results.length);

  return results;
}
