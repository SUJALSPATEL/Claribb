import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { embedText } from '@/lib/openai';

export const runtime = 'nodejs';
export const maxDuration = 20;

export async function GET(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const conceptId = searchParams.get('conceptId');
        const projectId = searchParams.get('projectId');

        if (!conceptId || !projectId) {
            return NextResponse.json({ error: 'conceptId and projectId required' }, { status: 400 });
        }

        // 1. Get the concept itself
        const { data: concept, error: conceptError } = await supabase
            .from('concepts')
            .select('id, label, weight, cluster, color, created_at')
            .eq('id', conceptId)
            .eq('user_id', user.id)
            .single();

        if (conceptError || !concept) {
            return NextResponse.json({ error: 'Concept not found' }, { status: 404 });
        }

        // 2. Get related concepts (connected by relationship)
        const { data: relFrom } = await supabase
            .from('concept_relationships')
            .select('id, relationship_type, strength, target_id:to_concept_id')
            .eq('from_concept_id', conceptId)
            .eq('project_id', projectId)
            .limit(6);

        const { data: relTo } = await supabase
            .from('concept_relationships')
            .select('id, relationship_type, strength, source_id:from_concept_id')
            .eq('to_concept_id', conceptId)
            .eq('project_id', projectId)
            .limit(6);

        // Collect related concept IDs
        const relatedIds = [
            ...(relFrom || []).map(r => r.target_id),
            ...(relTo || []).map(r => r.source_id),
        ].filter(Boolean).slice(0, 8);

        let relatedConcepts: Array<{ id: string; label: string; weight: number }> = [];
        if (relatedIds.length > 0) {
            const { data: rc } = await supabase
                .from('concepts')
                .select('id, label, weight, cluster')
                .in('id', relatedIds)
                .eq('user_id', user.id);
            relatedConcepts = rc || [];
        }

        // 3. Find memory chunks that mention this concept — use embedding similarity
        const embedding = await embedText(concept.label);
        const embeddingStr = `[${embedding.join(',')}]`;

        const { data: memories } = await supabase.rpc('match_memories', {
            query_embedding: embeddingStr,
            match_threshold: 0.60,
            match_count: 6,
            p_project_id: projectId,
            p_user_id: user.id,
        });

        // Also do a text-based search as fallback/supplement
        const { data: textMemories } = await supabase
            .from('memory_chunks')
            .select('id, content, source_type, source_label, importance_score, created_at')
            .eq('project_id', projectId)
            .eq('user_id', user.id)
            .ilike('content', `%${concept.label.split(' ')[0]}%`) // first word match
            .order('importance_score', { ascending: false })
            .limit(4);

        // Merge and deduplicate
        const seenIds = new Set<string>();
        const allMemories: Array<{
            id: string; content: string; source_type: string; source_label: string;
            importance_score: number; created_at: string; similarity?: number;
        }> = [];

        for (const m of [...(memories || []), ...(textMemories || [])]) {
            if (!seenIds.has(m.id)) {
                seenIds.add(m.id);
                allMemories.push(m);
            }
        }

        return NextResponse.json({
            concept,
            memories: allMemories.slice(0, 8),
            relatedConcepts,
            relationships: [
                ...(relFrom || []).map(r => ({ ...r, direction: 'from' })),
                ...(relTo || []).map(r => ({ ...r, direction: 'to' })),
            ],
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch node details';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
