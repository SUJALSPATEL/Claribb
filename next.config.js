/** @type {import('next').NextConfig} */
const nextConfig = {
    // Mark heavy server-only packages as external to avoid bundling issues
    serverExternalPackages: ['pdf-parse', 'article-extractor'],

    // Allow images from external sources
    images: {
        remotePatterns: [
            { protocol: 'https', hostname: '**' },
        ],
        formats: ['image/avif', 'image/webp'],
    },

    // Compress responses
    compress: true,

    // Webpack optimizations
    webpack: (config, { isServer, dev }) => {
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
            };
        }

        // In production, split framer-motion into its own chunk
        if (!dev && !isServer) {
            config.optimization = {
                ...config.optimization,
                splitChunks: {
                    ...config.optimization?.splitChunks,
                    chunks: 'all',
                    cacheGroups: {
                        ...(config.optimization?.splitChunks?.cacheGroups || {}),
                        framerMotion: {
                            test: /[\\/]node_modules[\\/]framer-motion[\\/]/,
                            name: 'framer-motion',
                            chunks: 'all',
                            priority: 20,
                        },
                        lucide: {
                            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
                            name: 'lucide',
                            chunks: 'all',
                            priority: 20,
                        },
                    },
                },
            };
        }

        return config;
    },
};

module.exports = nextConfig;
