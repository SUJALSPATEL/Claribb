import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { openai } from '@/lib/openai';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const projectId = req.nextUrl.searchParams.get('projectId');
        if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

        // Get all sessions with summaries for this project
        const { data: sessions } = await supabase
            .from('sessions')
            .select('id, title, summary, created_at, open_questions, resolved_questions, status')
            .eq('project_id', projectId)
            .eq('user_id', user.id)
            .not('summary', 'is', null)
            .order('created_at', { ascending: true });

        if (!sessions || sessions.length < 2) {
            return NextResponse.json({
                evolution: [],
                message: 'Need at least 2 completed sessions to track belief evolution.',
                sessionCount: sessions?.length ?? 0,
            });
        }

        const sessionSummaries = sessions
            .map((s, i) => `Session ${i + 1} (${new Date(s.created_at).toLocaleDateString()}): ${s.summary}`)
            .join('\n\n');

        const response = await openai.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `You are analyzing how a researcher's understanding and beliefs have EVOLVED over multiple research sessions.

Identify:
1. Their INITIAL position/belief at the start
2. Key TURNING POINTS where their understanding shifted
3. What CAUSED each shift (new evidence, contradictions found, external info)
4. Their CURRENT position
5. Whether their thinking is converging or still evolving

Return JSON ONLY:
{
  "initial_position": "What they believed at session 1",
  "current_position": "What they believe now",
  "certainty_trend": "increasing|decreasing|oscillating|stable",
  "evolution_steps": [
    {
      "session_num": 1,
      "date": "Oct 3",
      "position": "Their position at this point",
      "trigger": "What caused a shift (or null if no shift)",
      "confidence": 0.5,
      "shift_type": "reinforced|questioned|reversed|refined|expanded"
    }
  ],
  "total_shifts": 2,
  "biggest_shift": "Description of the most significant position change",
  "unresolved_tension": "The core unresolved tension in their research",
  "convergence_prediction": "Are they close to a final position?"
}`
                },
                {
                    role: 'user',
                    content: `Analyze the belief evolution across these research sessions:\n\n${sessionSummaries}`
                }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.4,
            max_tokens: 800,
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');
        return NextResponse.json({
            ...result,
            sessionCount: sessions.length,
            sessions: sessions.map(s => ({
                id: s.id,
                title: s.title,
                created_at: s.created_at,
                summary: s.summary?.slice(0, 200),
            })),
        });

    } catch (error) {
        console.error('Evolution error:', error);
        return NextResponse.json({ error: 'Failed to analyze belief evolution' }, { status: 500 });
    }
}
