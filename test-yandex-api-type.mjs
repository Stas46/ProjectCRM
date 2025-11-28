#!/usr/bin/env node
/**
 * Тест разных Яндекс API с одним ключом
 * Определяем, для какого API он предназначен
 */

const YANDEX_API_KEY = '11cd775a-767d-4fd6-82a5-d24b12ed076a';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

async function testAPI(name, url) {
  console.log(`\n${colors.cyan}═══ ${name} ═══${colors.reset}`);
  console.log(`${colors.dim}${url.substring(0, 100)}...${colors.reset}`);
  
  try {
    const response = await fetch(url);
    const text = await response.text();
    let data;
    try { data = JSON.parse(text); } catch { data = text; }
    
    if (response.ok) {
      console.log(`${colors.green}✅ РАБОТАЕТ! Status: ${response.status}${colors.reset}`);
      if (typeof data === 'object') {
        console.log(colors.dim + JSON.stringify(data, null, 2).substring(0, 500) + colors.reset);
      }
      return true;
    } else {
      console.log(`${colors.red}❌ Status: ${response.status}${colors.reset}`);
      console.log(colors.dim + (typeof data === 'string' ? data.substring(0, 200) : JSON.stringify(data)) + colors.reset);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}❌ Ошибка: ${error.message}${colors.reset}`);
    return false;
  }
}

async function runTests() {
  console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║     ОПРЕДЕЛЕНИЕ ТИПА API ДЛЯ КЛЮЧА ЯНДЕКС                     ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════════╝${colors.reset}`);
  
  const address = encodeURIComponent('Санкт-Петербург, Невский проспект 1');
  
  // 1. Geocoder API (HTTP)
  await testAPI(
    'Geocoder API (geocode-maps.yandex.ru)',
    `https://geocode-maps.yandex.ru/1.x/?apikey=${YANDEX_API_KEY}&format=json&geocode=${address}`
  );
  
  // 2. Static Maps API
  await testAPI(
    'Static Maps API',
    `https://static-maps.yandex.ru/1.x/?ll=30.315424,59.938732&z=12&size=400,400&apikey=${YANDEX_API_KEY}`
  );
  
  // 3. Routing API 
  await testAPI(
    'Routing API v2',
    `https://api.routing.yandex.net/v2/route?apikey=${YANDEX_API_KEY}&waypoints=30.315424,59.938732|30.318789,59.892285&mode=driving`
  );
  
  // 4. Search API
  await testAPI(
    'Search API (Geosuggest)',
    `https://suggest-maps.yandex.ru/v1/suggest?apikey=${YANDEX_API_KEY}&text=Невский&types=geo`
  );
  
  // 5. Traffic API (если есть)
  await testAPI(
    'Traffic Layer Info',
    `https://api.lbs.yandex.net/geolocation/?json={"common":{"version":"1.0"}}&apikey=${YANDEX_API_KEY}`
  );
  
  console.log(`\n${colors.yellow}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.yellow}Возможно ваш ключ для JavaScript API (для карт в браузере).${colors.reset}`);
  console.log(`${colors.yellow}Для маршрутов нужен отдельный Routing API ключ.${colors.reset}`);
  console.log(`${colors.yellow}${colors.reset}`);
  console.log(`${colors.yellow}Откуда получить ключи:${colors.reset}`);
  console.log(`${colors.blue}1. Кабинет разработчика: https://developer.tech.yandex.ru/${colors.reset}`);
  console.log(`${colors.blue}2. Geocoder API: требует подключения в кабинете${colors.reset}`);
  console.log(`${colors.blue}3. Routing API: отдельный сервис, платный${colors.reset}`);
  console.log(`\n`);
}

runTests();
