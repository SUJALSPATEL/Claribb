import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { storeMemory } from '@/lib/memory/store';
import { extractAndStoreConcepts } from '@/lib/memory/store';

export const runtime = 'nodejs';
export const maxDuration = 30;

// Fallback URL text extraction without external libraries
async function extractUrlText(url: string): Promise<{ title: string; content: string }> {
    try {
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CLARIBB-Research-Bot/1.0)' },
            signal: AbortSignal.timeout(8000),
        });
        const html = await res.text();

        // Extract title
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : url;

        // Strip HTML tags and extract readable text
        const textContent = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
            .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
            .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 8000);

        return { title, content: textContent };
    } catch {
        throw new Error('Failed to fetch URL content');
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { type, content, url, projectId, sourceLabel } = body;

        if (!projectId) {
            return NextResponse.json({ error: 'projectId required' }, { status: 400 });
        }

        let textContent = '';
        let label = sourceLabel || 'Manual Note';
        let source: 'note' | 'url' | 'document' = 'note';

        if (type === 'text' && content) {
            textContent = content;
            source = 'note';
            label = sourceLabel || `Note — ${new Date().toLocaleDateString()}`;
        } else if (type === 'url' && url) {
            const { title, content: urlContent } = await extractUrlText(url);
            textContent = urlContent;
            label = title || url;
            source = 'url';
        } else {
            return NextResponse.json({ error: 'type (text/url) and content/url required' }, { status: 400 });
        }

        if (textContent.length < 20) {
            return NextResponse.json({ error: 'Content too short to embed' }, { status: 400 });
        }

        // Store memory + extract concepts in parallel
        const [chunksStored] = await Promise.all([
            storeMemory({
                userId: user.id,
                projectId,
                content: textContent,
                sourceType: source,
                sourceLabel: label,
                importanceScore: 0.7,
            }),
            extractAndStoreConcepts(textContent, projectId, user.id),
        ]);

        return NextResponse.json({
            success: true,
            chunksStored,
            label,
            sourceType: source,
        });

    } catch (error: unknown) {
        console.error('Memory add error:', error);
        const message = error instanceof Error ? error.message : 'Failed to add memory';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// GET: retrieve memories for a project
export async function GET(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('projectId');
        const limit = parseInt(searchParams.get('limit') || '20');

        if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

        const { data: memories } = await supabase
            .from('memory_chunks')
            .select('id, content, source_type, source_label, importance_score, access_count, created_at')
            .eq('project_id', projectId)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(limit);

        return NextResponse.json({ memories: memories || [] });
    } catch {
        return NextResponse.json({ memories: [] });
    }
}
