import { createAdminSupabaseClient } from '@/lib/supabase/server';
import { embedText, embedBatch, formatEmbedding } from '@/lib/openai';
import { chunkText, cleanText } from './chunker';
import { openai } from '@/lib/openai';
import type { MemoryChunk } from '@/types';

export interface StoreMemoryOptions {
    userId: string;
    projectId: string;
    content: string;
    sourceType: MemoryChunk['source_type'];
    sourceLabel: string;
    importanceScore?: number;
    metadata?: Record<string, unknown>;
}

// Store a large text by chunking it and embedding each chunk
export async function storeMemory(opts: StoreMemoryOptions): Promise<number> {
    const supabase = createAdminSupabaseClient();
    const cleaned = cleanText(opts.content);
    const chunks = chunkText(cleaned);

    if (chunks.length === 0) return 0;

    // Embed all chunks in batch
    const embeddings = await embedBatch(chunks);

    // Build rows for bulk insert
    const rows = chunks.map((chunk, i) => ({
        user_id: opts.userId,
        project_id: opts.projectId,
        content: chunk,
        embedding: formatEmbedding(embeddings[i]),
        source_type: opts.sourceType,
        source_label: opts.sourceLabel,
        importance_score: opts.importanceScore ?? 0.5,
        metadata: opts.metadata ?? {},
    }));

    const { error } = await supabase.from('memory_chunks').insert(rows);
    if (error) throw new Error(`Memory store failed: ${error.message}`);

    return chunks.length;
}

// Store a single short memory chunk (e.g., a quick note)
export async function storeSingleMemory(opts: StoreMemoryOptions): Promise<string> {
    const supabase = createAdminSupabaseClient();
    const embedding = await embedText(opts.content);

    const { data, error } = await supabase
        .from('memory_chunks')
        .insert({
            user_id: opts.userId,
            project_id: opts.projectId,
            content: opts.content,
            embedding: formatEmbedding(embedding),
            source_type: opts.sourceType,
            source_label: opts.sourceLabel,
            importance_score: opts.importanceScore ?? 0.5,
            metadata: opts.metadata ?? {},
        })
        .select('id')
        .single();

    if (error) throw new Error(`Memory store failed: ${error.message}`);
    return data.id;
}

// Retrieve semantically similar memories
export async function retrieveMemories(
    query: string,
    projectId: string,
    userId: string,
    threshold: number = 0.68,
    limit: number = 8
): Promise<MemoryChunk[]> {
    const supabase = createAdminSupabaseClient();
    const queryEmbedding = await embedText(query);

    const { data, error } = await supabase.rpc('search_memories', {
        query_embedding: formatEmbedding(queryEmbedding),
        match_project_id: projectId,
        match_user_id: userId,
        match_threshold: threshold,
        match_count: limit,
    });

    if (error) {
        console.error('Memory retrieval error:', error);
        return [];
    }

    // Increment access count for retrieved memories
    if (data && data.length > 0) {
        const ids = data.map((m: MemoryChunk) => m.id);
        // Update last_accessed for retrieved memories
        try {
            await supabase.rpc('increment_access_count', { memory_ids: ids });
        } catch {
            // Fallback: just update last_accessed if RPC doesn't exist
            await supabase.from('memory_chunks')
                .update({ last_accessed: new Date().toISOString() })
                .in('id', ids);
        }
    }

    return data as MemoryChunk[];
}

// Extract and update concepts from new memory content
export async function extractAndStoreConcepts(
    content: string,
    projectId: string,
    userId: string
): Promise<void> {
    try {
        const response = await openai.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `Extract key concepts and their relationships from the research text.
Return ONLY a JSON object in this exact format:
{
  "concepts": ["concept1", "concept2", ...],
  "relationships": [
    {"from": "concept1", "to": "concept2", "type": "supports|contradicts|extends|questions|related|references", "strength": 0.8}
  ]
}
Keep concepts concise (2-4 words). Extract 3-8 concepts. Extract 2-6 relationships.`
                },
                { role: 'user', content: content.slice(0, 3000) }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3,
        });

        const parsed = JSON.parse(response.choices[0].message.content || '{}');
        const { concepts = [], relationships = [] } = parsed;

        if (concepts.length === 0) return;

        const supabase = createAdminSupabaseClient();

        // Determine cluster colors
        const clusterColors: Record<string, string> = {
            general: '#6366f1',
            policy: '#8b5cf6',
            technology: '#06b6d4',
            research: '#10b981',
            business: '#f59e0b',
            social: '#ec4899',
        };

        // Upsert concepts
        const conceptRows = concepts.map((label: string) => ({
            project_id: projectId,
            user_id: userId,
            label: label.toLowerCase().trim(),
            cluster: 'general',
            weight: 1,
            color: clusterColors.general,
        }));

        const { data: upsertedConcepts } = await supabase
            .from('concepts')
            .upsert(conceptRows, { onConflict: 'project_id,label', ignoreDuplicates: false })
            .select('id, label');

        if (!upsertedConcepts || upsertedConcepts.length === 0) return;

        // Weight increment for existing concepts — non-fatal
        try {
            await supabase.rpc('increment_concept_weights', {
                concept_ids: upsertedConcepts.map((c: { id: string }) => c.id)
            });
        } catch {
            // RPC may not exist, that's fine
        }

        // Build concept label → id map
        const conceptMap: Record<string, string> = {};
        for (const c of upsertedConcepts) {
            conceptMap[c.label.toLowerCase()] = c.id;
        }

        // Upsert relationships
        const relationshipRows = relationships
            .filter((r: { from: string; to: string }) => conceptMap[r.from?.toLowerCase()] && conceptMap[r.to?.toLowerCase()])
            .map((r: { from: string; to: string; type: string; strength: number }) => ({
                project_id: projectId,
                from_concept_id: conceptMap[r.from.toLowerCase()],
                to_concept_id: conceptMap[r.to.toLowerCase()],
                relationship_type: r.type || 'related',
                strength: r.strength || 0.5,
            }));

        if (relationshipRows.length > 0) {
            await supabase
                .from('concept_relationships')
                .upsert(relationshipRows, { onConflict: 'project_id,from_concept_id,to_concept_id', ignoreDuplicates: true });
        }
    } catch (err) {
        console.error('Concept extraction error:', err);
        // Non-fatal — don't throw
    }
}

// Calculate project knowledge depth score (0-100)
export async function calculateDepthScore(projectId: string): Promise<number> {
    const supabase = createAdminSupabaseClient();

    const [memCount, sessionCount, conceptCount, resolvedCount] = await Promise.all([
        supabase.from('memory_chunks').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
        supabase.from('sessions').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
        supabase.from('concepts').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
        supabase.from('sessions').select('resolved_questions').eq('project_id', projectId),
    ]);

    const memories = memCount.count ?? 0;
    const sessions = sessionCount.count ?? 0;
    const concepts = conceptCount.count ?? 0;
    const resolved = resolvedCount.data?.reduce(
        (acc: number, s: { resolved_questions: string[] }) => acc + (s.resolved_questions?.length ?? 0), 0
    ) ?? 0;

    // Scoring formula (normalized to 100)
    const score =
        Math.min(memories / 100, 1) * 35 +
        Math.min(sessions / 20, 1) * 25 +
        Math.min(concepts / 40, 1) * 25 +
        Math.min(resolved / 10, 1) * 15;

    return Math.round(score * 100);
}
