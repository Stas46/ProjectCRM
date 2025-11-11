/**
 * Cloudflare Worker для проксирования OpenAI API
 * Обходит блокировку OpenAI в России
 * 
 * Инструкция по развертыванию:
 * 1. Зайдите на https://dash.cloudflare.com/
 * 2. Workers & Pages → Create Worker
 * 3. Скопируйте код ниже
 * 4. Deploy
 * 5. Скопируйте URL воркера (например: https://openai-proxy.your-subdomain.workers.dev)
 * 6. Добавьте в .env.local: OPENAI_BASE_URL=https://openai-proxy.your-subdomain.workers.dev/v1
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Базовый URL OpenAI API
    const OPENAI_API_BASE = 'https://api.openai.com';
    
    // Создаём новый URL для OpenAI
    const openaiUrl = OPENAI_API_BASE + url.pathname + url.search;
    
    // Копируем все заголовки из оригинального запроса
    const headers = new Headers(request.headers);
    
    // Убираем заголовки Cloudflare
    headers.delete('cf-connecting-ip');
    headers.delete('cf-ipcountry');
    headers.delete('cf-ray');
    headers.delete('cf-visitor');
    
    // Создаём новый запрос к OpenAI
    const newRequest = new Request(openaiUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
    });
    
    try {
      // Проксируем запрос к OpenAI
      const response = await fetch(newRequest);
      
      // Создаём новый ответ с CORS заголовками
      const newResponse = new Response(response.body, response);
      
      // Добавляем CORS заголовки
      newResponse.headers.set('Access-Control-Allow-Origin', '*');
      newResponse.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      newResponse.headers.set('Access-Control-Allow-Headers', '*');
      
      return newResponse;
    } catch (error) {
      return new Response(JSON.stringify({ 
        error: 'Proxy error', 
        message: error.message 
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
