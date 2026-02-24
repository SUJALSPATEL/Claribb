-- Server chat messages table
CREATE TABLE IF NOT EXISTS server_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    server_id UUID NOT NULL REFERENCES research_servers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL DEFAULT 'Researcher',
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'ai')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast server message fetching
CREATE INDEX IF NOT EXISTS idx_server_messages_server_id ON server_messages(server_id, created_at DESC);

-- Enable RLS
ALTER TABLE server_messages ENABLE ROW LEVEL SECURITY;

-- Members of a server can read messages
CREATE POLICY "Server members can read messages" ON server_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM server_members sm
            WHERE sm.server_id = server_messages.server_id
              AND sm.user_id = auth.uid()
        )
    );

-- Members can insert messages
CREATE POLICY "Server members can send messages" ON server_messages
    FOR INSERT WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM server_members sm
            WHERE sm.server_id = server_messages.server_id
              AND sm.user_id = auth.uid()
        )
    );

-- Enable Realtime for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE server_messages;
