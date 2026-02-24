-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  color TEXT DEFAULT '#6366f1',
  icon TEXT DEFAULT '🔬',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Memory chunks table (core of SAGE)
CREATE TABLE IF NOT EXISTS memory_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  embedding vector(1536),
  source_type TEXT DEFAULT 'chat' CHECK (source_type IN ('chat', 'note', 'url', 'document', 'session')),
  source_label TEXT DEFAULT '',
  importance_score FLOAT DEFAULT 0.5,
  access_count INT DEFAULT 0,
  last_accessed TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create vector similarity search index
CREATE INDEX IF NOT EXISTS memory_chunks_embedding_idx 
ON memory_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT DEFAULT 'Research Session',
  summary TEXT DEFAULT '',
  open_questions JSONB DEFAULT '[]',
  resolved_questions JSONB DEFAULT '[]',
  message_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  memories_used JSONB DEFAULT '[]',
  agent_outputs JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Concepts table (knowledge graph nodes)
CREATE TABLE IF NOT EXISTS concepts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  cluster TEXT DEFAULT 'general',
  weight INT DEFAULT 1,
  color TEXT DEFAULT '#6366f1',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, label)
);

-- Concept relationships table (knowledge graph edges)
CREATE TABLE IF NOT EXISTS concept_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  from_concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  to_concept_id UUID NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'related' CHECK (
    relationship_type IN ('supports', 'contradicts', 'extends', 'questions', 'related', 'references')
  ),
  strength FLOAT DEFAULT 0.5,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, from_concept_id, to_concept_id)
);

-- Research digests table
CREATE TABLE IF NOT EXISTS research_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connections_found JSONB DEFAULT '[]',
  gaps_detected JSONB DEFAULT '[]',
  open_questions JSONB DEFAULT '[]',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  research_domain TEXT DEFAULT '',
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their own projects" ON projects
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own memory" ON memory_chunks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own sessions" ON sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own messages" ON messages
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own concepts" ON concepts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage concept relationships" ON concept_relationships
  FOR ALL USING (
    EXISTS (SELECT 1 FROM concepts c WHERE c.id = from_concept_id AND c.user_id = auth.uid())
  );

CREATE POLICY "Users can manage their digests" ON research_digests
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own profile" ON user_profiles
  FOR ALL USING (auth.uid() = id);

-- Similarity search function
CREATE OR REPLACE FUNCTION search_memories(
  query_embedding vector(1536),
  match_project_id UUID,
  match_user_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 8
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  source_type TEXT,
  source_label TEXT,
  importance_score FLOAT,
  access_count INT,
  similarity FLOAT,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    mc.id,
    mc.content,
    mc.source_type,
    mc.source_label,
    mc.importance_score,
    mc.access_count,
    1 - (mc.embedding <=> query_embedding) AS similarity,
    mc.created_at
  FROM memory_chunks mc
  WHERE mc.project_id = match_project_id
    AND mc.user_id = match_user_id
    AND 1 - (mc.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;
