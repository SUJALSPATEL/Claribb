import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
    try {
        const { message } = await req.json();
        if (!message || typeof message !== 'string' || message.trim().length === 0) {
            return NextResponse.json({ error: 'Message required' }, { status: 400 });
        }

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: `You are CLARIBB, a multi-agent research intelligence system. You help researchers by answering questions concisely and insightfully. You have access to a persistent memory graph that remembers context across sessions. Keep responses to 2-3 sentences max — sharp, useful, and research-focused. You are being used as a demo on the CLARIBB landing page so keep it engaging and show off your intelligence.

CRITICAL LANGUAGE RULE: Detect and perfectly mirror the user's language style:
- If the user writes in Hinglish (Hindi words written in Roman/English script, mixed with English), respond in Hinglish the same way — casual, natural, Roman-script Hindi mixed with English. Example: "Haan bilkul, CLARIBB tumhara research yaad rakhta hai across sessions."
- If the user writes in pure Hindi (Devanagari script), respond in pure Hindi.
- If the user writes in English, respond in English.
- Never switch styles unless the user does. Match their exact vibe and mix ratio.`,
                },
                { role: 'user', content: message.trim().slice(0, 500) },
            ],
            max_tokens: 220,
            temperature: 0.7,
        });

        const response = completion.choices[0]?.message?.content ?? 'No response generated.';
        return NextResponse.json({ response });
    } catch (err) {
        console.error('chat-demo error:', err);
        return NextResponse.json({ error: 'Failed to get response' }, { status: 500 });
    }
}
