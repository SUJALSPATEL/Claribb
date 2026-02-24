import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/server';

export async function POST() {
    try {
        const admin = createAdminSupabaseClient();

        // Run all schema SQL via rpc exec_sql
        const schemas = [
            // core tables
            `CREATE TABLE IF NOT EXISTS projects (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                name TEXT NOT NULL,
                description TEXT DEFAULT '',
                color TEXT DEFAULT '#6366f1',
                icon TEXT DEFAULT '🔬',
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now()
            )`,
            `CREATE TABLE IF NOT EXISTS sessions (
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
            )`,
            `CREATE TABLE IF NOT EXISTS user_profiles (
                id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
                full_name TEXT DEFAULT '',
                avatar_url TEXT DEFAULT '',
                research_domain TEXT DEFAULT '',
                preferences JSONB DEFAULT '{}',
                created_at TIMESTAMPTZ DEFAULT now(),
                updated_at TIMESTAMPTZ DEFAULT now()
            )`,
            // collab tables
            `CREATE TABLE IF NOT EXISTS research_servers (
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
            )`,
            `CREATE TABLE IF NOT EXISTS server_members (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                server_id UUID NOT NULL REFERENCES research_servers(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
                joined_at TIMESTAMPTZ DEFAULT now(),
                UNIQUE (server_id, user_id)
            )`,
            `CREATE TABLE IF NOT EXISTS server_messages (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                server_id UUID NOT NULL REFERENCES research_servers(id) ON DELETE CASCADE,
                user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
                user_name TEXT NOT NULL DEFAULT 'Researcher',
                role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'ai')),
                content TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now()
            )`,
        ];

        const errors: string[] = [];
        for (const sql of schemas) {
            const { error } = await admin.rpc('exec_sql', { sql });
            if (error) errors.push(error.message);
        }

        if (errors.length > 0) {
            return NextResponse.json({ success: false, errors }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'All tables created successfully' });
    } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
    }
}
