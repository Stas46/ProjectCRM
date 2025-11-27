/**
 * Cloudflare Worker для проксирования OpenAI и Anthropic API
 * Обходит блокировку в России
 * 
 * Использование:
 * - OpenAI: https://your-worker.workers.dev/openai/v1/...
 * - Anthropic: https://your-worker.workers.dev/anthropic/v1/...
 * 
 * Инструкция:
 * 1. https://dash.cloudflare.com/ → Workers & Pages → Create Worker
 * 2. Скопируйте этот код → Save and Deploy
 * 3. В OpenHands:
 *    - OpenAI Base URL: https://your-worker.workers.dev/openai/v1
 *    - Anthropic Base URL: https://your-worker.workers.dev/anthropic/v1
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Обработка CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        }
      });
    }
    
    // Определяем целевой API по пути
    let targetBase;
    let targetPath = url.pathname;
    
    if (url.pathname.startsWith('/openai')) {
      targetBase = 'https://api.openai.com';
      targetPath = url.pathname.replace('/openai', '');
    } else if (url.pathname.startsWith('/anthropic')) {
      targetBase = 'https://api.anthropic.com';
      targetPath = url.pathname.replace('/anthropic', '');
    } else {
      return new Response(JSON.stringify({
        error: 'Invalid path',
        message: 'Use /openai/... or /anthropic/...',
        examples: {
          openai: 'https://your-worker.workers.dev/openai/v1/chat/completions',
          anthropic: 'https://your-worker.workers.dev/anthropic/v1/messages'
        }
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // Создаём URL для целевого API
    const targetUrl = targetBase + targetPath + url.search;
    
    // Копируем заголовки
    const headers = new Headers(request.headers);
    
    // Убираем заголовки Cloudflare
    headers.delete('cf-connecting-ip');
    headers.delete('cf-ipcountry');
    headers.delete('cf-ray');
    headers.delete('cf-visitor');
    headers.delete('host');
    
    // Создаём запрос
    const newRequest = new Request(targetUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
    });
    
    try {
      // Проксируем запрос
      const response = await fetch(newRequest);
      
      // Создаём ответ с CORS
      const newResponse = new Response(response.body, response);
      
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', '*');
      
      return newResponse;
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Proxy error', 
        message: error.message,
        target: targetUrl
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
