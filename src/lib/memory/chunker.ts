/**
 * Chunks text into overlapping segments for embedding.
 * Target: ~400 tokens per chunk, 80 token overlap
 * Roughly: 1 token ≈ 4 characters
 */
export function chunkText(
    text: string,
    chunkSize: number = 1600,   // ~400 tokens
    overlap: number = 320        // ~80 tokens
): string[] {
    const chunks: string[] = [];
    const sentences = splitIntoSentences(text);

    let currentChunk = '';

    for (const sentence of sentences) {
        if ((currentChunk + ' ' + sentence).length > chunkSize && currentChunk.length > 0) {
            chunks.push(currentChunk.trim());
            // overlap: keep last N chars
            const overlapText = currentChunk.slice(-overlap);
            currentChunk = overlapText + ' ' + sentence;
        } else {
            currentChunk = currentChunk ? currentChunk + ' ' + sentence : sentence;
        }
    }

    if (currentChunk.trim().length > 50) {
        chunks.push(currentChunk.trim());
    }

    return chunks.filter(c => c.length > 30);
}

function splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries while preserving them
    return text
        .replace(/\n\n+/g, ' [PARA] ')
        .split(/(?<=[.!?])\s+|(?<=\[PARA\])\s*/)
        .map(s => s.replace('[PARA]', '').trim())
        .filter(s => s.length > 0);
}

// Clean and normalize text before chunking
export function cleanText(text: string): string {
    return text
        .replace(/\s+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[^\S\n]+/g, ' ')
        .trim();
}
