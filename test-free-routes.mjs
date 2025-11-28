#!/usr/bin/env node
/**
 * Тест бесплатных API для маршрутов:
 * 1. OSRM (Open Source Routing Machine) - бесплатный
 * 2. OpenRouteService - бесплатный с лимитами
 * 3. Nominatim (геокодирование) - бесплатный
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

/**
 * 1. OSRM - бесплатный routing
 */
async function testOSRM(fromLat, fromLon, toLat, toLon) {
  console.log(`\n${colors.cyan}═══ OSRM (бесплатный) ═══${colors.reset}`);
  
  const url = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=false&steps=true`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes?.[0]) {
      const route = data.routes[0];
      const distance = (route.distance / 1000).toFixed(1);
      const duration = Math.round(route.duration / 60);
      
      console.log(`${colors.green}✅ РАБОТАЕТ!${colors.reset}`);
      console.log(`${colors.green}📍 Расстояние: ${distance} км${colors.reset}`);
      console.log(`${colors.green}⏱️  Время: ${duration} мин${colors.reset}`);
      
      // Показать шаги маршрута
      if (route.legs?.[0]?.steps) {
        console.log(`${colors.dim}Шаги маршрута:${colors.reset}`);
        route.legs[0].steps.slice(0, 5).forEach((step, i) => {
          const stepDist = (step.distance / 1000).toFixed(2);
          console.log(`${colors.dim}  ${i+1}. ${step.maneuver.type} - ${stepDist} км${colors.reset}`);
        });
      }
      
      return { distance: parseFloat(distance), duration, steps: route.legs?.[0]?.steps };
    } else {
      console.log(`${colors.red}❌ Ошибка: ${data.code}${colors.reset}`);
      return null;
    }
  } catch (error) {
    console.log(`${colors.red}❌ ${error.message}${colors.reset}`);
    return null;
  }
}

/**
 * 2. Nominatim - бесплатное геокодирование (OpenStreetMap)
 */
async function testNominatim(address) {
  console.log(`\n${colors.cyan}═══ Nominatim Geocoding (бесплатный) ═══${colors.reset}`);
  console.log(`${colors.blue}Адрес: "${address}"${colors.reset}`);
  
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
  
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GlazingCRM/1.0 (test)'
      }
    });
    const data = await response.json();
    
    if (data.length > 0) {
      const result = data[0];
      console.log(`${colors.green}✅ Найдено: ${result.display_name}${colors.reset}`);
      console.log(`${colors.green}📍 Координаты: ${result.lat}, ${result.lon}${colors.reset}`);
      
      return {
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        name: result.display_name
      };
    } else {
      console.log(`${colors.red}❌ Адрес не найден${colors.reset}`);
      return null;
    }
  } catch (error) {
    console.log(`${colors.red}❌ ${error.message}${colors.reset}`);
    return null;
  }
}

/**
 * 3. GraphHopper (бесплатный с ограничениями)
 */
async function testGraphHopper(fromLat, fromLon, toLat, toLon) {
  console.log(`\n${colors.cyan}═══ GraphHopper (нужен API key) ═══${colors.reset}`);
  console.log(`${colors.yellow}Бесплатно 500 запросов/день: https://www.graphhopper.com/${colors.reset}`);
}

/**
 * Запуск тестов
 */
async function runTests() {
  console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║     ТЕСТ БЕСПЛАТНЫХ API ДЛЯ МАРШРУТОВ                         ║${colors.reset}`);
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════════════╝${colors.reset}`);
  
  // Тест геокодирования
  const nevsky = await testNominatim('Санкт-Петербург, Невский проспект 1');
  const moskovsky = await testNominatim('Санкт-Петербург, Московский проспект 100');
  
  // Тест маршрута
  if (nevsky && moskovsky) {
    console.log(`\n${colors.yellow}═══ МАРШРУТ: ${moskovsky.name.split(',')[0]} → ${nevsky.name.split(',')[0]} ═══${colors.reset}`);
    await testOSRM(moskovsky.lat, moskovsky.lon, nevsky.lat, nevsky.lon);
  }
  
  // Тест с фиксированными координатами
  console.log(`\n${colors.yellow}═══ ТЕСТ С ФИКСИРОВАННЫМИ КООРДИНАТАМИ ═══${colors.reset}`);
  console.log(`${colors.dim}Московский проспект 100 → Невский проспект 1${colors.reset}`);
  
  // Координаты из OpenStreetMap
  await testOSRM(59.8914, 30.3188, 59.9387, 30.3154);
  
  // Ещё один маршрут - подлиннее
  console.log(`\n${colors.yellow}═══ ДЛИННЫЙ МАРШРУТ ═══${colors.reset}`);
  console.log(`${colors.dim}Пулково → Центр${colors.reset}`);
  await testOSRM(59.8003, 30.2625, 59.9343, 30.3351);
  
  console.log(`\n${colors.green}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.green}OSRM и Nominatim - бесплатные и работают!${colors.reset}`);
  console.log(`${colors.green}Можем использовать их для бота.${colors.reset}`);
  console.log(`\n`);
}

runTests();
