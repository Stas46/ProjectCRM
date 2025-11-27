import type { NextConfig } from "next";
import withPWA from 'next-pwa';
import path from 'path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true, // Отключаем проверку ESLint при сборке
  },
  typescript: {
    ignoreBuildErrors: false, // Включаем проверку TypeScript
  },
  // @ts-ignore: Добавляем конфигурацию Turbopack
  turbopack: {
    root: path.resolve(__dirname)
  }
};

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development'
});

export default pwaConfig(nextConfig);
