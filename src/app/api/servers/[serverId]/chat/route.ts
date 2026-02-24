import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { openai } from '@/lib/openai';

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ serverId: string }> }) {
    try {
        const { serverId } = await params;

        // Auth: try cookie-based first, then Bearer token fallback
        let userId: string | null = null;
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            userId = user.id;
        } else {
            // Fallback: Bearer token sent from client
            const authHeader = req.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const token = authHeader.slice(7);
                const admin = createAdminSupabaseClient();
                const { data: { user: tokenUser } } = await admin.auth.getUser(token);
                if (tokenUser) userId = tokenUser.id;
            }
        }

        if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const admin = createAdminSupabaseClient();

        // Verify user is a member of this server
        const { data: membership } = await admin
            .from('server_members')
            .select('role')
            .eq('server_id', serverId)
            .eq('user_id', userId)
            .maybeSingle();

        if (!membership) return NextResponse.json({ error: 'Not a server member' }, { status: 403 });

        const { question, serverName, history } = await req.json();
        if (!question?.trim()) return NextResponse.json({ error: 'question required' }, { status: 400 });

        // Build context from recent chat history
        const recentHistory = (history || []).slice(-10).map((m: { role: string; content: string; user_name?: string }) => ({
            role: m.role === 'ai' ? 'assistant' : 'user',
            content: m.role === 'user' ? `${m.user_name || 'Researcher'}: ${m.content}` : m.content,
        }));

        const response = await openai.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `You are Claribb.AI, an AI research assistant inside a collaborative research server called "${serverName || 'Research Server'}".

LANGUAGE RULE (most important): Always reply in the SAME language/style as the user's message.
- If the user writes in English → reply in English.
- If the user writes in Hinglish (Hindi + English mix) → reply in Hinglish.
- If the user writes in Hindi → reply in Hindi.
- Mirror their tone and formality level exactly.

BEHAVIOR:
- Be concise and insightful. Keep responses under 250 words unless deep analysis is needed.
- You are talking to a group of researchers collaborating together — be engaging and inclusive.
- No need to say "Great question" every time. Be natural.`,
                },
                ...recentHistory,
                { role: 'user', content: question },
            ],
            temperature: 0.7,
            max_tokens: 500,
        });

        const aiContent = response.choices[0].message.content || 'I could not generate a response.';

        // Save AI message using admin client (bypasses RLS — AI writes on behalf of system)
        const { error: insertErr } = await admin.from('server_messages').insert({
            server_id: serverId,
            user_id: userId,          // attributed to the user who triggered it
            user_name: 'Claribb.AI',
            role: 'ai',
            content: aiContent,
        });

        if (insertErr) {
            console.error('[server chat AI] insert error:', insertErr);
        }

        return NextResponse.json({ content: aiContent });
    } catch (err) {
        console.error('[server chat AI]', err);
        return NextResponse.json({ error: String(err) }, { status: 500 });
    }
}
