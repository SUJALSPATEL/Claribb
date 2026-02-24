-- ============================================================
-- CLARIBB Schema v3 — Collab Feature
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- Adds: research_servers, server_members tables
-- ============================================================

-- ============================================================
-- TABLE: research_servers
-- ============================================================
CREATE TABLE IF NOT EXISTS research_servers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    description     TEXT DEFAULT '',
    icon            TEXT DEFAULT '🔬',
    owner_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invite_code     TEXT UNIQUE NOT NULL,
    is_public       BOOLEAN DEFAULT FALSE,
    members_count   INT DEFAULT 1,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast invite code lookups  
CREATE UNIQUE INDEX IF NOT EXISTS research_servers_invite_code_idx ON research_servers (invite_code);

-- Index for public server discovery
CREATE INDEX IF NOT EXISTS research_servers_public_idx ON research_servers (is_public, members_count DESC);

-- ============================================================
-- TABLE: server_members
-- ============================================================
CREATE TABLE IF NOT EXISTS server_members (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id   UUID NOT NULL REFERENCES research_servers(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role        TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (server_id, user_id)
);

-- Index for quick member lookups
CREATE INDEX IF NOT EXISTS server_members_user_idx ON server_members (user_id);
CREATE INDEX IF NOT EXISTS server_members_server_idx ON server_members (server_id);

-- ============================================================
-- Auto-update members_count when someone joins/leaves
-- ============================================================
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

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE research_servers ENABLE ROW LEVEL SECURITY;
ALTER TABLE server_members   ENABLE ROW LEVEL SECURITY;

-- Public servers: anyone (authenticated) can read
CREATE POLICY "Public servers are viewable by authenticated users"
    ON research_servers FOR SELECT
    TO authenticated
    USING (is_public = TRUE OR owner_id = auth.uid() OR id IN (
        SELECT server_id FROM server_members WHERE user_id = auth.uid()
    ));

-- Only authenticated users can create servers
CREATE POLICY "Authenticated users can create servers"
    ON research_servers FOR INSERT
    TO authenticated
    WITH CHECK (owner_id = auth.uid());

-- Owner can update their own server
CREATE POLICY "Owners can update their servers"
    ON research_servers FOR UPDATE
    TO authenticated
    USING (owner_id = auth.uid());

-- Owner can delete their own server
CREATE POLICY "Owners can delete their servers"
    ON research_servers FOR DELETE
    TO authenticated
    USING (owner_id = auth.uid());

-- Members can read their own memberships
CREATE POLICY "Members can view server memberships"
    ON server_members FOR SELECT
    TO authenticated
    USING (user_id = auth.uid() OR server_id IN (
        SELECT id FROM research_servers WHERE owner_id = auth.uid()
    ));

-- Authenticated users can join (insert themselves)
CREATE POLICY "Users can join servers"
    ON server_members FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can leave (delete their own membership)
CREATE POLICY "Users can leave servers"
    ON server_members FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
