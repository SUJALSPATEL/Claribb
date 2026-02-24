import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

export async function POST(req: NextRequest) {
    try {
        const { projectId } = await req.json();
        if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

        // Fetch knowledge graph topology
        const [conceptsRes, relsRes, memoriesRes, sessionsRes] = await Promise.all([
            supabase
                .from('concepts')
                .select('id, label, weight, cluster, created_at')
                .eq('project_id', projectId)
                .order('weight', { ascending: false })
                .limit(60),
            supabase
                .from('concept_relationships')
                .select('id, source_id, target_id, relationship_type, strength')
                .eq('project_id', projectId),
            supabase
                .from('memory_chunks')
                .select('content, importance_score, source_type, created_at')
                .eq('project_id', projectId)
                .order('importance_score', { ascending: false })
                .limit(30),
            supabase
                .from('research_sessions')
                .select('summary, key_insights, open_questions')
                .eq('project_id', projectId)
                .not('summary', 'is', null)
                .order('created_at', { ascending: false })
                .limit(10),
        ]);

        const concepts = conceptsRes.data || [];
        const relationships = relsRes.data || [];
        const memories = memoriesRes.data || [];
        const sessions = sessionsRes.data || [];

        if (concepts.length < 3) {
            return NextResponse.json({ error: 'Not enough research data to generate hypotheses. Keep researching!' }, { status: 422 });
        }

        // Topology analysis
        // 1. Find concepts with NO relationships (isolated nodes → unexplored)
        const connectedIds = new Set([
            ...relationships.map(r => r.source_id),
            ...relationships.map(r => r.target_id),
        ]);
        const isolatedConcepts = concepts.filter(c => !connectedIds.has(c.id)).slice(0, 8);

        // 2. Find contradiction pairs
        const contradictions = relationships.filter(r => r.relationship_type === 'contradicts');

        // 3. Find clusters with few cross-cluster edges
        const clusters = [...new Set(concepts.map(c => c.cluster).filter(Boolean))];
        const clusterMap: Record<string, string[]> = {};
        concepts.forEach(c => {
            if (c.cluster) {
                if (!clusterMap[c.cluster]) clusterMap[c.cluster] = [];
                clusterMap[c.cluster].push(c.label);
            }
        });

        // 4. Find high-weight concepts that appear rarely in relationships
        const relCounts: Record<string, number> = {};
        relationships.forEach(r => {
            relCounts[r.source_id] = (relCounts[r.source_id] || 0) + 1;
            relCounts[r.target_id] = (relCounts[r.target_id] || 0) + 1;
        });
        const underexplored = concepts
            .filter(c => c.weight > 2 && (relCounts[c.id] || 0) < 2)
            .slice(0, 6);

        // Prepare topology summary for LLM
        const topologyContext = [
            `CONCEPTS (${concepts.length} total, top by frequency):`,
            concepts.slice(0, 25).map(c => `  • ${c.label} [weight: ${c.weight}, cluster: ${c.cluster || 'uncategorized'}]`).join('\n'),
            '',
            contradictions.length > 0
                ? `CONTRADICTIONS DETECTED (${contradictions.length}):\n` +
                contradictions.map(r => {
                    const src = concepts.find(c => c.id === r.source_id)?.label || r.source_id;
                    const tgt = concepts.find(c => c.id === r.target_id)?.label || r.target_id;
                    return `  • "${src}" CONTRADICTS "${tgt}" (strength: ${r.strength?.toFixed(2)})`;
                }).join('\n')
                : 'NO CONTRADICTIONS FOUND',
            '',
            isolatedConcepts.length > 0
                ? `ISOLATED CONCEPTS — appear in research but have NO mapped connections:\n` +
                isolatedConcepts.map(c => `  • ${c.label}`).join('\n')
                : '',
            '',
            underexplored.length > 0
                ? `HIGH-FREQUENCY BUT UNDEREXPLORED (appears often, few connections):\n` +
                underexplored.map(c => `  • ${c.label} (mentioned ${c.weight}x, only ${relCounts[c.id] || 0} connections)`).join('\n')
                : '',
            '',
            clusters.length > 1
                ? `RESEARCH CLUSTERS:\n` + clusters.map(cl => `  • [${cl}]: ${clusterMap[cl]?.slice(0, 5).join(', ')}`).join('\n')
                : '',
            '',
            sessions.length > 0
                ? `OPEN QUESTIONS FROM SESSIONS:\n` +
                sessions.flatMap(s => s.open_questions || []).slice(0, 8).map((q: string) => `  • ${q}`).join('\n')
                : '',
            '',
            `KEY MEMORIES (highest importance):\n` +
            memories.slice(0, 8).map(m => `  • ${m.content.slice(0, 150)}`).join('\n'),
        ].filter(Boolean).join('\n');

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `You are a research strategist and epistemologist. You analyze a researcher's knowledge graph topology — concepts, their relationships, contradictions, gaps, and clusters — to generate bold, testable research hypotheses.

A good hypothesis:
1. Emerges from the STRUCTURE of the knowledge (contradictions, gaps, isolated high-frequency concepts)
2. Is SPECIFIC and FALSIFIABLE — has clear conditions that would prove or disprove it
3. Is NOVEL — not obvious from any single memory alone
4. Connects at least 2 concepts in a non-trivial way
5. Points toward actionable research

Return EXACTLY 5 hypotheses as a JSON array. Each hypothesis object must have:
- "id": number 1-5
- "title": short bold claim (max 12 words)
- "hypothesis": full hypothesis statement (2-3 sentences, specific and testable)
- "basis": what in the knowledge graph motivated this (mention specific concepts/contradictions/gaps)
- "confidence": "low" | "medium" | "high"  
- "counterfactual": one sentence — what evidence would disprove this
- "researchQuery": a specific Deep Research query to test this hypothesis (used as a search query)
- "type": "tension" | "gap" | "bridge" | "extension" | "prediction"

Return ONLY the JSON array, no markdown, no explanation.`,
                },
                {
                    role: 'user',
                    content: `Analyze this knowledge graph topology and generate 5 research hypotheses:\n\n${topologyContext}`,
                },
            ],
            temperature: 0.7,
            max_tokens: 2048,
        });

        const raw = completion.choices[0]?.message?.content?.trim() || '[]';

        // Parse JSON robustly
        let hypotheses = [];
        try {
            const jsonMatch = raw.match(/\[[\s\S]*\]/);
            hypotheses = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
        } catch {
            hypotheses = [];
        }

        return NextResponse.json({
            hypotheses,
            meta: {
                concepts: concepts.length,
                relationships: relationships.length,
                contradictions: contradictions.length,
                isolated: isolatedConcepts.length,
                clusters: clusters.length,
            },
        });
    } catch (err) {
        console.error('Hypotheses error:', err);
        return NextResponse.json({ error: 'Failed to generate hypotheses' }, { status: 500 });
    }
}
