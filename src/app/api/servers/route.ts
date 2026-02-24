import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const mine = searchParams.get('mine') === 'true';
    const isPublic = searchParams.get('public') === 'true';
    const search = searchParams.get('q') || '';
    const code = searchParams.get('code') || '';
    const membersOfServer = searchParams.get('members') || ''; // NEW: get members of a server

    try {
        // Verify user via cookie-based auth
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // Use admin client for DB queries (bypasses RLS reliably)
        const admin = createAdminSupabaseClient();

        // ── NEW: Return members list for a specific server ──
        if (membersOfServer) {
            // Verify requesting user is a member
            const { data: myMembership } = await admin
                .from('server_members')
                .select('role')
                .eq('server_id', membersOfServer)
                .eq('user_id', user.id)
                .maybeSingle();

            if (!myMembership) return NextResponse.json({ error: 'Not a member' }, { status: 403 });

            // Get all members
            const { data: members } = await admin
                .from('server_members')
                .select('user_id, role, joined_at')
                .eq('server_id', membersOfServer)
                .order('joined_at', { ascending: true });

            if (!members || members.length === 0) return NextResponse.json({ members: [] });

            // Get names from user_profiles for each member
            const userIds = members.map((m: { user_id: string }) => m.user_id);
            const { data: profiles } = await admin
                .from('user_profiles')
                .select('id, full_name')
                .in('id', userIds);

            const profileMap = new Map((profiles || []).map((p: { id: string; full_name: string }) => [p.id, p.full_name]));

            // Also get auth metadata for fallback names
            const membersWithNames = members.map((m: { user_id: string; role: string; joined_at: string }) => ({
                user_id: m.user_id,
                role: m.role,
                joined_at: m.joined_at,
                name: profileMap.get(m.user_id) || 'Researcher',
            }));

            return NextResponse.json({ members: membersWithNames });
        }

        if (code) {
            const { data } = await admin
                .from('research_servers')
                .select('*')
                .eq('invite_code', code.toUpperCase())
                .single();
            return NextResponse.json({ server: data || null });
        }

        if (mine) {
            const { data, error } = await admin
                .from('server_members')
                .select('role, research_servers(*)')
                .eq('user_id', user.id)
                .order('joined_at', { ascending: false });

            if (error) throw error;

            const servers = (data || []).map((row: { role: string; research_servers: unknown }) => ({
                ...(row.research_servers as Record<string, unknown>),
                my_role: row.role,
            }));
            return NextResponse.json({ servers });
        }

        if (isPublic) {
            let query = admin
                .from('research_servers')
                .select('*')
                .eq('is_public', true)
                .order('members_count', { ascending: false })
                .limit(20);
            if (search) query = query.ilike('name', `%${search}%`);
            const { data, error } = await query;
            if (error) throw error;
            return NextResponse.json({ servers: data || [] });
        }

        return NextResponse.json({ servers: [] });
    } catch (err) {
        console.error('[servers GET]', err);
        return NextResponse.json({ servers: [], error: String(err) }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // Verify identity first
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        if (!body.name?.trim()) return NextResponse.json({ error: 'Server name is required' }, { status: 400 });

        // Use admin client — bypasses RLS, no auth context issues
        const admin = createAdminSupabaseClient();
        const code = `CLR-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        // Insert server — start members_count at 0, trigger will increment to 1 on member insert
        const { data: server, error: serverErr } = await admin
            .from('research_servers')
            .insert({
                name: body.name.trim(),
                description: body.description || '',
                icon: body.icon || '🔬',
                owner_id: user.id,
                invite_code: code,
                is_public: body.is_public ?? false,
                members_count: 0,
            })
            .select()
            .single();

        if (serverErr) throw serverErr;

        // Auto-join owner as member (trigger updates members_count to 1)
        const { error: memberErr } = await admin
            .from('server_members')
            .insert({ server_id: server.id, user_id: user.id, role: 'owner' });

        if (memberErr) throw memberErr;

        return NextResponse.json({ server: { ...server, my_role: 'owner' } });
    } catch (err) {
        console.error('[servers POST]', err);
        return NextResponse.json({ error: `Failed to create server: ${err instanceof Error ? err.message : (err as any)?.message || JSON.stringify(err)}` }, { status: 500 });
    }
}

// PATCH: update server visibility (owner only)
export async function PATCH(req: NextRequest) {
    try {
        // Auth: cookie-based first, then Bearer token fallback (same as chat route)
        let userId: string | null = null;
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            userId = user.id;
        } else {
            const authHeader = req.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.slice(7);
                const admin = createAdminSupabaseClient();
                const { data: { user: tokenUser } } = await admin.auth.getUser(token);
                if (tokenUser) userId = tokenUser.id;
            }
        }
        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const body = await req.json();
        const { is_public } = body;

        if (typeof is_public !== 'boolean') {
            return NextResponse.json({ error: 'is_public (boolean) required' }, { status: 400 });
        }

        // Use admin client to bypass RLS for ownership check + update
        const admin = createAdminSupabaseClient();

        const { data: existing, error: fetchErr } = await admin
            .from('research_servers')
            .select('id, owner_id')
            .eq('id', id)
            .single();

        if (fetchErr || !existing) return NextResponse.json({ error: 'Server not found' }, { status: 404 });
        if (existing.owner_id !== userId) return NextResponse.json({ error: 'Only the owner can change visibility' }, { status: 403 });

        const { data: updated, error: updateErr } = await admin
            .from('research_servers')
            .update({ is_public, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (updateErr) throw updateErr;

        return NextResponse.json({ server: updated });
    } catch (err) {
        console.error('[servers PATCH]', err);
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Failed to update server' }, { status: 500 });
    }
}
