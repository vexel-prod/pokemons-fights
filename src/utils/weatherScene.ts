import type { ArenaWeather, ArenaWeatherKind } from '../types/battle'

export const ARENA_WEATHERS: ArenaWeather[] = [
  { kind: 'CLEAR', name: 'Ясное небо', icon: '🌤️', description: 'Нейтральная арена без модификаторов' },
  { kind: 'SUN', name: 'Палящее солнце', icon: '☀️', description: 'Огонь усиливается, вода слабеет' },
  { kind: 'RAIN', name: 'Ливень', icon: '🌧️', description: 'Вода усиливается, огонь слабеет' },
  { kind: 'STORM', name: 'Грозовой фронт', icon: '⛈️', description: 'Стихийные всплески урона' },
  { kind: 'MIST', name: 'Мистический туман', icon: '🌫️', description: 'Спец-атаки усиливаются' },
]

export const pickWeather = (): ArenaWeather =>
  ARENA_WEATHERS[Math.floor(Math.random() * ARENA_WEATHERS.length)]

export const WEATHER_BG_IMAGE: Record<ArenaWeatherKind | 'NEUTRAL', string> = {
  NEUTRAL: '/weather/neutral.svg',
  CLEAR: '/weather/clear.svg',
  SUN: '/weather/sun.svg',
  RAIN: '/weather/rain.svg',
  STORM: '/weather/storm.svg',
  MIST: '/weather/mist.svg',
}
