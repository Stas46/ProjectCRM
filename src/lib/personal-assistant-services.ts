/**
 * Personal Assistant Services
 * External APIs: OpenWeatherMap (weather) + OpenRouteService (maps/routing)
 * Both FREE with generous limits!
 */

// ============================================
// OpenWeatherMap API - Free: 1000 calls/day
// https://openweathermap.org/api
// ============================================

interface WeatherData {
  temp: number;
  feels_like: number;
  condition: string;
  wind_speed: number;
  pressure_mm: number;
  humidity: number;
  forecast?: Array<{
    date: string;
    temp_min: number;
    temp_max: number;
    condition: string;
  }>;
}

/**
 * Get current weather and 3-day forecast
 * FREE: 1000 calls/day on OpenWeatherMap
 */
export async function getWeather(lat: number, lon: number): Promise<{ data: WeatherData | null; error: string | null }> {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return { data: null, error: 'OPENWEATHER_API_KEY не задан. Получить: https://openweathermap.org/api' };
    }

    // Get 3-day forecast (24 hours ahead in 3-hour intervals)
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=ru&cnt=24`
    );

    if (!response.ok) {
      return { data: null, error: `Weather API error: ${response.status}` };
    }

    const data = await response.json();
    
    // Current weather from first forecast item
    const current = data.list[0];
    
    // Group by day for 3-day forecast
    const forecastByDay: any = {};
    data.list.forEach((item: any) => {
      const date = item.dt_txt.split(' ')[0];
      if (!forecastByDay[date]) {
        forecastByDay[date] = { temps: [], conditions: [] };
      }
      forecastByDay[date].temps.push(item.main.temp);
      forecastByDay[date].conditions.push(item.weather[0].description);
    });
    
    const forecast = Object.entries(forecastByDay).slice(0, 3).map(([date, info]: [string, any]) => ({
      date,
      temp_min: Math.round(Math.min(...info.temps)),
      temp_max: Math.round(Math.max(...info.temps)),
      condition: info.conditions[0],
    }));

    return {
      data: {
        temp: Math.round(current.main.temp),
        feels_like: Math.round(current.main.feels_like),
        condition: current.weather[0].description,
        wind_speed: Math.round(current.wind.speed),
        pressure_mm: Math.round(current.main.pressure * 0.75), // hPa to mmHg
        humidity: current.main.humidity,
        forecast,
      },
      error: null
    };
  } catch (error) {
    console.error('Weather error:', error);
    return { data: null, error: 'Не удалось получить погоду' };
  }
}

/**
 * Format weather data for AI with emojis
 */
export function formatWeatherForAI(weather: WeatherData): string {
  const conditionEmoji: Record<string, string> = {
    'ясно': '☀️',
    'малооблачно': '🌤️',
    'облачно': '☁️',
    'пасмурно': '☁️',
    'небольшой дождь': '🌦️',
    'дождь': '🌧️',
    'сильный дождь': '🌧️⚡',
    'гроза': '⛈️',
    'снег': '🌨️',
    'небольшой снег': '🌨️',
    'туман': '🌫️'
  };

  const emoji = conditionEmoji[weather.condition.toLowerCase()] || '🌡️';
  
  let text = `${emoji} **Погода сейчас:**\n`;
  text += `🌡️ Температура: ${weather.temp}°C (ощущается как ${weather.feels_like}°C)\n`;
  text += `📊 ${weather.condition}\n`;
  text += `💨 Ветер: ${weather.wind_speed} м/с\n`;
  text += `💧 Влажность: ${weather.humidity}%\n`;
  text += `🔽 Давление: ${weather.pressure_mm} мм рт.ст.\n`;

  if (weather.forecast && weather.forecast.length > 0) {
    text += `\n📅 **Прогноз на 3 дня:**\n`;
    weather.forecast.forEach(day => {
      const emoji = conditionEmoji[day.condition.toLowerCase()] || '🌡️';
      text += `${emoji} ${day.date}: ${day.temp_min}°...${day.temp_max}°C, ${day.condition}\n`;
    });
  }

  return text;
}

/**
 * Get clothing advice based on weather
 */
export function getClothingAdvice(weather: WeatherData): string {
  const temp = weather.temp;
  const condition = weather.condition.toLowerCase();

  let advice = '\n👔 **Совет по одежде:**\n';

  if (temp < -15) {
    advice += '🧥 Теплая зимняя куртка, шапка, шарф, перчатки обязательно!';
  } else if (temp < -5) {
    advice += '🧥 Зимняя куртка, шапка и перчатки';
  } else if (temp < 5) {
    advice += '🧥 Теплая куртка или пальто';
  } else if (temp < 15) {
    advice += '🧥 Легкая куртка или ветровка';
  } else if (temp < 25) {
    advice += '👕 Легкая одежда, можно без куртки';
  } else {
    advice += '🩳 Легкая летняя одежда';
  }

  if (condition.includes('дождь')) {
    advice += '\n☔ Не забудь зонт!';
  }

  if (weather.wind_speed > 10) {
    advice += '\n💨 Ветрено! Надень что-то плотное';
  }

  return advice;
}

// ============================================
// OpenRouteService API - Free: 2000 calls/day
// https://openrouteservice.org
// ============================================

interface TrafficData {
  level: number; // 0-10 scale
  description: string;
  color: string;
}

interface RouteData {
  duration: number; // minutes
  duration_in_traffic: number; // minutes
  distance: number; // km
  steps: Array<{
    instruction: string;
    distance: number;
  }>;
}

interface GeocodingData {
  lat: number;
  lon: number;
  formatted_address: string;
}

/**
 * Get traffic level (estimated based on time patterns)
 * No external API needed - uses time-based heuristics
 */
export async function getTrafficLevel(lat: number, lon: number, radius = 5000): Promise<{ data: TrafficData | null; error: string | null }> {
  try {
    // Estimate traffic based on current time (no API needed!)
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();
    
    let level = 1;
    
    // Weekend - less traffic
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      if (hour >= 10 && hour <= 20) level = 3;
      else level = 1;
    }
    // Weekday patterns
    else {
      // Morning rush (7-10)
      if (hour >= 7 && hour <= 10) level = 7;
      // Evening rush (17-20)
      else if (hour >= 17 && hour <= 20) level = 8;
      // Midday (11-16)
      else if (hour >= 11 && hour <= 16) level = 4;
      // Night/early morning
      else level = 2;
    }

    return {
      data: {
        level,
        description: getTrafficDescription(level),
        color: getTrafficColor(level),
      },
      error: null
    };
  } catch (error) {
    console.error('Traffic error:', error);
    return { data: null, error: 'Не удалось определить пробки' };
  }
}

function getTrafficDescription(level: number): string {
  if (level <= 2) return 'Свободно';
  if (level <= 4) return 'Небольшие задержки';
  if (level <= 6) return 'Средние пробки';
  if (level <= 8) return 'Сильные пробки';
  return 'Очень плотное движение';
}

function getTrafficColor(level: number): string {
  if (level <= 3) return '🟢';
  if (level <= 6) return '🟡';
  if (level <= 8) return '🟠';
  return '🔴';
}

/**
 * Calculate route between two points using OSRM (бесплатный)
 * https://project-osrm.org - Open Source Routing Machine
 */
export async function calculateRoute(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): Promise<{ data: RouteData | null; error: string | null }> {
  try {
    // OSRM - бесплатный routing API
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLon},${fromLat};${toLon},${toLat}?overview=false&steps=true`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes?.[0]) {
      const route = data.routes[0];
      const distance = Math.round(route.distance / 1000 * 10) / 10; // км с 1 знаком
      const duration = Math.round(route.duration / 60); // минуты
      
      // Оценка пробок по времени суток
      const hour = new Date().getHours();
      let trafficMultiplier = 1.0;
      if (hour >= 7 && hour <= 10) trafficMultiplier = 1.4;
      else if (hour >= 17 && hour <= 20) trafficMultiplier = 1.5;
      else if (hour >= 11 && hour <= 16) trafficMultiplier = 1.2;
      
      // Шаги маршрута
      const steps = route.legs?.[0]?.steps?.map((step: any) => ({
        instruction: step.maneuver?.type || 'Следуй',
        distance: Math.round(step.distance),
      })) || [];
      
      return {
        data: {
          duration,
          duration_in_traffic: Math.round(duration * trafficMultiplier),
          distance,
          steps,
        },
        error: null
      };
    }
    
    // Fallback на Haversine если OSRM не ответил
    console.log('OSRM fallback to Haversine:', data.code);
    return calculateRouteFallback(fromLat, fromLon, toLat, toLon);
    
  } catch (error) {
    console.error('OSRM error, using fallback:', error);
    return calculateRouteFallback(fromLat, fromLon, toLat, toLon);
  }
}

/**
 * Fallback: Calculate route using Haversine formula
 */
function calculateRouteFallback(
  fromLat: number,
  fromLon: number,
  toLat: number,
  toLon: number
): { data: RouteData | null; error: string | null } {
  const R = 6371;
  const dLat = (toLat - fromLat) * Math.PI / 180;
  const dLon = (toLon - fromLon) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const straightDistance = R * c;
  
  // Реальное расстояние обычно в 1.3-1.5 раза больше прямого
  const distance = Math.round(straightDistance * 1.4 * 10) / 10;
  const duration = Math.round(distance / 35 * 60); // ~35 км/ч в городе
  
  const hour = new Date().getHours();
  let trafficMultiplier = 1.0;
  if (hour >= 7 && hour <= 10) trafficMultiplier = 1.4;
  else if (hour >= 17 && hour <= 20) trafficMultiplier = 1.5;
  else if (hour >= 11 && hour <= 16) trafficMultiplier = 1.2;
  
  return {
    data: {
      duration,
      duration_in_traffic: Math.round(duration * trafficMultiplier),
      distance,
      steps: [{ instruction: 'Приблизительный расчёт', distance: distance * 1000 }],
    },
    error: null
  };
}

/**
 * Format route for AI presentation
 */
export function formatRouteForAI(route: RouteData, from: string, to: string): string {
  let text = `🚗 **Маршрут: ${from} → ${to}**\n\n`;
  text += `📍 Расстояние: ${route.distance} км\n`;
  text += `⏱️ Время в пути: ${route.duration} мин\n`;
  
  if (route.duration_in_traffic > route.duration) {
    const delay = route.duration_in_traffic - route.duration;
    text += `🚦 С учетом пробок: ${route.duration_in_traffic} мин (+${delay} мин)\n`;
  }

  return text;
}

/**
 * Calculate when to leave to arrive at specific time
 */
export function calculateDepartureTime(arrivalTime: string, durationMinutes: number): string {
  const [hours, minutes] = arrivalTime.split(':').map(Number);
  const arrivalDate = new Date();
  arrivalDate.setHours(hours, minutes, 0);
  
  // Add 10 min buffer
  const departureDate = new Date(arrivalDate.getTime() - (durationMinutes + 10) * 60000);
  
  return `${String(departureDate.getHours()).padStart(2, '0')}:${String(departureDate.getMinutes()).padStart(2, '0')}`;
}

/**
 * Convert address to coordinates using Nominatim (бесплатный)
 * https://nominatim.org - OpenStreetMap geocoding
 */
export async function geocodeAddress(address: string): Promise<{ data: GeocodingData | null; error: string | null }> {
  try {
    // Нормализуем запрос для лучшего поиска
    let searchQuery = address;
    
    // Если это похоже на название организации (детский сад, школа и т.д.)
    const orgPatterns = [
      /детский сад/i, /садик/i, /школа/i, /магазин/i, /поликлиника/i,
      /больница/i, /аптека/i, /банк/i, /ресторан/i, /кафе/i
    ];
    const isOrganization = orgPatterns.some(p => p.test(address));
    
    // Добавляем Санкт-Петербург если не указан город
    if (!/(санкт-петербург|спб|москва|мск)/i.test(address)) {
      searchQuery = address + ' Санкт-Петербург';
    }
    
    // Сначала пробуем Nominatim
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5&countrycodes=ru`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'GlazingCRM/1.0 (personal-assistant)'
      }
    });
    
    const data = await response.json();
    
    if (data.length > 0) {
      // Если это организация, ищем наиболее подходящий результат
      let result = data[0];
      if (isOrganization) {
        const betterMatch = data.find((r: any) => 
          r.class === 'amenity' || r.class === 'shop' || r.class === 'building'
        );
        if (betterMatch) result = betterMatch;
      }
      
      return {
        data: {
          lat: parseFloat(result.lat),
          lon: parseFloat(result.lon),
          formatted_address: result.display_name
        },
        error: null
      };
    }
    
    // Если не найдено и упоминается метро, ищем координаты метро
    const metroMatch = address.match(/метро\s+([а-яё]+(?:\s+[а-яё]+)?)/i);
    if (metroMatch) {
      const metroName = metroMatch[1];
      const metroUrl = `https://nominatim.openstreetmap.org/search?format=json&q=метро ${encodeURIComponent(metroName)} Санкт-Петербург&limit=1`;
      const metroResponse = await fetch(metroUrl, {
        headers: { 'User-Agent': 'GlazingCRM/1.0' }
      });
      const metroData = await metroResponse.json();
      
      if (metroData.length > 0) {
        return {
          data: {
            lat: parseFloat(metroData[0].lat),
            lon: parseFloat(metroData[0].lon),
            formatted_address: `Район метро ${metroName} (точный адрес не найден)`
          },
          error: null
        };
      }
    }
    
    return { 
      data: null, 
      error: 'Адрес не найден. Попробуй указать точный адрес улицы и дом.' 
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return { 
      data: null, 
      error: 'Ошибка геокодирования. Попробуй позже.' 
    };
  }
}
