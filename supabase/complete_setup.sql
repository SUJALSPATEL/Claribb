-- ============================================================
-- CLARIBB Complete Database Setup (NO pgvector required)
-- Run this ENTIRE script in Supabase SQL Editor as one query.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- CORE TABLES (no vector extension needed)
-- ──────────────────────────────────────────────────────────

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

-- Memory chunks WITHOUT vector embedding (text-only fallback)
CREATE TABLE IF NOT EXISTS memory_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    embedding TEXT DEFAULT NULL,
    source_type TEXT DEFAULT 'chat',
    source_label TEXT DEFAULT '',
    importance_score FLOAT DEFAULT 0.5,
    access_count INT DEFAULT 0,
    last_accessed TIMESTAMPTZ DEFAULT now(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT DEFAULT '',
    avatar_url TEXT DEFAULT '',
    research_domain TEXT DEFAULT '',
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ──────────────────────────────────────────────────────────
-- COLLAB TABLES
-- ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS research_servers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    icon TEXT DEFAULT '🔬',
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE NOT NULL,
    is_public BOOLEAN DEFAULT FALSE,
    members_count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS research_servers_invite_code_idx ON research_servers (invite_code);
CREATE INDEX IF NOT EXISTS research_servers_public_idx ON research_servers (is_public, members_count DESC);

CREATE TABLE IF NOT EXISTS server_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES research_servers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (server_id, user_id)
);

CREATE INDEX IF NOT EXISTS server_members_user_idx ON server_members (user_id);
CREATE INDEX IF NOT EXISTS server_members_server_idx ON server_members (server_id);

CREATE TABLE IF NOT EXISTS server_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES research_servers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL DEFAULT 'Researcher',
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'ai')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_server_messages_server_id ON server_messages(server_id, created_at DESC);

-- ──────────────────────────────────────────────────────────
-- TRIGGER: AUTO UPDATE members_count
-- ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_server_members_count()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE research_servers SET members_count = members_count + 1, updated_at = NOW() WHERE id = NEW.server_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE research_servers SET members_count = GREATEST(1, members_count - 1), updated_at = NOW() WHERE id = OLD.server_id;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_server_members_count ON server_members;
CREATE TRIGGER trg_server_members_count
    AFTER INSERT OR DELETE ON server_members
    FOR EACH ROW EXECUTE FUNCTION update_server_members_count();

-- ──────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- ──────────────────────────────────────────────────────────

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE concepts ENABLE ROW LEVEL SECURITY;
ALTER TABLE concept_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$
DECLARE pol record;
BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Core policies
CREATE POLICY "proj_all" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "sess_all" ON sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "msgs_all" ON messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "mem_all" ON memory_chunks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "conc_all" ON concepts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "rel_all" ON concept_relationships FOR ALL USING (
    EXISTS (SELECT 1 FROM concepts c WHERE c.id = from_concept_id AND c.user_id = auth.uid())
);
CREATE POLICY "dig_all" ON research_digests FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "prof_all" ON user_profiles FOR ALL USING (auth.uid() = id);

-- Server policies
CREATE POLICY "srv_sel" ON research_servers FOR SELECT TO authenticated
    USING (is_public = TRUE OR owner_id = auth.uid() OR id IN (
        SELECT server_id FROM server_members WHERE user_id = auth.uid()
    ));
CREATE POLICY "srv_ins" ON research_servers FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "srv_upd" ON research_servers FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "srv_del" ON research_servers FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- Server member policies
CREATE POLICY "smbr_sel" ON server_members FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR server_id IN (SELECT id FROM research_servers WHERE owner_id = auth.uid()));
CREATE POLICY "smbr_ins" ON server_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "smbr_del" ON server_members FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Server message policies
CREATE POLICY "smsg_sel" ON server_messages FOR SELECT
    USING (EXISTS (SELECT 1 FROM server_members sm WHERE sm.server_id = server_messages.server_id AND sm.user_id = auth.uid()));
CREATE POLICY "smsg_ins" ON server_messages FOR INSERT WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (SELECT 1 FROM server_members sm WHERE sm.server_id = server_messages.server_id AND sm.user_id = auth.uid())
);

-- ──────────────────────────────────────────────────────────
-- RELOAD PGRST SCHEMA CACHE
-- ──────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

SELECT 'SUCCESS: All tables created and schema cache reloaded' AS result;
