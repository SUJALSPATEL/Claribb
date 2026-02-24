import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { openai } from '@/lib/openai';
import { retrieveMemories } from '@/lib/memory/store';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { projectId, position } = await req.json();
        if (!projectId || !position) {
            return NextResponse.json({ error: 'projectId and position required' }, { status: 400 });
        }

        // Get memories to understand research context
        const memories = await retrieveMemories(position, projectId, user.id, 0.6, 6);
        const memoryContext = memories.map(m => m.content.slice(0, 300)).join('\n\n');

        const response = await openai.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `You are a master debater and intellectual adversary. Your job is NOT to list weak counterarguments — that's too easy. 

Your job is to STEELMAN the opposing position: build the STRONGEST, most intellectually devastating argument AGAINST the user's research position. 

The steelmanned argument should be:
1. More sophisticated than what critics would actually say
2. Based on real evidence and sound reasoning  
3. Hard to dismiss or ignore
4. Potentially paradigm-shifting if true

Return JSON ONLY in this format:
{
  "steelman": "The single most devastating counterargument (4-6 sentences, powerfully written)",
  "strongest_point": "The one insight that most threatens the user's position",
  "required_evidence": "What research would the user need to definitively rebut this?",
  "confidence_dent": 15,
  "intellectual_tradition": "What school of thought does this steelman come from?",
  "concede_points": ["What your steelman grants to the user's position"],
  "pivot_question": "The one question the user must answer to survive this argument"
}`
                },
                {
                    role: 'user',
                    content: `User's research position: "${position}"\n\nRelevant research context:\n${memoryContext || 'No prior research context available.'}\n\nBuild the strongest possible steelmanned argument AGAINST this position.`
                }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.8,
            max_tokens: 700,
        });

        const result = JSON.parse(response.choices[0].message.content || '{}');
        return NextResponse.json({ steelman: result, memoriesAnalyzed: memories.length });

    } catch (error) {
        console.error('Steelman error:', error);
        return NextResponse.json({ error: 'Failed to generate steelman' }, { status: 500 });
    }
}
