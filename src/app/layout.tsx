import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

// next/font/google → font is self-hosted at build time, zero render-blocking
const inter = Inter({
    subsets: ['latin'],
    weight: ['300', '400', '500', '600', '700', '800'],
    display: 'swap',
    variable: '--font-inter',
    preload: true,
});

export const metadata: Metadata = {
    title: 'Claribb.AI — Multi-Agent Research Intelligence',
    description: 'Claribb.AI is a persistent, memory-driven AI research workspace that remembers everything across sessions, surfaces relevant context automatically, and deploys 5 specialized agents to think, search, challenge, connect, and detect conflicts on your behalf.',
    keywords: ['AI research', 'knowledge management', 'RAG', 'research assistant', 'AI memory'],
    icons: {
        icon: '/favicon.svg',
        shortcut: '/favicon.svg',
    },
    openGraph: {
        title: 'Claribb.AI — Multi-Agent Research Intelligence',
        description: "The AI that remembers your research, so you don't have to.",
        type: 'website',
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className={`dark ${inter.variable}`} suppressHydrationWarning>
            <head>
                <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
            </head>
            <body className={`${inter.className} antialiased`} suppressHydrationWarning>
                {children}
            </body>
        </html>
    );
}
