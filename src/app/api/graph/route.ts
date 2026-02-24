import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
    try {
        const supabase = await createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const projectId = searchParams.get('projectId');

        if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });

        // Fetch concepts (nodes) — resilient to missing table
        const { data: concepts } = await supabase
            .from('concepts')
            .select('*')
            .eq('project_id', projectId)
            .eq('user_id', user.id)
            .order('weight', { ascending: false })
            .limit(80);

        // Fetch relationships (edges) — resilient to missing table
        const { data: relationships } = await supabase
            .from('concept_relationships')
            .select('*')
            .eq('project_id', projectId)
            .limit(200);

        return NextResponse.json({
            nodes: concepts || [],
            edges: relationships || [],
        });

    } catch (error: unknown) {
        // Return empty graph if tables don't exist yet
        console.error('[graph GET]', error);
        return NextResponse.json({ nodes: [], edges: [] });
    }
}
