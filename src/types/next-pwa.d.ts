declare module 'next-pwa' {
  import { NextConfig } from 'next';
  
  export interface PWAConfig {
    dest: string;
    register?: boolean;
    skipWaiting?: boolean;
    disable?: boolean;
    runtimeCaching?: any[];
    scope?: string;
    sw?: string;
    publicExcludes?: string[];
    buildExcludes?: string[] | RegExp[];
    fallbacks?: { [key: string]: string };
    cacheOnFrontEndNav?: boolean;
    reloadOnOnline?: boolean;
    subdomainPrefix?: string;
    customWorkerDir?: string;
    dynamicStartUrl?: boolean;
  }
  
  export default function withPWA(pwaConfig: PWAConfig): (nextConfig: NextConfig) => NextConfig;
}