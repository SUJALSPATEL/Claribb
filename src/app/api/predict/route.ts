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

        // Get sessions + recent memories to understand research pattern
        const [sessionsRes, memoriesRes] = await Promise.all([
            supabase
                .from('sessions')
                .select('id, title, summary, open_questions, resolved_questions, created_at')
                .eq('project_id', projectId)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(5),
            supabase
                .from('memory_chunks')
                .select('content, source_label, created_at')
                .eq('project_id', projectId)
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(10),
        ]);

        const sessions = sessionsRes.data || [];
        const memories = memoriesRes.data || [];

        if (sessions.length === 0) {
            return NextResponse.json({ predictions: [], message: 'Need at least 1 session to predict trajectory.' });
        }

        const context = [
            sessions.length > 0 ? `Recent sessions:\n${sessions.map(s => `- ${s.title || 'Session'}: ${s.summary?.slice(0, 150) || 'No summary'}`).join('\n')}` : '',
            memories.length > 0 ? `Recent research:\n${memories.slice(0, 5).map(m => `- ${m.content.slice(0, 120)}`).join('\n')}` : '',
        ].filter(Boolean).join('\n\n');

        const response = await openai.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `You are a research trajectory predictor. Based on a researcher's history, predict where their research is going.

You must predict:
1. Their NEXT 3-4 questions (very specific, not generic)
2. What CONCLUSIONS they'll likely reach
3. What ROADBLOCKS they'll hit
4. Their likely FINAL POSITION on this topic

Predictions should be specific enough to be VERIFIABLE later.

Return JSON ONLY:
{
  "next_questions": [
    { "question": "Specific question they'll ask", "confidence": 0.85, "reason": "Why I predict this" }
  ],
  "likely_conclusions": [
    { "conclusion": "A conclusion they'll reach", "confidence": 0.75, "timeline": "2-3 sessions" }
  ],
  "predicted_roadblocks": [
    { "roadblock": "Challenge they'll hit", "severity": "high|medium|low" }
  ],
  "final_position_prediction": "Where their research will land",
  "research_maturity": "early|developing|maturing|near-complete",
  "estimated_sessions_to_completion": 4,
  "trajectory_type": "converging|diverging|stuck|accelerating"
}`
                },
                {
                    role: 'user',
                    content: `Predict the research trajectory based on:\n\n${context}`
                }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.5,
            max_tokens: 700,
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');

        // Store prediction for later accuracy tracking
        const predictionRecord = {
            project_id: projectId,
            user_id: user.id,
            predictions: result,
            created_at: new Date().toISOString(),
            verified: false,
        };

        // Store in memory_chunks as a special prediction record (best-effort)
        try {
            await supabase.from('memory_chunks').insert({
                user_id: user.id,
                project_id: projectId,
                content: `[CLARIBB PREDICTION] ${result.final_position_prediction || ''}\nNext questions: ${result.next_questions?.map((q: { question: string }) => q.question).join('; ')}`,
                embedding: Array(1536).fill(0),
                source_type: 'note',
                source_label: `CLARIBB Prediction — ${new Date().toLocaleDateString()}`,
                importance_score: 0.9,
                metadata: { type: 'prediction', data: predictionRecord },
            });
        } catch { /* non-fatal */ }

        return NextResponse.json({ ...result, sessionCount: sessions.length });

    } catch (error) {
        console.error('Prediction error:', error);
        return NextResponse.json({ error: 'Failed to predict trajectory' }, { status: 500 });
    }
}
