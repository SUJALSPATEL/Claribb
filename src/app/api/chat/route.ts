import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { orchestrate, buildSystemPrompt } from '@/lib/agents/orchestrator';
import { storeMemory, extractAndStoreConcepts } from '@/lib/memory/store';
import { openai } from '@/lib/openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const {
            message,
            projectId,
            sessionId,
            sessionHistory = [],
            sessionSummary,
            openQuestions = [],
            critiqueMode = false,
        } = body;

        if (!message || !projectId) {
            return NextResponse.json({ error: 'message and projectId required' }, { status: 400 });
        }

        const encoder = new TextEncoder();

        const readable = new ReadableStream({
            async start(controller) {
                const enqueue = (data: object) =>
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

                try {
                    // ── 🔥 FEATURE 1: Live Chain of Thought ──
                    enqueue({ type: 'thinking', step: 'start', message: '🧠 CLARIBB is waking up...', ts: Date.now() });

                    // Run orchestration with live status emissions
                    const { agentOutputs, contextBundle, memoriesUsed, memoryConfidence } =
                        await orchestrate({
                            query: message,
                            projectId,
                            userId: user.id,
                            sessionHistory,
                            sessionSummary,
                            openQuestions,
                            critiqueMode,
                            onStatus: (event) => {
                                enqueue({ type: 'thinking', ...event, ts: Date.now() });
                            },
                        });

                    // Send agent metadata
                    enqueue({
                        type: 'metadata',
                        agentOutputs,
                        memoriesUsed,
                        memoryConfidence,
                    });

                    // Build system prompt and LLM messages
                    const systemPrompt = buildSystemPrompt(contextBundle);
                    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
                        { role: 'system', content: systemPrompt },
                        ...sessionHistory.slice(-8).map((m: { role: 'user' | 'assistant'; content: string }) => ({
                            role: m.role,
                            content: m.content,
                        })),
                        { role: 'user', content: message },
                    ];

                    // Stream LLM response
                    const stream = await openai.chat.completions.create({
                        model: 'llama-3.3-70b-versatile',
                        messages,
                        stream: true,
                        temperature: 0.7,
                        max_tokens: 1500,
                    });

                    let fullResponse = '';
                    for await (const chunk of stream) {
                        const delta = chunk.choices[0]?.delta?.content || '';
                        if (delta) {
                            fullResponse += delta;
                            enqueue({ type: 'token', content: delta });
                        }
                    }

                    enqueue({ type: 'done' });
                    controller.close();

                    // Post-process async
                    if (fullResponse.length > 50) {
                        const label = `Session ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                        Promise.all([
                            storeMemory({
                                userId: user.id,
                                projectId,
                                content: `Q: ${message}\n\nA: ${fullResponse}`,
                                sourceType: 'chat',
                                sourceLabel: label,
                                importanceScore: 0.6,
                            }),
                            extractAndStoreConcepts(fullResponse, projectId, user.id),
                        ]).catch(err => console.error('Post-process error:', err));
                    }

                    if (sessionId) {
                        const { data: session } = await supabase
                            .from('sessions')
                            .select('message_count')
                            .eq('id', sessionId)
                            .single();
                        if (session) {
                            await supabase
                                .from('sessions')
                                .update({ message_count: session.message_count + 2 })
                                .eq('id', sessionId);
                        }
                    }
                } catch (err) {
                    console.error('Stream error:', err);
                    enqueue({ type: 'error', message: 'An error occurred' });
                    controller.close();
                }
            },
        });

        return new Response(readable, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (error: unknown) {
        console.error('Chat API error:', error);
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
