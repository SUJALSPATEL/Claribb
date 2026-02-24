import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { openai } from '@/lib/openai';
import { storeMemory } from '@/lib/memory/store';

export const runtime = 'nodejs';

// GET: list sessions OR fetch a single session with messages
export async function GET(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('projectId');
        const sessionId = searchParams.get('sessionId');

        if (sessionId) {
            const { data: session } = await supabase
                .from('sessions')
                .select('*')
                .eq('id', sessionId)
                .eq('user_id', user.id)
                .single();
            if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

            const { data: msgs } = await supabase
                .from('messages')
                .select('id, role, content, created_at')
                .eq('session_id', sessionId)
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            return NextResponse.json({ session, messages: msgs || [] });
        }

        if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

        const { data: sessions } = await supabase
            .from('sessions')
            .select('*')
            .eq('project_id', projectId)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(30);

        return NextResponse.json({ sessions: sessions || [] });
    } catch {
        return NextResponse.json({ sessions: [] });
    }
}

// POST: create a new session
export async function POST(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { projectId } = await req.json();
        if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

        const { data: session, error } = await supabase
            .from('sessions')
            .insert({
                project_id: projectId,
                user_id: user.id,
                title: `Session — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
            })
            .select()
            .single();

        // If table doesn't exist, return a mock session so workspace still loads
        if (error) {
            console.warn('[sessions POST] table may not exist:', error.message);
            return NextResponse.json({
                session: {
                    id: `local-${Date.now()}`,
                    project_id: projectId,
                    user_id: user.id,
                    title: 'Research Session',
                    summary: '',
                    message_count: 0,
                    created_at: new Date().toISOString(),
                    ended_at: null,
                }
            });
        }

        return NextResponse.json({ session });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to create session';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// PATCH: end a session — save messages + generate summary
export async function PATCH(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { sessionId, projectId, conversationHistory } = await req.json();
        if (!sessionId || !conversationHistory?.length) {
            return NextResponse.json({ error: 'sessionId and conversationHistory required' }, { status: 400 });
        }

        // Save messages to DB if not already saved
        // Insert each message into the messages table
        const messagesToInsert = conversationHistory
            .filter((m: { role: string; content: string }) => m.content?.trim())
            .map((m: { role: string; content: string }) => ({
                session_id: sessionId,
                project_id: projectId,
                user_id: user.id,
                role: m.role,
                content: m.content,
            }));

        if (messagesToInsert.length > 0) {
            // Use upsert-like approach: delete existing and reinsert (simple, avoids duplicate check)
            await supabase.from('messages').delete().eq('session_id', sessionId).eq('user_id', user.id);
            await supabase.from('messages').insert(messagesToInsert);
        }

        // Generate session summary
        const conversationText = conversationHistory
            .map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`)
            .join('\n\n');

        const response = await openai.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `Analyze this research conversation and generate a structured summary. Return JSON only.`,
                },
                {
                    role: 'user',
                    content: `Research conversation:\n\n${conversationText.slice(0, 6000)}\n\nReturn JSON: {
  "title": "brief session title (max 60 chars)",
  "summary": "2-3 sentence research summary",
  "resolved": ["what was answered/resolved"],
  "open_questions": ["what questions remain unanswered"],
  "key_insights": ["most important insights from this session"]
}`,
                },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.4,
        });

        const parsed = JSON.parse(response.choices[0].message.content || '{}');

        // Update session with summary
        const { error: updateError } = await supabase
            .from('sessions')
            .update({
                title: parsed.title || 'Research Session',
                summary: parsed.summary || '',
                open_questions: parsed.open_questions || [],
                resolved_questions: parsed.resolved || [],
                message_count: messagesToInsert.length,
                ended_at: new Date().toISOString(),
            })
            .eq('id', sessionId)
            .eq('user_id', user.id);

        if (updateError) throw updateError;

        // Store session summary as memory
        if (parsed.summary && projectId) {
            await storeMemory({
                userId: user.id,
                projectId,
                content: `Session Summary: ${parsed.summary}\n\nKey Insights:\n${(parsed.key_insights || []).join('\n')}`,
                sourceType: 'session',
                sourceLabel: parsed.title || 'Session',
                importanceScore: 0.8,
            });
        }

        return NextResponse.json({
            success: true,
            summary: parsed.summary,
            openQuestions: parsed.open_questions || [],
            resolved: parsed.resolved || [],
            title: parsed.title,
        });

    } catch (error: unknown) {
        console.error('Session end error:', error);
        const message = error instanceof Error ? error.message : 'Failed to end session';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
