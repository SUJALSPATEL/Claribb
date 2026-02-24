/**
 * AI client — Groq (LLaMA 3.3 70B) for chat + Cohere for embeddings.
 *
 * Groq free tier:  No daily limits. Very high RPM (6,000 tokens/min for 70B).
 * Cohere free trial: No expiry, 1,000 embedding calls/min.
 *
 * Exports the same interface as the previous OpenAI/Gemini client so all
 * callers (orchestrator, chat route, sessions, digest) work unchanged.
 */
import Groq from 'groq-sdk';

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── Embeddings via Cohere REST API ──────────────────────────────────────────
// embed-english-v3.0 → 1024 dims. We pad to 1536 for pgvector compat.
async function embedWithCohere(text: string, attempt = 0): Promise<number[]> {
    const COHERE_KEY = process.env.COHERE_API_KEY!;
    try {
        const res = await fetch('https://api.cohere.com/v1/embed', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${COHERE_KEY}`,
                'Content-Type': 'application/json',
                'Request-Source': 'unspecified-js-client',
            },
            body: JSON.stringify({
                texts: [text.slice(0, 8000)],
                model: 'embed-english-v3.0',    // 1024 dims, free
                input_type: 'search_document',
                truncate: 'END',
            }),
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Cohere ${res.status}: ${errText}`);
        }
        const data = await res.json() as { embeddings: number[][] };
        const raw = data.embeddings[0]; // 1024 floats
        // Pad to 1536 by repeating the first 512 values
        const padded = [...raw, ...raw.slice(0, 512)];
        return padded;
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        const isRateLimit = msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('rate limit');
        if (isRateLimit && attempt < 3) {
            const delay = (attempt + 1) * 2000;
            console.warn(`Cohere embedding rate limited — retry ${attempt + 1} in ${delay}ms`);
            await new Promise(r => setTimeout(r, delay));
            return embedWithCohere(text, attempt + 1);
        }
        // Final fallback: zero vector so the app doesn't crash
        // Recall agent returns 0 memories; CLARIBB answers from general knowledge
        console.error('Cohere embedding failed:', msg);
        return new Array(1536).fill(0);
    }
}

export async function embedText(text: string): Promise<number[]> {
    return embedWithCohere(text);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
    const COHERE_KEY = process.env.COHERE_API_KEY!;
    try {
        // Cohere supports true batch embedding in one request (up to 96 texts)
        const res = await fetch('https://api.cohere.com/v1/embed', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${COHERE_KEY}`,
                'Content-Type': 'application/json',
                'Request-Source': 'unspecified-js-client',
            },
            body: JSON.stringify({
                texts: texts.map(t => t.slice(0, 8000)),
                model: 'embed-english-v3.0',
                input_type: 'search_document',
                truncate: 'END',
            }),
        });
        if (!res.ok) throw new Error(`Cohere batch embed ${res.status}`);
        const data = await res.json() as { embeddings: number[][] };
        return data.embeddings.map(raw => [...raw, ...raw.slice(0, 512)]);
    } catch (err) {
        // Fallback: embed one at a time
        console.warn('Batch embed failed, falling back to sequential:', err);
        const results: number[][] = [];
        for (const text of texts) {
            results.push(await embedWithCohere(text));
            await new Promise(r => setTimeout(r, 100));
        }
        return results;
    }
}

export function formatEmbedding(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface CompletionResult {
    choices: Array<{ message: { content: string | null } }>;
}

interface StreamChunk {
    choices: Array<{ delta: { content?: string } }>;
}

interface ChatParams {
    model: string;
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    response_format?: { type: string };
}

interface ChatParamsStream extends ChatParams { stream: true; }
interface ChatParamsNoStream extends ChatParams { stream?: false; }

// ─── Groq chat completions ────────────────────────────────────────────────────
// We always use llama-3.3-70b-versatile regardless of `model` param in callers
const GROQ_MODEL = 'llama-3.3-70b-versatile';

async function createCompletion(params: ChatParamsStream): Promise<AsyncIterable<StreamChunk>>;
async function createCompletion(params: ChatParamsNoStream): Promise<CompletionResult>;
async function createCompletion(params: ChatParams & { stream?: boolean }): Promise<CompletionResult | AsyncIterable<StreamChunk>> {
    const isJsonMode = params.response_format?.type === 'json_object';

    const groqMessages = params.messages.map(m => ({
        role: m.role,
        content: isJsonMode && m.role === 'system'
            ? `${m.content}\n\nIMPORTANT: Respond with valid JSON only. No markdown, no explanation.`
            : m.content,
    }));

    if (params.stream) {
        const stream = await groqClient.chat.completions.create({
            model: GROQ_MODEL,
            messages: groqMessages,
            temperature: params.temperature ?? 0.7,
            max_tokens: params.max_tokens ?? 1500,
            stream: true,
        });

        async function* openAIStyleStream(): AsyncIterable<StreamChunk> {
            for await (const chunk of stream) {
                const content = chunk.choices[0]?.delta?.content || '';
                if (content) yield { choices: [{ delta: { content } }] };
            }
        }

        return openAIStyleStream();
    } else {
        const result = await groqClient.chat.completions.create({
            model: GROQ_MODEL,
            messages: groqMessages,
            temperature: params.temperature ?? 0.7,
            max_tokens: params.max_tokens ?? 1500,
            stream: false,
            ...(isJsonMode ? { response_format: { type: 'json_object' } } : {}),
        });
        return {
            choices: [{ message: { content: result.choices[0]?.message?.content ?? null } }],
        };
    }
}

// ─── Main export — mimics `openai` object used across the codebase ────────────
export const openai = {
    chat: {
        completions: {
            create: createCompletion,
        },
    },
};
