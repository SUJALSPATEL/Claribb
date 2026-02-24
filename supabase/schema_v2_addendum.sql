-- ============================================================
-- SAGE Schema v2 — Addendum (run AFTER the base schema.sql)
-- Adds: metadata to search_memories, missing RPCs, HNSW index
-- ============================================================

-- Upgrade vector index to HNSW for better query performance
-- (drop old ivfflat first if it exists)
DROP INDEX IF EXISTS memory_chunks_embedding_idx;

CREATE INDEX IF NOT EXISTS memory_chunks_embedding_hnsw_idx
    ON memory_chunks USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ============================================================
-- Replace search_memories to include metadata column
-- ============================================================
CREATE OR REPLACE FUNCTION search_memories(
    query_embedding    vector(1536),
    match_project_id   UUID,
    match_user_id      UUID,
    match_threshold    FLOAT DEFAULT 0.68,
    match_count        INT   DEFAULT 8
)
RETURNS TABLE (
    id               UUID,
    content          TEXT,
    source_type      TEXT,
    source_label     TEXT,
    importance_score FLOAT,
    access_count     INT,
    metadata         JSONB,
    created_at       TIMESTAMPTZ,
    similarity       FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        mc.id,
        mc.content,
        mc.source_type,
        mc.source_label,
        mc.importance_score,
        mc.access_count,
        mc.metadata,
        mc.created_at,
        1 - (mc.embedding <=> query_embedding) AS similarity
    FROM memory_chunks mc
    WHERE
        mc.project_id = match_project_id
        AND mc.user_id = match_user_id
        AND 1 - (mc.embedding <=> query_embedding) >= match_threshold
    ORDER BY mc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================================
-- RPC: Increment access count for retrieved memories
-- ============================================================
CREATE OR REPLACE FUNCTION increment_access_count(memory_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE memory_chunks
    SET access_count = access_count + 1,
        last_accessed = NOW()
    WHERE id = ANY(memory_ids);
END;
$$;

-- ============================================================
-- RPC: Increment concept weights
-- ============================================================
CREATE OR REPLACE FUNCTION increment_concept_weights(concept_ids UUID[])
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE concepts
    SET weight = weight + 1
    WHERE id = ANY(concept_ids);
END;
$$;

-- ============================================================
-- Fix: sessions.open_questions / resolved_questions to TEXT[]
-- (schema.sql used JSONB, but code expects TEXT[])
-- Only run this if you get a type mismatch error:
-- ============================================================
-- ALTER TABLE sessions
--     ALTER COLUMN open_questions TYPE TEXT[] USING ARRAY(SELECT jsonb_array_elements_text(open_questions)),
--     ALTER COLUMN resolved_questions TYPE TEXT[] USING ARRAY(SELECT jsonb_array_elements_text(resolved_questions));
