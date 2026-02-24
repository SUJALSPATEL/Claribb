import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { openai } from '@/lib/openai';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { projectId } = await req.json();
        if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

        // Get recent sessions (if available)
        const { data: sessions } = await supabase
            .from('sessions')
            .select('summary, open_questions, title, created_at')
            .eq('project_id', projectId)
            .eq('user_id', user.id)
            .not('ended_at', 'is', null)
            .order('created_at', { ascending: false })
            .limit(5);

        // Get memory chunks as fallback / supplement
        const { data: memories } = await supabase
            .from('memory_chunks')
            .select('content, source_type, source_label, created_at')
            .eq('project_id', projectId)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        // Get concept clusters for gap analysis
        const { data: concepts } = await supabase
            .from('concepts')
            .select('label, weight, cluster')
            .eq('project_id', projectId)
            .eq('user_id', user.id)
            .order('weight', { ascending: false })
            .limit(30);

        // Get project info
        const { data: project } = await supabase
            .from('projects')
            .select('name, description')
            .eq('id', projectId)
            .eq('user_id', user.id)
            .single();

        // Build context from whatever is available
        const sessionSummaries = (sessions || []).map(s => s.summary).filter(Boolean).join('\n');
        const memorySnippets = (memories || []).slice(0, 8).map(m => m.content.slice(0, 300)).join('\n---\n');
        const conceptList = (concepts || []).map(c => `${c.label} (weight: ${c.weight})`).join(', ');
        const allOpenQuestions = (sessions || []).flatMap(s => s.open_questions || []);

        // Build rich context
        const contextParts: string[] = [];
        if (project) contextParts.push(`Project: ${project.name}${project.description ? ` - ${project.description}` : ''}`);
        if (sessionSummaries) contextParts.push(`Session summaries:\n${sessionSummaries}`);
        if (memorySnippets) contextParts.push(`Recent research notes:\n${memorySnippets}`);
        if (conceptList) contextParts.push(`Known concepts: ${conceptList}`);
        if (allOpenQuestions.length > 0) contextParts.push(`Open questions: ${allOpenQuestions.slice(0, 10).join(', ')}`);

        // If absolutely nothing is available, generate a starter digest
        if (contextParts.length <= 1) {
            return NextResponse.json({
                digest: {
                    id: null,
                    connections_found: [],
                    gaps_detected: ['Start a research conversation to generate more insights'],
                    suggested_questions: [
                        'What is the main research question for this project?',
                        'What sources or data would be most valuable to explore?',
                        'What is already known about this topic?',
                    ],
                    open_questions: [],
                    is_read: false,
                    created_at: new Date().toISOString(),
                },
            });
        }

        const response = await openai.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `You are a proactive research intelligence system. Analyze the user's research data and generate actionable insights. Return JSON only.`,
                },
                {
                    role: 'user',
                    content: `${contextParts.join('\n\n')}\n\nGenerate a research digest. Return JSON: {
  "connections_found": [{"concept_a": "...", "concept_b": "...", "description": "...", "similarity": 0.85}],
  "gaps_detected": ["underexplored area 1", "underexplored area 2"],
  "suggested_questions": ["...", "..."]
}`,
                },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.6,
        });

        const parsed = JSON.parse(response.choices[0].message.content || '{}');

        // Store digest (non-fatal if table doesn't exist)
        let digestId = null;
        try {
            const { data: digest } = await supabase
                .from('research_digests')
                .insert({
                    project_id: projectId,
                    user_id: user.id,
                    connections_found: parsed.connections_found || [],
                    gaps_detected: parsed.gaps_detected || [],
                    open_questions: allOpenQuestions.slice(0, 5),
                })
                .select()
                .single();
            digestId = digest?.id;
        } catch {
            // Table may not exist yet, that's ok
        }

        return NextResponse.json({
            digest: {
                id: digestId,
                connections_found: parsed.connections_found || [],
                gaps_detected: parsed.gaps_detected || [],
                suggested_questions: parsed.suggested_questions || [],
                open_questions: allOpenQuestions.slice(0, 5),
                is_read: false,
                created_at: new Date().toISOString(),
            },
        });

    } catch (error: unknown) {
        console.error('Digest error:', error);
        const message = error instanceof Error ? error.message : 'Failed to generate digest';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

        try {
            const { data: digest } = await supabase
                .from('research_digests')
                .select('*')
                .eq('project_id', projectId)
                .eq('user_id', user.id)
                .eq('is_read', false)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            return NextResponse.json({ digest: digest || null });
        } catch {
            return NextResponse.json({ digest: null });
        }
    } catch {
        return NextResponse.json({ digest: null });
    }
}
