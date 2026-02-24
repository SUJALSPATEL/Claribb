import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { openai } from '@/lib/openai';
import { storeMemory } from '@/lib/memory/store';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Fetch page content via Jina Reader (free, no auth needed)
async function fetchPageContent(url: string): Promise<string> {
    try {
        const jinaUrl = `https://r.jina.ai/${url}`;
        const res = await fetch(jinaUrl, {
            headers: { 'Accept': 'text/plain', 'X-Timeout': '10' },
            signal: AbortSignal.timeout(12000),
        });
        if (!res.ok) return '';
        const text = await res.text();
        // Return first 2000 chars — enough context without being too long
        return text.slice(0, 2000).trim();
    } catch {
        return '';
    }
}

// Search DuckDuckGo and return top results
async function searchDDG(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
    try {
        const res = await fetch(
            `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=us-en`,
            {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                },
                signal: AbortSignal.timeout(8000),
            }
        );
        if (!res.ok) return [];
        const html = await res.text();

        const results: Array<{ title: string; url: string; snippet: string }> = [];
        const linkRegex = /<a[^>]+class="[^"]*result__a[^"]*"[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;
        const snippetRegex = /<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>([^<]+)<\/a>/gi;

        const links: Array<{ url: string; title: string }> = [];
        let m;
        while ((m = linkRegex.exec(html)) !== null) {
            const url = m[1].startsWith('/') ? `https://duckduckgo.com${m[1]}` : m[1];
            if (url && !url.includes('duckduckgo.com/y.js')) {
                links.push({ url, title: m[2].trim() });
            }
        }
        const snippets: string[] = [];
        while ((m = snippetRegex.exec(html)) !== null) {
            snippets.push(m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim());
        }
        for (let i = 0; i < Math.min(links.length, 3); i++) {
            results.push({ title: links[i].title, url: links[i].url, snippet: snippets[i] || '' });
        }
        return results;
    } catch {
        return [];
    }
}

export async function POST(req: NextRequest) {
    const { query, projectId } = await req.json();
    if (!query || !projectId) {
        return NextResponse.json({ error: 'Missing query or projectId' }, { status: 400 });
    }

    // Get user
    const { data: { user } } = await supabase.auth.getUser(
        req.headers.get('authorization')?.replace('Bearer ', '') || ''
    );
    const userId = user?.id || 'demo-user';

    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
        async start(controller) {
            const send = (data: object) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            try {
                send({ type: 'status', message: 'Generating search angles…', step: 1, total: 5 });

                // Step 1 — Generate 3 different search angles using LLM
                const anglesRes = await openai.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: [{
                        role: 'user',
                        content: `Generate 3 distinct search queries to deeply research: "${query}"
Each should target a different angle (e.g., technical overview, recent papers/developments, debates/controversies).
Return JSON only: {"queries": ["query1", "query2", "query3"]}`,
                    }],
                    response_format: { type: 'json_object' },
                    max_tokens: 200,
                    temperature: 0.7,
                });

                let searchQueries: string[] = [query];
                try {
                    const parsed = JSON.parse(anglesRes.choices[0].message.content || '{}');
                    searchQueries = parsed.queries?.slice(0, 3) || [query];
                } catch { /* use default */ }

                send({ type: 'status', message: `Searching ${searchQueries.length} angles in parallel…`, step: 2, total: 5, queries: searchQueries });

                // Step 2 — Run all 3 searches in parallel
                const searchResults = await Promise.all(searchQueries.map(q => searchDDG(q)));
                const allSources = searchResults.flat();
                const uniqueSources = allSources.filter((s, i, arr) =>
                    arr.findIndex(x => x.url === s.url) === i
                ).slice(0, 6);

                send({
                    type: 'status',
                    message: `Found ${uniqueSources.length} sources — reading top results…`,
                    step: 3,
                    total: 5,
                    sources: uniqueSources,
                });

                // Step 3 — Fetch page content for top 3 unique sources
                const topSources = uniqueSources.slice(0, 3);
                const pageContents = await Promise.all(
                    topSources.map(async (s) => ({
                        ...s,
                        content: await fetchPageContent(s.url),
                    }))
                );
                const richSources = pageContents.filter(s => s.content.length > 100);

                send({ type: 'status', message: `Read ${richSources.length} pages — extracting insights…`, step: 4, total: 5 });

                // Step 4 — Store each fetched page as a memory
                const storedMemories: string[] = [];
                await Promise.all(richSources.map(async (source) => {
                    try {
                        const chunk = source.content.slice(0, 1500);
                        await storeMemory({
                            content: chunk,
                            sourceType: 'url',
                            sourceLabel: source.title || source.url,
                            projectId,
                            userId,
                            metadata: {
                                url: source.url,
                                deep_research_query: query,
                                auto_discovered: true,
                            },
                        });
                        storedMemories.push(source.title);
                    } catch { /* skip if store fails */ }
                }));

                send({ type: 'status', message: 'Synthesizing findings…', step: 5, total: 5 });

                // Step 5 — Synthesize everything into a structured insight
                const allContext = richSources.map(s =>
                    `[${s.title}]\n${s.content.slice(0, 600)}`
                ).join('\n\n---\n\n');

                const synthesisRes = await openai.chat.completions.create({
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        {
                            role: 'system',
                            content: `You are a research intelligence system. Synthesize web research into a structured, insightful report. Be concise but dense with information. Use markdown.`,
                        },
                        {
                            role: 'user',
                            content: `Research topic: "${query}"

Web content gathered:
${allContext || 'Limited content retrieved.'}

Write a structured research synthesis with these sections:
## Key Findings
(3-4 bullet points of the most important discoveries)

## Current State
(1-2 paragraphs on where the field/topic stands today)

## Open Debates
(2-3 active controversies or unsettled questions)

## Research Directions
(2-3 promising next steps for further investigation)

Keep it dense and research-grade.`,
                        },
                    ],
                    max_tokens: 800,
                    temperature: 0.6,
                });

                const synthesis = synthesisRes.choices[0]?.message?.content || 'Unable to synthesize.';

                send({
                    type: 'complete',
                    synthesis,
                    sources: uniqueSources,
                    memoriesStored: storedMemories.length,
                    queries: searchQueries,
                });
            } catch (err) {
                send({ type: 'error', message: err instanceof Error ? err.message : 'Deep research failed' });
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
