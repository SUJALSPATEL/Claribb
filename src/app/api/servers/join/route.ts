import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        // Verify user
        const supabase = await createServerSupabaseClient();
        const { data: { user }, error: authErr } = await supabase.auth.getUser();
        if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { invite_code } = await req.json();
        if (!invite_code) return NextResponse.json({ error: 'invite_code required' }, { status: 400 });

        const admin = createAdminSupabaseClient();

        // Normalize code — accept both "CLR-XXXXXX" and just "XXXXXX"
        let normalizedCode = (invite_code as string).trim().toUpperCase();
        if (!normalizedCode.startsWith('CLR-')) {
            normalizedCode = `CLR-${normalizedCode}`;
        }

        // Use maybeSingle() — returns null (no error) when 0 rows found
        const { data: server, error: findErr } = await admin
            .from('research_servers')
            .select('*')
            .eq('invite_code', normalizedCode)
            .maybeSingle();

        if (findErr) {
            console.error('[join] DB error:', findErr);
            return NextResponse.json({ error: 'Database error while looking up the code.' }, { status: 500 });
        }

        if (!server) {
            return NextResponse.json({
                error: 'Server not found. This code may be expired or invalid. Ask the server owner to share a fresh invite code.',
            }, { status: 404 });
        }

        // Check if already a member
        const { data: existing } = await admin
            .from('server_members')
            .select('id')
            .eq('server_id', server.id)
            .eq('user_id', user.id)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ server, already_member: true });
        }

        // Join
        const { error: joinErr } = await admin
            .from('server_members')
            .insert({ server_id: server.id, user_id: user.id, role: 'member' });

        if (joinErr) throw joinErr;

        return NextResponse.json({ server, joined: true });
    } catch (err) {
        console.error('[servers/join POST]', err);
        return NextResponse.json({ error: `Failed to join: ${String(err)}` }, { status: 500 });
    }
}
