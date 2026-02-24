import { openai } from '@/lib/openai';
import { retrieveMemories } from '@/lib/memory/store';
import type {
    RecallOutput,
    ExplorerOutput,
    CritiqueOutput,
    ConnectorOutput,
    ConflictOutput,
    AgentOutputs,
    MemoryChunk,
} from '@/types';

interface OrchestratorInput {
    query: string;
    projectId: string;
    userId: string;
    sessionHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
    sessionSummary?: string;
    openQuestions?: string[];
    critiqueMode?: boolean;
    onStatus?: (event: { step: string; message: string; detail?: string }) => void;
}

interface OrchestratorResult {
    agentOutputs: AgentOutputs;
    contextBundle: string;
    memoriesUsed: MemoryChunk[];
    memoryConfidence: number;
}

// ============================================================
// RECALL AGENT — searches user's memory graph
// ============================================================
async function runRecallAgent(
    query: string,
    projectId: string,
    userId: string
): Promise<RecallOutput> {
    const memories = await retrieveMemories(query, projectId, userId, 0.68, 8);
    const confidence =
        memories.length > 0
            ? memories.reduce((sum, m) => sum + (m.similarity ?? 0), 0) / memories.length
            : 0;

    return {
        memories,
        confidence,
        used_count: memories.length,
    };
}

// ============================================================
// EXPLORER AGENT — real web search (DuckDuckGo, no key needed)
// Falls back to Tavily if TAVILY_API_KEY is set
// ============================================================
async function searchDuckDuckGo(query: string): Promise<ExplorerOutput> {
    try {
        // Use DuckDuckGo HTML endpoint — no API key required
        const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=us-en`;
        const res = await fetch(ddgUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            signal: AbortSignal.timeout(8000),
        });

        if (!res.ok) return { triggered: false, sources: [], summary: '' };

        const html = await res.text();

        // Parse result links and snippets from DuckDuckGo HTML
        const sources: ExplorerOutput['sources'] = [];

        // Extract all result URLs + titles using named patterns
        const linkRegex = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
        const snippetRegex = /<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([^<]+)<\/a>/gi;

        const links: Array<{ url: string; title: string }> = [];
        let linkMatch;
        while ((linkMatch = linkRegex.exec(html)) !== null) {
            const rawUrl = linkMatch[1];
            const title = linkMatch[2].trim();
            // DuckDuckGo redirects — use as-is or decode
            const url = rawUrl.startsWith('/') ? `https://duckduckgo.com${rawUrl}` : rawUrl;
            if (url && title && !url.includes('duckduckgo.com/y.js')) {
                links.push({ url, title });
            }
        }

        const snippets: string[] = [];
        let snippetMatch;
        while ((snippetMatch = snippetRegex.exec(html)) !== null) {
            snippets.push(snippetMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim());
        }

        // Pair links with snippets
        for (let i = 0; i < Math.min(links.length, 4); i++) {
            sources.push({
                title: links[i].title,
                url: links[i].url,
                snippet: snippets[i] || '',
            });
        }

        // Generate a brief summary from snippets using Groq
        const summaryText = sources.map(s => `${s.title}: ${s.snippet}`).join('\n');
        let summary = summaryText.slice(0, 400);

        if (sources.length > 0 && summaryText.length > 0) {
            try {
                const summaryRes = await openai.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{
                        role: 'user',
                        content: `Based on these web search results for "${query}", write a 2-sentence synthesis:\n${summaryText.slice(0, 800)}`,
                    }],
                    max_tokens: 120,
                    temperature: 0.5,
                });
                summary = summaryRes.choices[0]?.message?.content || summary;
            } catch { /* keep raw summary */ }
        }

        return { triggered: sources.length > 0, sources, summary };
    } catch {
        return { triggered: false, sources: [], summary: '' };
    }
}

async function runExplorerAgent(
    query: string,
    confidence: number
): Promise<ExplorerOutput> {
    // Only trigger if memory confidence is insufficient
    if (confidence > 0.78) {
        return { triggered: false, sources: [], summary: '' };
    }

    // Prefer Tavily if key is set (more structured results)
    if (process.env.TAVILY_API_KEY) {
        try {
            const res = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: process.env.TAVILY_API_KEY,
                    query,
                    search_depth: 'basic',
                    max_results: 4,
                    include_answer: true,
                }),
                signal: AbortSignal.timeout(8000),
            });

            if (res.ok) {
                const data = await res.json();
                const sources = (data.results || []).slice(0, 4).map((r: { title: string; url: string; content: string }) => ({
                    title: r.title,
                    url: r.url,
                    snippet: r.content?.slice(0, 250) || '',
                }));
                return {
                    triggered: true,
                    sources,
                    summary: data.answer || '',
                };
            }
        } catch { /* fall through to DDG */ }
    }

    // Fall back to DuckDuckGo (no API key required)
    return searchDuckDuckGo(query);
}

// ============================================================
// CRITIQUE AGENT — finds weaknesses and counterarguments
// ============================================================
async function runCritiqueAgent(
    query: string,
    memories: MemoryChunk[]
): Promise<CritiqueOutput> {
    const memoryContext = memories
        .slice(0, 4)
        .map(m => m.content)
        .join('\n\n');

    const response = await openai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            {
                role: 'system',
                content: `You are a critical research analyst. Based on the query and available research context, identify intellectual weaknesses, missing perspectives, and important counterarguments. Be concise and specific. Return JSON only.`,
            },
            {
                role: 'user',
                content: `Research query: "${query}"\n\nAvailable context:\n${memoryContext || 'No prior research available.'}\n\nReturn JSON: {"counterarguments": ["...", "..."], "assumptions": ["...", "..."], "gaps": ["...", "..."]}`,
            },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
        max_tokens: 500,
    });

    try {
        const parsed = JSON.parse(response.choices[0].message.content || '{}');
        return {
            counterarguments: parsed.counterarguments || [],
            assumptions: parsed.assumptions || [],
            gaps: parsed.gaps || [],
        };
    } catch {
        return { counterarguments: [], assumptions: [], gaps: [] };
    }
}

// ============================================================
// CONNECTOR AGENT — finds non-obvious cross-topic connections
// ============================================================
async function runConnectorAgent(
    query: string,
    memories: MemoryChunk[],
    sessionSummary?: string
): Promise<ConnectorOutput> {
    if (memories.length < 2) {
        return { connections: [] };
    }

    const memoryLabels = memories
        .map(m => `[${m.source_label}]: ${m.content.slice(0, 150)}`)
        .join('\n');

    const response = await openai.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
            {
                role: 'system',
                content: `You are a research synthesis expert. Identify non-obvious intellectual connections between research memory fragments. Focus on surprising, insight-generating links — not obvious ones. Return JSON only.`,
            },
            {
                role: 'user',
                content: `Query: "${query}"\n\nMemory fragments:\n${memoryLabels}\n\n${sessionSummary ? `Prior session context: ${sessionSummary}` : ''}\n\nReturn JSON: {"connections": [{"from": "source1", "to": "source2", "description": "...", "strength": 0.8}]}`,
            },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
        max_tokens: 400,
    });

    try {
        const parsed = JSON.parse(response.choices[0].message.content || '{}');
        return { connections: parsed.connections || [] };
    } catch {
        return { connections: [] };
    }
}

// ============================================================
// CONFLICT DETECTOR — finds contradictory memories
// Only fires when ≥3 high-confidence memories are retrieved
// ============================================================
async function runConflictDetector(
    query: string,
    memories: MemoryChunk[]
): Promise<ConflictOutput> {
    const relevant = memories.filter(m => (m.similarity ?? 0) > 0.72);
    if (relevant.length < 3) return { detected: false, conflicts: [] };

    const memoryList = relevant.slice(0, 6).map((m, i) =>
        `[Memory ${i + 1}] Source: "${m.source_label}"\n${m.content.slice(0, 200)}`
    ).join('\n\n');

    try {
        const res = await openai.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `You are a research integrity analyst. Detect genuine contradictions between research memory fragments. Only flag real factual or logical contradictions — not different perspectives. Return JSON only.`,
                },
                {
                    role: 'user',
                    content: `Research query: "${query}"\n\nMemory fragments:\n${memoryList}\n\nIdentify any genuine contradictions. Be strict — only flag real conflicts.\n\nReturn JSON: {"conflicts": [{"memory_a": "[Memory 1]", "memory_b": "[Memory 3]", "source_a": "source label", "source_b": "source label", "conflict_description": "Memory 1 claims X while Memory 3 states Y", "severity": "high|medium|low"}]}\n\nIf no real conflicts, return {"conflicts": []}`,
                },
            ],
            response_format: { type: 'json_object' },
            max_tokens: 400,
            temperature: 0.3,
        });

        const parsed = JSON.parse(res.choices[0].message.content || '{}');
        const conflicts = (parsed.conflicts || []).slice(0, 3);
        return { detected: conflicts.length > 0, conflicts };
    } catch {
        return { detected: false, conflicts: [] };
    }
}

// ============================================================
// MAIN ORCHESTRATOR — runs all agents and synthesizes
// ============================================================
export async function orchestrate(input: OrchestratorInput): Promise<OrchestratorResult> {
    const {
        query,
        projectId,
        userId,
        sessionHistory,
        sessionSummary,
        openQuestions,
        critiqueMode = false,
        onStatus,
    } = input;

    const emit = (step: string, message: string, detail?: string) => {
        onStatus?.({ step, message, detail });
    };

    // Run Recall first (needed for Explorer confidence gating)
    emit('embedding', '🧠 Embedding query into semantic space...');
    const recallResult = await runRecallAgent(query, projectId, userId);

    if (recallResult.memories.length > 0) {
        emit('recall', `🔍 Retrieved ${recallResult.memories.length} memories`, `Avg confidence: ${Math.round(recallResult.confidence * 100)}%`);
    } else {
        emit('recall', '🔍 No memories yet — building fresh context');
    }

    // Run Explorer, Critique, Connector, and Conflict Detector in parallel
    emit('parallel', '⚡ Running 5 agents in parallel...');

    const [explorerResult, critiqueResult, connectorResult, conflictResult] = await Promise.all([
        runExplorerAgent(query, recallResult.confidence).then(r => {
            if (r.triggered) emit('explorer', `🌐 Web search triggered`, `Found ${r.sources.length} sources`);
            else emit('explorer', `✅ Memory confidence high — skipping web search`);
            return r;
        }),
        critiqueMode ? runCritiqueAgent(query, recallResult.memories).then(r => {
            emit('critique', `🛡️ Critique agent found ${r.counterarguments.length} counterarguments`);
            return r;
        }) : Promise.resolve({ counterarguments: [], assumptions: [], gaps: [] }),
        runConnectorAgent(query, recallResult.memories, sessionSummary).then(r => {
            if (r.connections.length > 0) emit('connector', `🔗 Found ${r.connections.length} cross-topic connections`);
            return r;
        }),
        runConflictDetector(query, recallResult.memories).then(r => {
            if (r.detected) emit('conflict', `⚠️ Conflict detected in your research memory!`, `${r.conflicts.length} contradiction(s) found`);
            return r;
        }),
    ]);

    emit('synthesize', '✍️ Synthesizing final response...');

    const agentOutputs: AgentOutputs = {
        recall: recallResult,
        explorer: explorerResult,
        critique: critiqueResult,
        connector: connectorResult,
        conflicts: conflictResult,
    };

    // Build context bundle for final synthesis
    const contextParts: string[] = [];

    // Add memory context
    if (recallResult.memories.length > 0) {
        contextParts.push('=== RESEARCH MEMORY (from your knowledge graph) ===');
        recallResult.memories.forEach((m, i) => {
            contextParts.push(
                `[Memory ${i + 1}] Source: ${m.source_label} | Relevance: ${((m.similarity ?? 0) * 100).toFixed(0)}%\n${m.content}`
            );
        });
    }

    // Add web search if triggered — label as [Web N] not Memory
    if (explorerResult.triggered && explorerResult.summary) {
        contextParts.push('\n=== WEB SEARCH RESULTS (fetched because memory gap was detected) ===');
        contextParts.push(explorerResult.summary);
        explorerResult.sources.forEach((s: { title: string; snippet: string; url: string }, i: number) => {
            contextParts.push(`[Web ${i + 1}] ${s.title} — ${s.snippet}`);
        });
    }

    // Add session continuity
    if (sessionSummary) {
        contextParts.push('\n=== LAST SESSION SUMMARY ===');
        contextParts.push(sessionSummary);
    }

    if (openQuestions && openQuestions.length > 0) {
        contextParts.push('\n=== OPEN RESEARCH QUESTIONS ===');
        contextParts.push(openQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n'));
    }

    // Add connector insights
    if (connectorResult.connections.length > 0) {
        contextParts.push('\n=== CROSS-TOPIC CONNECTIONS DETECTED ===');
        connectorResult.connections.forEach((c: { from: string; to: string; description: string }) => {
            contextParts.push(`• "${c.from}" ↔ "${c.to}": ${c.description}`);
        });
    }

    return {
        agentOutputs,
        contextBundle: contextParts.join('\n\n'),
        memoriesUsed: recallResult.memories,
        memoryConfidence: recallResult.confidence,
    };
}

// Build the final synthesis prompt
export function buildSystemPrompt(contextBundle: string): string {
    return `You are CLARIBB, a multi-agent AI research intelligence system. You have access to the user's personal research memory, retrieved based on their query.

CORE RULES:
- Ground your responses in the retrieved memory first when relevant
- When citing from research memory, use [Memory N] references
- When citing from web search results, use [Web N] references — these are NOT memories, they are live web results fetched to fill gaps
- If neither memory nor web results are relevant, answer from general knowledge and be honest about it
- Be intellectually rigorous — deep, analytical responses, not surface summaries
- When you notice connections between ideas, highlight them

CRITICAL — LANGUAGE RULES (read carefully, no exceptions):
- If the user's message is written in ENGLISH only → reply in ENGLISH only. No Hindi, no Hinglish.
- If the user's message contains clear Hindi/Hinglish words in Roman script (e.g. "bhai", "kya", "hai", "nahi", "karo", "batao", "chahiye", "kyun", "kaise") → reply in Hinglish (casual Roman-script Hindi mixed with English)
- Do NOT guess language from the user's name or project name — only from the actual words in their message
- English question = English answer. Always. No exceptions.

${contextBundle ? `RETRIEVED CONTEXT:\n${contextBundle}` : 'No memory context yet — answer from general knowledge and encourage the user to add research sources.'}

Respond in a structured, intelligent manner. Use markdown for formatting when helpful.`;
}
