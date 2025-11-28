#!/usr/bin/env node
/**
 * Тест Яндекс API для маршрутов и геокодирования
 */

const YANDEX_API_KEY = '11cd775a-767d-4fd6-82a5-d24b12ed076a';

// Цвета для консоли
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  data: (obj) => console.log(colors.dim + JSON.stringify(obj, null, 2) + colors.reset)
};

/**
 * 1. Тест геокодирования (адрес -> координаты)
 */
async function testGeocode(address) {
  console.log(`\n${colors.cyan}═══ ТЕСТ ГЕОКОДИРОВАНИЯ ═══${colors.reset}`);
  log.info(`Адрес: "${address}"`);
  
  const url = `https://geocode-maps.yandex.ru/1.x/?apikey=${YANDEX_API_KEY}&format=json&geocode=${encodeURIComponent(address)}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.response?.GeoObjectCollection?.featureMember?.length > 0) {
      const geoObject = data.response.GeoObjectCollection.featureMember[0].GeoObject;
      const pos = geoObject.Point.pos.split(' ');
      const lon = parseFloat(pos[0]);
      const lat = parseFloat(pos[1]);
      const name = geoObject.metaDataProperty.GeocoderMetaData.text;
      
      log.success(`Найдено: ${name}`);
      log.success(`Координаты: ${lat}, ${lon}`);
      
      return { lat, lon, name };
    } else {
      log.error('Адрес не найден');
      return null;
    }
  } catch (error) {
    log.error(`Ошибка: ${error.message}`);
    return null;
  }
}

/**
 * 2. Тест построения маршрута
 */
async function testRoute(fromLat, fromLon, toLat, toLon) {
  console.log(`\n${colors.cyan}═══ ТЕСТ МАРШРУТА ═══${colors.reset}`);
  log.info(`Откуда: ${fromLat}, ${fromLon}`);
  log.info(`Куда: ${toLat}, ${toLon}`);
  
  // Яндекс Router API
  const url = `https://api.routing.yandex.net/v2/route?apikey=${YANDEX_API_KEY}&waypoints=${fromLon},${fromLat}|${toLon},${toLat}&mode=driving`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (response.ok && data.route) {
      const route = data.route;
      const leg = route.legs?.[0];
      
      if (leg) {
        const distance = (leg.distance?.value / 1000).toFixed(1);
        const duration = Math.round(leg.duration?.value / 60);
        const durationTraffic = Math.round((leg.durationTraffic?.value || leg.duration?.value) / 60);
        
        log.success(`Расстояние: ${distance} км`);
        log.success(`Время без пробок: ${duration} мин`);
        log.success(`Время с пробками: ${durationTraffic} мин`);
        
        return {
          distance: parseFloat(distance),
          duration,
          durationTraffic
        };
      }
    }
    
    // Если route API не сработал - попробуем Distance Matrix
    log.info('Router API не вернул данные, пробуем альтернативу...');
    log.data(data);
    
    return null;
  } catch (error) {
    log.error(`Ошибка: ${error.message}`);
    return null;
  }
}

/**
 * 3. Альтернатива: Distance Matrix API
 */
async function testDistanceMatrix(origins, destinations) {
  console.log(`\n${colors.cyan}═══ ТЕСТ DISTANCE MATRIX ═══${colors.reset}`);
  
  // Формат: lat,lon
  const url = `https://api.routing.yandex.net/v2/distancematrix?apikey=${YANDEX_API_KEY}&origins=${origins}&destinations=${destinations}&mode=driving`;
  
  log.info(`URL: ${url}`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    log.info(`Status: ${response.status}`);
    log.data(data);
    
    if (data.rows?.[0]?.elements?.[0]) {
      const element = data.rows[0].elements[0];
      if (element.status === 'OK') {
        log.success(`Расстояние: ${(element.distance.value / 1000).toFixed(1)} км`);
        log.success(`Время: ${Math.round(element.duration.value / 60)} мин`);
      }
    }
    
    return data;
  } catch (error) {
    log.error(`Ошибка: ${error.message}`);
    return null;
  }
}

/**
 * 4. Тест трафика
 */
async function testTraffic(lat, lon) {
  console.log(`\n${colors.cyan}═══ ТЕСТ ТРАФИКА ═══${colors.reset}`);
  log.info(`Координаты: ${lat}, ${lon}`);
  
  // Яндекс не имеет отдельного API для уровня пробок в точке
  // Но можем посмотреть через jams info в маршруте
  log.info('Трафик определяется через маршрут (durationTraffic vs duration)');
}

/**
 * Запуск всех тестов
 */
async function runTests() {
  console.log(`\n${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`);
  console.log(`${colors.cyan}║           ТЕСТИРОВАНИЕ ЯНДЕКС API МАРШРУТОВ               ║${colors.reset}`);
  console.log(`${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}`);
  
  // 1. Тест геокодирования
  const spb = await testGeocode('Санкт-Петербург, Невский проспект 1');
  const home = await testGeocode('Санкт-Петербург, Московский проспект 100');
  
  // 2. Если геокодирование работает - тест маршрута
  if (spb && home) {
    await testRoute(home.lat, home.lon, spb.lat, spb.lon);
    
    // 3. Тест Distance Matrix
    await testDistanceMatrix(
      `${home.lat},${home.lon}`,
      `${spb.lat},${spb.lon}`
    );
  }
  
  // Тест с известными координатами (если геокод не работает)
  console.log(`\n${colors.yellow}═══ ТЕСТ С ФИКСИРОВАННЫМИ КООРДИНАТАМИ ═══${colors.reset}`);
  
  // Невский проспект 1
  const nevsky = { lat: 59.938732, lon: 30.315424 };
  // Московский проспект 100  
  const moskovsky = { lat: 59.892285, lon: 30.318789 };
  
  await testRoute(moskovsky.lat, moskovsky.lon, nevsky.lat, nevsky.lon);
  await testDistanceMatrix(
    `${moskovsky.lat},${moskovsky.lon}`,
    `${nevsky.lat},${nevsky.lon}`
  );
  
  console.log(`\n${colors.green}═══ ТЕСТЫ ЗАВЕРШЕНЫ ═══${colors.reset}\n`);
}

// Запуск
runTests();
