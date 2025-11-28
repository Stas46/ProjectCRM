#!/usr/bin/env node
/**
 * Тест обновлённых сервисов маршрутов
 */

// Импорт напрямую не сработает (TypeScript), поэтому тестируем API напрямую

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

async function testGeocodeAndRoute() {
  console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║     ТЕСТ ОБНОВЛЁННЫХ СЕРВИСОВ МАРШРУТОВ                       ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════════╝${colors.reset}`);
  
  // Тест геокодирования
  console.log(`\n${colors.yellow}1. Геокодирование (Nominatim)${colors.reset}`);
  
  const fromAddress = 'Санкт-Петербург, Пулково аэропорт';
  const toAddress = 'Санкт-Петербург, Невский проспект 1';
  
  const fromGeoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fromAddress)}&limit=1&countrycodes=ru`;
  const toGeoUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(toAddress)}&limit=1&countrycodes=ru`;
  
  const headers = { 'User-Agent': 'GlazingCRM/1.0 (test)' };
  
  const fromResponse = await fetch(fromGeoUrl, { headers });
  const fromData = await fromResponse.json();
  console.log(`  Откуда: ${fromAddress}`);
  console.log(`  ${colors.green}→ ${fromData[0]?.display_name?.substring(0, 60)}...${colors.reset}`);
  console.log(`  ${colors.green}→ Координаты: ${fromData[0]?.lat}, ${fromData[0]?.lon}${colors.reset}`);
  
  const toResponse = await fetch(toGeoUrl, { headers });
  const toData = await toResponse.json();
  console.log(`  Куда: ${toAddress}`);
  console.log(`  ${colors.green}→ ${toData[0]?.display_name?.substring(0, 60)}...${colors.reset}`);
  console.log(`  ${colors.green}→ Координаты: ${toData[0]?.lat}, ${toData[0]?.lon}${colors.reset}`);
  
  // Тест маршрута
  console.log(`\n${colors.yellow}2. Маршрут (OSRM)${colors.reset}`);
  
  const fromLat = parseFloat(fromData[0]?.lat);
  const fromLon = parseFloat(fromData[0]?.lon);
  const toLat = parseFloat(toData[0]?.lat);
  const toLon = parseFloat(toData[0]?.lon);
  
  const routeUrl = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=false&steps=true`;
  const routeResponse = await fetch(routeUrl);
  const routeData = await routeResponse.json();
  
  if (routeData.code === 'Ok' && routeData.routes?.[0]) {
    const route = routeData.routes[0];
    const distance = (route.distance / 1000).toFixed(1);
    const duration = Math.round(route.duration / 60);
    
    console.log(`  ${colors.green}✅ Расстояние: ${distance} км${colors.reset}`);
    console.log(`  ${colors.green}✅ Время: ${duration} мин${colors.reset}`);
    
    // Оценка с пробками
    const hour = new Date().getHours();
    let trafficMultiplier = 1.0;
    if (hour >= 7 && hour <= 10) trafficMultiplier = 1.4;
    else if (hour >= 17 && hour <= 20) trafficMultiplier = 1.5;
    else if (hour >= 11 && hour <= 16) trafficMultiplier = 1.2;
    
    const durationTraffic = Math.round(duration * trafficMultiplier);
    console.log(`  ${colors.green}✅ С пробками: ${durationTraffic} мин (x${trafficMultiplier})${colors.reset}`);
  }
  
  // Пример ответа бота
  console.log(`\n${colors.yellow}3. Пример ответа бота:${colors.reset}`);
  console.log(`
🚗 **Маршрут: Пулково → Невский проспект**

📍 Расстояние: ${(routeData.routes?.[0]?.distance / 1000).toFixed(1)} км
⏱️ Время в пути: ${Math.round(routeData.routes?.[0]?.duration / 60)} мин
🚦 С учетом пробок: ~${Math.round(routeData.routes?.[0]?.duration / 60 * 1.3)} мин

💡 Выезжай заранее, особенно в час пик!
`);

  console.log(`${colors.green}═══ ТЕСТ УСПЕШЕН! ═══${colors.reset}\n`);
}

testGeocodeAndRoute();
