-- Enable the pgvector extension so Postgres can store and search vectors.
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS "DocumentChunk" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "fileName" text NOT NULL,
  "blobUrl" text NOT NULL,
  "content" text NOT NULL,
  "embedding" vector(512),
  "createdAt" timestamp DEFAULT now() NOT NULL,
  "userId" uuid NOT NULL REFERENCES "User"("id")
);

-- HNSW index makes similarity searches very fast even with millions of rows.
-- vector_cosine_ops means we measure similarity using cosine distance.
CREATE INDEX IF NOT EXISTS "DocumentChunk_embedding_idx"
  ON "DocumentChunk"
  USING hnsw ("embedding" vector_cosine_ops);
