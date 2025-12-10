import type { NextConfig } from "next";
import withPWA from 'next-pwa';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // @ts-ignore: Turbopack для быстрой разработки
  turbopack: {
    root: path.resolve(__dirname)
  },
  // Оптимизация производительности
  experimental: {
    optimizeCss: true, // Оптимизация CSS
    optimizePackageImports: ['lucide-react', 'date-fns'], // Уменьшаем размер бандла
  },
  // Кэширование для статических данных
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=10, stale-while-revalidate=59',
          },
        ],
      },
    ];
  },
  // Сжатие ресурсов
  compress: true,
  // Оптимизация изображений
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    minimumCacheTTL: 60,
  },
};

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // Кэш-стратегии для PWA
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\.telegram\.org\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'telegram-api',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60,
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 30,
        },
      },
    },
  ],
});

export default pwaConfig(nextConfig);
