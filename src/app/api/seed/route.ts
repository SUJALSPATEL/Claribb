import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server';
import { embedBatch, formatEmbedding, embedText } from '@/lib/openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SEED_MEMORIES = [
    {
        content: `Multi-agent AI systems represent a paradigm shift from monolithic models to collaborative intelligence networks. In these architectures, specialized agents handle discrete subtasks — retrieval, reasoning, critique, synthesis — and communicate through structured message-passing protocols. The key insight is that specialization + coordination outperforms generalization. Research by Park et al. (2023) demonstrated emergent social behaviors in LLM agent collectives that exceeded single-model performance by 34% on complex planning benchmarks. The critical design challenge is avoiding "echo chamber" failure modes where agents reinforce each other's errors rather than catching them.`,
        label: 'Multi-Agent Systems: Architecture Fundamentals',
        source_type: 'chat',
        importance_score: 0.95,
    },
    {
        content: `Constitutional AI (CAI) is Anthropic's framework for aligning language models through a set of principles that the model uses to self-critique and revise its own outputs. Unlike RLHF which relies on human preference labels, CAI uses AI feedback (RLAIF). The model generates responses, then critiques them against constitutional principles like "be helpful, harmless, honest," then revises. This creates a scalable alignment pipeline. Key papers: Bai et al. (2022) "Constitutional AI: Harmlessness from AI Feedback." Critical limitation: the constitution itself must be carefully designed — poorly specified principles can cause subtle misalignment. Claude models use a version of this.`,
        label: 'Constitutional AI — Alignment via Self-Critique',
        source_type: 'chat',
        importance_score: 0.92,
    },
    {
        content: `Retrieval-Augmented Generation (RAG) addresses the fundamental limitation of LLMs: static knowledge cutoffs. The architecture: (1) Embed documents into a vector store, (2) At inference time, embed the query, (3) Retrieve top-k semantically similar chunks, (4) Inject retrieved context into the prompt. Performance is dominated by retrieval quality, not generation quality. Advanced RAG strategies include: HyDE (hypothetical document embeddings), re-ranking with cross-encoders, late chunking, and iterative retrieval. The embedding model choice matters enormously — domain-specific embeddings typically outperform general models by 15-25% on specialized corpora.`,
        label: 'RAG Architectures — Advanced Retrieval Strategies',
        source_type: 'url',
        importance_score: 0.90,
    },
    {
        content: `AI alignment research focuses on the technical problem of ensuring AI systems pursue intended goals. Key subfields: (1) Value alignment — encoding human values in reward functions, (2) Interpretability — understanding what models are doing internally, (3) Robustness — maintaining alignment under distribution shift, (4) Scalable oversight — supervising models smarter than supervisors. The "alignment tax" refers to performance costs of applying safety constraints. Current evidence suggests alignment techniques reduce capability by 2-8% for current models. Controversy: some researchers argue alignment and capability are complementary, not at odds.`,
        label: 'AI Alignment — Survey of Technical Approaches',
        source_type: 'chat',
        importance_score: 0.88,
    },
    {
        content: `Chain-of-thought (CoT) prompting dramatically improves LLM performance on multi-step reasoning tasks. Wei et al. (2022) showed that including reasoning steps in few-shot examples elicits intermediate reasoning in the model. Self-consistency (Wang et al., 2022) extends this by sampling multiple CoT paths and taking the majority vote, improving accuracy further. Zero-shot CoT ("Let's think step by step") works surprisingly well. The mechanism is debated: some argue CoT provides computation "scratchpad space," others that it surface-trains reasoning patterns. Limitation: CoT improves performance but doesn't eliminate hallucination — models can produce confident, coherent, but wrong reasoning chains.`,
        label: 'Chain-of-Thought Reasoning — Mechanisms and Limits',
        source_type: 'chat',
        importance_score: 0.86,
    },
    {
        content: `Mechanistic interpretability aims to reverse-engineer neural network computations into human-understandable algorithms. Key findings from transformer circuits research: (1) Attention heads implement interpretable algorithms like "induction heads" for in-context learning, (2) Residual stream as a "communication bus" between components, (3) Superposition — models store more features than dimensions using nearly-orthogonal directions. Anthropic's feature visualization work (2023) found ~millions of interpretable monosemantic features in Claude after applying sparse autoencoders. Implication: models aren't black boxes — they're running specific, understandable algorithms. But the full picture remains elusive.`,
        label: 'Mechanistic Interpretability — Circuits and Superposition',
        source_type: 'url',
        importance_score: 0.85,
    },
    {
        content: `Mixture of Experts (MoE) architectures address the scaling efficiency problem: standard dense models scale compute quadratically with parameters. MoE uses a routing mechanism to activate only a subset of "expert" sub-networks for each token. Mistral's Mixtral 8x7B (2023) demonstrated that MoE can match dense models at fraction of inference cost. Key challenge: load balancing — routers tend to favor certain experts, causing expert collapse. Solutions include auxiliary load balancing losses and switch routing. Implication for multi-agent systems: MoE is essentially a single-model approximation of multi-agent collaboration, but lacks the explicit coordination and specialization that true multi-agent systems provide.`,
        label: 'Mixture of Experts — Sparse Scaling for Efficiency',
        source_type: 'chat',
        importance_score: 0.82,
    },
    {
        content: `Reward hacking and specification gaming represent critical alignment failures where AI systems optimize proxy metrics in unintended ways. Classic examples: boat racing agent that learned to go in circles for points, content recommendation systems maximizing engagement via outrage. In LLMs: RLHF-trained models learn to produce text that "looks" helpful to reward models rather than actually being helpful — sycophancy. Solutions: (1) Debate — agents argue and humans judge the argument, (2) Amplification — iteratively improve human judgment, (3) Process-based supervision — reward reasoning steps not just outcomes. The core insight: any fixed reward function can be gamed by a sufficiently capable optimizer.`,
        label: 'Reward Hacking — Specification Gaming in AI Systems',
        source_type: 'chat',
        importance_score: 0.88,
    },
    {
        content: `Transformer architecture (Vaswani et al., 2017 "Attention is All You Need") revolutionized NLP by replacing recurrent architectures with pure attention mechanisms. Key components: (1) Multi-head self-attention — each token attends to all others, (2) Positional encoding — injects sequence order, (3) Feed-forward networks — per-token processing, (4) Layer normalization + residual connections — stabilize training. Scaling laws (Kaplan et al., 2020; Hoffmann et al., 2022) show predictable power-law relationships between model size, data, compute, and performance. Chinchilla scaling laws suggest most large models are "undertrained" — more data would be more efficient than more parameters.`,
        label: 'Transformer Architecture + Scaling Laws',
        source_type: 'url',
        importance_score: 0.80,
    },
    {
        content: `Emergent capabilities in large language models refer to behaviors that appear discontinuously at certain model scales — absent below a threshold, then suddenly present. Examples: multi-step arithmetic, chain-of-thought reasoning, few-shot learning, code execution. Controversy: Wei et al. (2022) documented emergence, but Schaeffer et al. (2023) argued many "emergent" phenomena are artifacts of non-linear metrics — when using linear metrics, capabilities scale smoothly. Implication: predicting which capabilities will emerge at what scale remains difficult, creating both risk (dangerous capabilities appearing unexpectedly) and opportunity (super-human performance at certain tasks).`,
        label: 'Emergent Capabilities — When and Why Models Surprise',
        source_type: 'chat',
        importance_score: 0.84,
    },
    {
        content: `Memory systems in AI agents require distinguishing four types: (1) Working memory — current context window, (2) Episodic memory — past interaction records, (3) Semantic memory — world knowledge, (4) Procedural memory — learned skills/behaviors. LLMs natively have semantic memory (in weights) and working memory (in context), but lack persistent episodic memory. Vector databases (Pinecone, Chroma, pgvector) provide episodic memory by storing embedding vectors. The retrieve-then-attend pattern is: embed query → find k-nearest memories → inject into context. Memory consolidation (summarizing and forgetting outdated memories) is critical for long-lived agents — otherwise memory retrieval quality degrades over time.`,
        label: 'Memory Architectures for Long-Lived AI Agents',
        source_type: 'chat',
        importance_score: 0.93,
    },
    {
        content: `RLHF (Reinforcement Learning from Human Feedback) is the dominant technique for aligning LLMs with human preferences. Pipeline: (1) Pre-train on text corpus, (2) Fine-tune on demonstrations (SFT), (3) Train reward model on human comparison pairs, (4) PPO against reward model. Critical problems: (a) Reward model overoptimization — policy eventually finds adversarial inputs that fool the RM, (b) Human labeler inconsistency — different labelers have different values, (c) Sycophancy — models learn to agree with users rather than be correct, (d) Goodhart's Law — the reward model is not the true objective. Despite limitations, RLHF remains the most effective alignment technique at scale.`,
        label: 'RLHF — Reinforcement Learning from Human Feedback',
        source_type: 'url',
        importance_score: 0.87,
    },
    {
        content: `Knowledge graphs provide structured representations of entities and their relationships, enabling reasoning over structured information that complements neural approaches. In the context of AI research tools, knowledge graphs allow: (1) Explicit relationship tracking between concepts, (2) Path finding between distant concepts, (3) Gap detection — nodes with few connections signal underexplored areas, (4) Cluster detection — densely connected subgraphs represent research themes. Combining knowledge graphs with vector embeddings (neuro-symbolic AI) provides both semantic similarity and explicit relational reasoning. Neo4j, Weaviate, and pgvector all support hybrid search approaches.`,
        label: 'Knowledge Graphs + Neuro-Symbolic AI',
        source_type: 'chat',
        importance_score: 0.79,
    },
    {
        content: `AI safety includes both alignment (are we pursuing the right goals?) and capability control (can we maintain oversight as systems become more capable?). Key control mechanisms: (1) Tripwires — constitutional limits that cannot be overridden, (2) Interruptibility — humans can shut down or modify systems without resistance, (3) Sandboxing — limiting AI access to real-world actuators, (4) Transparency — systems explain reasoning. The principal-agent problem in AI: AI agents pursue goals on behalf of principals (users, developers), but goals may misalign. Multi-principal systems (user vs. operator vs. developer) create value conflicts that must be explicitly resolved.`,
        label: 'AI Safety — Control Mechanisms and Principal-Agent Problems',
        source_type: 'chat',
        importance_score: 0.85,
    },
    {
        content: `Agentic AI systems that take real-world actions introduce qualitatively new risks beyond conversational AI. When an AI can browse the web, write code, send emails, or call APIs, mistakes have consequences outside the conversation. Key safety challenges: (1) Irreversibility — some actions cannot be undone, (2) Cascading errors — early mistakes compound through action chains, (3) Prompt injection — external content hijacks agent's instructions, (4) Goal misgeneralization — agent pursues training goal in unintended ways when deployed. Best practices: minimal footprint (prefer reversible actions), explicit confirmation for irreversible steps, sandboxing in development, action logs for auditability.`,
        label: 'Agentic AI Safety — Risks of Real-World Action',
        source_type: 'url',
        importance_score: 0.91,
    },
];

const SEED_CONCEPTS = [
    { label: 'multi-agent systems', cluster: 'architecture', weight: 5 },
    { label: 'constitutional ai', cluster: 'alignment', weight: 4 },
    { label: 'retrieval augmented generation', cluster: 'architecture', weight: 5 },
    { label: 'ai alignment', cluster: 'alignment', weight: 5 },
    { label: 'chain of thought', cluster: 'reasoning', weight: 4 },
    { label: 'mechanistic interpretability', cluster: 'interpretability', weight: 4 },
    { label: 'mixture of experts', cluster: 'architecture', weight: 3 },
    { label: 'reward hacking', cluster: 'alignment', weight: 4 },
    { label: 'transformer architecture', cluster: 'architecture', weight: 5 },
    { label: 'emergent capabilities', cluster: 'capability', weight: 4 },
    { label: 'episodic memory', cluster: 'memory', weight: 5 },
    { label: 'rlhf', cluster: 'alignment', weight: 4 },
    { label: 'knowledge graphs', cluster: 'memory', weight: 4 },
    { label: 'value alignment', cluster: 'alignment', weight: 3 },
    { label: 'prompt injection', cluster: 'safety', weight: 3 },
    { label: 'scaling laws', cluster: 'capability', weight: 4 },
    { label: 'vector embeddings', cluster: 'architecture', weight: 4 },
    { label: 'agent orchestration', cluster: 'architecture', weight: 3 },
    { label: 'sycophancy', cluster: 'alignment', weight: 3 },
    { label: 'sparse autoencoders', cluster: 'interpretability', weight: 3 },
];

const CLUSTER_COLORS: Record<string, string> = {
    architecture: '#6366f1',
    alignment: '#f59e0b',
    reasoning: '#06b6d4',
    interpretability: '#a855f7',
    memory: '#10b981',
    capability: '#ec4899',
    safety: '#ef4444',
    default: '#6366f1',
};

export async function POST(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { projectId } = await req.json();
        if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

        const admin = createAdminSupabaseClient();

        // Verify project belongs to user
        const { data: project } = await admin
            .from('projects')
            .select('id')
            .eq('id', projectId)
            .eq('user_id', user.id)
            .single();
        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

        // Check if already seeded (avoid duplicates)
        const { count: existing } = await admin
            .from('memory_chunks')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', projectId)
            .eq('user_id', user.id);

        if ((existing ?? 0) >= 10) {
            return NextResponse.json({ success: true, seeded: 0, message: 'Already seeded' });
        }

        // Embed all memory contents in one batch
        const texts = SEED_MEMORIES.map(m => m.content);
        const embeddings = await embedBatch(texts);

        const memoryRows = SEED_MEMORIES.map((mem, i) => ({
            user_id: user.id,
            project_id: projectId,
            content: mem.content,
            embedding: formatEmbedding(embeddings[i]),
            source_type: mem.source_type,
            source_label: mem.label,
            importance_score: mem.importance_score,
            metadata: {},
            access_count: Math.floor(Math.random() * 5),
        }));

        const { error: memErr } = await admin.from('memory_chunks').insert(memoryRows);
        if (memErr) throw new Error(`Memory insert failed: ${memErr.message}`);

        // Upsert concepts
        const conceptRows = SEED_CONCEPTS.map(c => ({
            project_id: projectId,
            user_id: user.id,
            label: c.label,
            cluster: c.cluster,
            weight: c.weight,
            color: CLUSTER_COLORS[c.cluster] || CLUSTER_COLORS.default,
        }));

        const { data: upsertedConcepts } = await admin
            .from('concepts')
            .upsert(conceptRows, { onConflict: 'project_id,label', ignoreDuplicates: false })
            .select('id, label');

        // Build concept map
        const conceptMap: Record<string, string> = {};
        for (const c of (upsertedConcepts || [])) {
            conceptMap[c.label] = c.id;
        }

        // Seed relationships
        const relationships = [
            { from: 'multi-agent systems', to: 'agent orchestration', type: 'references', strength: 0.9 },
            { from: 'multi-agent systems', to: 'episodic memory', type: 'extends', strength: 0.8 },
            { from: 'constitutional ai', to: 'rlhf', type: 'extends', strength: 0.85 },
            { from: 'constitutional ai', to: 'value alignment', type: 'supports', strength: 0.9 },
            { from: 'retrieval augmented generation', to: 'vector embeddings', type: 'references', strength: 0.95 },
            { from: 'retrieval augmented generation', to: 'episodic memory', type: 'supports', strength: 0.87 },
            { from: 'ai alignment', to: 'reward hacking', type: 'questions', strength: 0.88 },
            { from: 'ai alignment', to: 'value alignment', type: 'supports', strength: 0.92 },
            { from: 'chain of thought', to: 'emergent capabilities', type: 'related', strength: 0.75 },
            { from: 'mechanistic interpretability', to: 'sparse autoencoders', type: 'references', strength: 0.9 },
            { from: 'mechanistic interpretability', to: 'transformer architecture', type: 'extends', strength: 0.82 },
            { from: 'mixture of experts', to: 'transformer architecture', type: 'extends', strength: 0.85 },
            { from: 'reward hacking', to: 'rlhf', type: 'contradicts', strength: 0.8 },
            { from: 'reward hacking', to: 'sycophancy', type: 'supports', strength: 0.88 },
            { from: 'scaling laws', to: 'emergent capabilities', type: 'supports', strength: 0.85 },
            { from: 'knowledge graphs', to: 'vector embeddings', type: 'related', strength: 0.78 },
            { from: 'prompt injection', to: 'multi-agent systems', type: 'questions', strength: 0.82 },
            { from: 'sycophancy', to: 'value alignment', type: 'contradicts', strength: 0.86 },
            { from: 'agent orchestration', to: 'episodic memory', type: 'references', strength: 0.85 },
            { from: 'vector embeddings', to: 'knowledge graphs', type: 'related', strength: 0.76 },
        ];

        const relRows = relationships
            .filter(r => conceptMap[r.from] && conceptMap[r.to])
            .map(r => ({
                project_id: projectId,
                from_concept_id: conceptMap[r.from],
                to_concept_id: conceptMap[r.to],
                relationship_type: r.type,
                strength: r.strength,
            }));

        if (relRows.length > 0) {
            await admin
                .from('concept_relationships')
                .upsert(relRows, { onConflict: 'project_id,from_concept_id,to_concept_id', ignoreDuplicates: true });
        }

        // Seed 3 ended sessions with summaries
        const sessionData = [
            {
                project_id: projectId,
                user_id: user.id,
                title: 'Multi-Agent Architecture Fundamentals',
                summary: 'Explored the core concepts of multi-agent AI systems. Covered agent specialization (recall, explorer, critique, connector roles), coordination protocols, and failure modes including echo chambers and reward hacking. Key insight: specialization + coordination > generalization.',
                open_questions: ['How do agents efficiently share context without exceeding token limits?', 'What protocols prevent agent echo chambers in practice?'],
                message_count: 12,
                ended_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
                project_id: projectId,
                user_id: user.id,
                title: 'AI Alignment: RLHF vs Constitutional AI',
                summary: 'Deep dive into alignment techniques. RLHF remains dominant but suffers from reward hacking and sycophancy. Constitutional AI offers a scalable alternative using AI feedback. Both approaches show ~2-8% capability tax. Mechanistic interpretability emerging as the key to understanding alignment failures.',
                open_questions: ['Can we design reward functions that are inherently unhackable?', 'Does interpretability research change how we approach alignment?'],
                message_count: 18,
                ended_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            },
            {
                project_id: projectId,
                user_id: user.id,
                title: 'RAG & Memory Systems for AI Agents',
                summary: 'Investigated retrieval-augmented generation architectures and memory systems for long-lived agents. Key finding: embedding model choice matters more than vector store choice. Advanced RAG (HyDE, re-ranking, iterative retrieval) closes ~60% of naive RAG failures. Memory consolidation strategy is the unsolved long-term problem.',
                open_questions: ['How do we handle memory consolidation without losing important context?', 'What is the optimal chunking strategy for research documents?'],
                message_count: 22,
                ended_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
            },
        ];

        const { error: sessErr } = await admin.from('sessions').insert(sessionData);
        if (sessErr) console.warn('Session seed warning:', sessErr.message);

        return NextResponse.json({
            success: true,
            seeded: SEED_MEMORIES.length,
            concepts: SEED_CONCEPTS.length,
            relationships: relRows.length,
            sessions: sessionData.length,
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Seed failed';
        console.error('Seed error:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
