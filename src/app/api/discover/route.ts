import { NextRequest, NextResponse } from 'next/server';

const NEWS_API_KEY = 'da272c11d16b4a4b9b3c8e8bfecacfa5';
const BASE_URL = 'https://newsapi.org/v2/top-headlines';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') || 'technology';
    const q = searchParams.get('q') || '';

    const params = new URLSearchParams({
        apiKey: NEWS_API_KEY,
        language: 'en',
        pageSize: '20',
        ...(q ? { q } : { category }),
    });

    try {
        const res = await fetch(`${BASE_URL}?${params}`, { next: { revalidate: 0 } });
        const data = await res.json();
        if (!res.ok) return NextResponse.json({ error: data.message }, { status: res.status });
        return NextResponse.json({ articles: data.articles || [], totalResults: data.totalResults });
    } catch {
        return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 });
    }
}
