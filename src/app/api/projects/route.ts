import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { data: projects, error } = await supabase
            .from('projects')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        // Enrich projects with stats — resilient to missing tables
        const enriched = await Promise.all(
            (projects || []).map(async project => {
                try {
                    const [memCount, sessionCount, conceptCount] = await Promise.all([
                        supabase
                            .from('memory_chunks')
                            .select('id', { count: 'exact', head: true })
                            .eq('project_id', project.id),
                        supabase
                            .from('sessions')
                            .select('id', { count: 'exact', head: true })
                            .eq('project_id', project.id),
                        supabase
                            .from('concepts')
                            .select('id', { count: 'exact', head: true })
                            .eq('project_id', project.id),
                    ]);

                    return {
                        ...project,
                        memory_count: memCount.count ?? 0,
                        session_count: sessionCount.count ?? 0,
                        concept_count: conceptCount.count ?? 0,
                        depth_score: 0,
                    };
                } catch {
                    // Tables may not exist yet
                    return { ...project, memory_count: 0, session_count: 0, concept_count: 0, depth_score: 0 };
                }
            })
        );

        return NextResponse.json({ projects: enriched });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to fetch projects';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { name, description, color, icon } = body;

        if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

        const { data: project, error } = await supabase
            .from('projects')
            .insert({
                user_id: user.id,
                name,
                description: description || '',
                color: color || '#6366f1',
                icon: icon || '🔬',
            })
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ project });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to create project';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Failed to delete project';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
