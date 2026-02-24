import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { openai } from '@/lib/openai';
import { embedText, formatEmbedding } from '@/lib/openai';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { projectId, query } = await req.json();
        if (!projectId || !query) {
            return NextResponse.json({ error: 'projectId and query required' }, { status: 400 });
        }

        const admin = createAdminSupabaseClient();

        // 1. Get all OTHER projects for this user
        const { data: otherProjects } = await admin
            .from('projects')
            .select('id, name')
            .eq('user_id', user.id)
            .neq('id', projectId);

        if (!otherProjects || otherProjects.length === 0) {
            return NextResponse.json({ insights: [], message: 'No other projects to search across yet.' });
        }

        // 2. Embed the current query
        const queryEmbedding = await embedText(query);

        // 3. Search memories across ALL other projects
        const crossProjectMemories: Array<{ project_id: string; project_name: string; content: string; similarity: number; source_label: string }> = [];

        for (const project of otherProjects.slice(0, 5)) {
            const { data } = await admin.rpc('search_memories', {
                query_embedding: formatEmbedding(queryEmbedding),
                match_project_id: project.id,
                match_user_id: user.id,
                match_threshold: 0.72,
                match_count: 3,
            });

            if (data && data.length > 0) {
                crossProjectMemories.push(...data.map((m: { content: string; similarity: number; source_label: string }) => ({
                    project_id: project.id,
                    project_name: project.name,
                    content: m.content,
                    similarity: m.similarity,
                    source_label: m.source_label,
                })));
            }
        }

        if (crossProjectMemories.length === 0) {
            return NextResponse.json({ insights: [], message: 'No cross-project connections found yet.' });
        }

        // 4. Use LLM to synthesize surprising connections
        const memorySummary = crossProjectMemories
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 6)
            .map(m => `[From "${m.project_name}"]: ${m.content.slice(0, 250)}`)
            .join('\n\n');

        const response = await openai.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `You are a serendipity engine. You identify non-obvious, intellectually surprising connections between research from DIFFERENT projects. 
                    
Your goal: surface insight that the researcher would NEVER have found by staying within their current project. Focus on connections that are surprising, useful, and potentially paradigm-shifting.

Return JSON ONLY:
{
  "insights": [
    {
      "from_project": "Project name",
      "connection": "The surprising connection (2-3 sentences)",
      "why_it_matters": "Why this changes the current research",
      "strength": 0.85,
      "type": "analogy|evidence|contradiction|method|framework"
    }
  ],
  "meta_insight": "The big-picture pattern across all these cross-project connections"
}`
                },
                {
                    role: 'user',
                    content: `Current research query: "${query}"\n\nRelated memories from OTHER projects:\n${memorySummary}\n\nFind the most surprising and useful connections.`
                }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
            max_tokens: 600,
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');
        return NextResponse.json({
            insights: result.insights || [],
            metaInsight: result.meta_insight || '',
            projectsSearched: otherProjects.length,
            memoriesFound: crossProjectMemories.length,
        });

    } catch (error) {
        console.error('Serendipity error:', error);
        return NextResponse.json({ error: 'Failed to find cross-project insights' }, { status: 500 });
    }
}
