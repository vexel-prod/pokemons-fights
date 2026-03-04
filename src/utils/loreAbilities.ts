import type { AbilityCooldownMap, CombatAbility, Pokemon } from '../types/battle'
import { getTypes } from './helpers'
import { typeEffectiveness } from './typeChart'

const TYPE_STRIKES: Record<string, Omit<CombatAbility, 'id'>> = {
  fire: {
    name: 'Flame Burst',
    description: 'Сильный огненный удар.',
    icon: '🔥',
    kind: 'damage',
    type: 'fire',
    power: 20,
    accuracy: 0.9,
    cooldown: 1,
  },
  water: {
    name: 'Aqua Jet',
    description: 'Быстрый водный рывок.',
    icon: '💧',
    kind: 'damage',
    type: 'water',
    power: 18,
    accuracy: 0.93,
    cooldown: 1,
  },
  grass: {
    name: 'Leaf Blade',
    description: 'Режущий травяной удар.',
    icon: '🌿',
    kind: 'damage',
    type: 'grass',
    power: 19,
    accuracy: 0.92,
    cooldown: 1,
  },
  electric: {
    name: 'Thunder Shock',
    description: 'Электрический импульс.',
    icon: '⚡',
    kind: 'damage',
    type: 'electric',
    power: 19,
    accuracy: 0.9,
    cooldown: 1,
  },
  ice: {
    name: 'Frost Spear',
    description: 'Ледяной укол.',
    icon: '🧊',
    kind: 'damage',
    type: 'ice',
    power: 19,
    accuracy: 0.9,
    cooldown: 1,
  },
  fighting: {
    name: 'Close Combat',
    description: 'Мощный ближний бой.',
    icon: '🥊',
    kind: 'damage',
    type: 'fighting',
    power: 21,
    accuracy: 0.86,
    cooldown: 1,
  },
  psychic: {
    name: 'Psy Wave',
    description: 'Психический всплеск.',
    icon: '🔮',
    kind: 'damage',
    type: 'psychic',
    power: 20,
    accuracy: 0.9,
    cooldown: 1,
  },
  dragon: {
    name: 'Dragon Pulse',
    description: 'Драконий импульс.',
    icon: '🐉',
    kind: 'damage',
    type: 'dragon',
    power: 21,
    accuracy: 0.88,
    cooldown: 1,
  },
  ground: {
    name: 'Earth Break',
    description: 'Земляной разлом.',
    icon: '🌍',
    kind: 'damage',
    type: 'ground',
    power: 20,
    accuracy: 0.88,
    cooldown: 1,
  },
  rock: {
    name: 'Stone Edge',
    description: 'Каменный обвал.',
    icon: '🪨',
    kind: 'damage',
    type: 'rock',
    power: 20,
    accuracy: 0.86,
    cooldown: 1,
  },
  ghost: {
    name: 'Shadow Claw',
    description: 'Теневой коготь.',
    icon: '👻',
    kind: 'damage',
    type: 'ghost',
    power: 19,
    accuracy: 0.92,
    cooldown: 1,
  },
  dark: {
    name: 'Night Slash',
    description: 'Разрез тьмы.',
    icon: '🌘',
    kind: 'damage',
    type: 'dark',
    power: 19,
    accuracy: 0.91,
    cooldown: 1,
  },
  fairy: {
    name: 'Moon Blast',
    description: 'Лунный взрыв.',
    icon: '✨',
    kind: 'damage',
    type: 'fairy',
    power: 19,
    accuracy: 0.92,
    cooldown: 1,
  },
  steel: {
    name: 'Iron Head',
    description: 'Железный натиск.',
    icon: '🛡️',
    kind: 'damage',
    type: 'steel',
    power: 19,
    accuracy: 0.9,
    cooldown: 1,
  },
  poison: {
    name: 'Venom Fang',
    description: 'Ядовитый клык.',
    icon: '☠️',
    kind: 'damage',
    type: 'poison',
    power: 18,
    accuracy: 0.93,
    cooldown: 1,
  },
  flying: {
    name: 'Sky Strike',
    description: 'Пикирующий удар.',
    icon: '🪽',
    kind: 'damage',
    type: 'flying',
    power: 18,
    accuracy: 0.93,
    cooldown: 1,
  },
  bug: {
    name: 'X-Scissor',
    description: 'Серия рассечений.',
    icon: '🪲',
    kind: 'damage',
    type: 'bug',
    power: 18,
    accuracy: 0.93,
    cooldown: 1,
  },
  normal: {
    name: 'Body Slam',
    description: 'Силовой таран.',
    icon: '💥',
    kind: 'damage',
    type: 'normal',
    power: 17,
    accuracy: 0.95,
    cooldown: 1,
  },
}

const ABILITY_OVERRIDES: Record<string, Omit<CombatAbility, 'id'>> = {
  intimidate: {
    name: 'Intimidate',
    description: 'Снижает входящий урон на один ход.',
    icon: '🗿',
    kind: 'shield',
    type: null,
    power: 0,
    accuracy: 1,
    cooldown: 2,
    shieldValue: 12,
  },
  regenerator: {
    name: 'Regenerator',
    description: 'Восстанавливает часть HP.',
    icon: '🩹',
    kind: 'heal',
    type: null,
    power: 0,
    accuracy: 1,
    cooldown: 3,
    healRatio: 0.2,
  },
  levitate: {
    name: 'Levitate Guard',
    description: 'Воздушный барьер поглощает урон.',
    icon: '🛸',
    kind: 'shield',
    type: null,
    power: 0,
    accuracy: 1,
    cooldown: 2,
    shieldValue: 11,
  },
  swift_swim: {
    name: 'Swift Swim',
    description: 'Фокус на скорость и точность.',
    icon: '🌊',
    kind: 'focus',
    type: null,
    power: 0,
    accuracy: 1,
    cooldown: 2,
    focusBonus: 0.18,
  },
  blaze: {
    name: 'Blaze Focus',
    description: 'Усиливает следующий огненный удар.',
    icon: '🔥',
    kind: 'focus',
    type: 'fire',
    power: 0,
    accuracy: 1,
    cooldown: 2,
    focusBonus: 0.2,
  },
  torrent: {
    name: 'Torrent Focus',
    description: 'Усиливает следующий водный удар.',
    icon: '💧',
    kind: 'focus',
    type: 'water',
    power: 0,
    accuracy: 1,
    cooldown: 2,
    focusBonus: 0.2,
  },
  overgrow: {
    name: 'Overgrow Focus',
    description: 'Усиливает следующий травяной удар.',
    icon: '🌿',
    kind: 'focus',
    type: 'grass',
    power: 0,
    accuracy: 1,
    cooldown: 2,
    focusBonus: 0.2,
  },
}

const DEFAULT_SHIELD: CombatAbility = {
  id: 'shield-core',
  name: 'Barrier',
  description: 'Поглощает часть входящего урона.',
  icon: '🛡️',
  kind: 'shield',
  type: null,
  power: 0,
  accuracy: 1,
  cooldown: 2,
  shieldValue: 10,
}

const DEFAULT_HEAL: CombatAbility = {
  id: 'heal-core',
  name: 'Second Wind',
  description: 'Малое восстановление здоровья.',
  icon: '💚',
  kind: 'heal',
  type: null,
  power: 0,
  accuracy: 1,
  cooldown: 3,
  healRatio: 0.16,
}

const asAbilityId = (value: string): string => value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')

const fromOverride = (abilityName: string): CombatAbility | null => {
  const key = abilityName.trim().toLowerCase().replace(/-/g, '_')
  const found = ABILITY_OVERRIDES[key]
  if (!found) return null
  return { id: `ability-${asAbilityId(found.name)}`, ...found }
}

export const abilityIsReady = (cooldowns: AbilityCooldownMap, id: string): boolean => (cooldowns[id] ?? 0) <= 0

export const reduceCooldowns = (cooldowns: AbilityCooldownMap): AbilityCooldownMap => {
  const next: AbilityCooldownMap = {}
  Object.entries(cooldowns).forEach(([id, value]) => {
    next[id] = Math.max(0, value - 1)
  })
  return next
}

export const buildLoreAbilities = (pokemon: Pokemon): CombatAbility[] => {
  const types = getTypes(pokemon)
  const primaryType = types[0] ?? 'normal'
  const secondaryType = types[1] ?? types[0] ?? 'normal'

  const primaryStrike = TYPE_STRIKES[primaryType] ?? TYPE_STRIKES.normal
  const secondaryStrike = TYPE_STRIKES[secondaryType] ?? TYPE_STRIKES.normal

  const mappedByAbility = (pokemon.abilities ?? [])
    .map(fromOverride)
    .filter((entry): entry is CombatAbility => Boolean(entry))

  const fallbackFocus: CombatAbility = {
    id: 'focus-core',
    name: 'Battle Focus',
    description: 'Точный тайминг усилит следующий удар.',
    icon: '🎯',
    kind: 'focus',
    type: null,
    power: 0,
    accuracy: 1,
    cooldown: 2,
    focusBonus: 0.16,
  }

  const tactical = mappedByAbility.find(item => item.kind === 'focus') ?? fallbackFocus
  const sustain = mappedByAbility.find(item => item.kind === 'heal') ?? DEFAULT_HEAL
  const defense = mappedByAbility.find(item => item.kind === 'shield') ?? DEFAULT_SHIELD

  const secondStrikeId =
    secondaryType === primaryType ? `strike-${secondaryType}-alt` : `strike-${secondaryType}`

  const abilities: CombatAbility[] = [
    { ...primaryStrike, id: `strike-${primaryType}` },
    { ...secondaryStrike, id: secondStrikeId },
    { ...tactical, id: tactical.id || `tactical-${asAbilityId(tactical.name)}` },
    { ...defense, id: defense.id || `defense-${asAbilityId(defense.name)}` },
  ]

  const hasHeal = abilities.some(item => item.kind === 'heal')
  if (!hasHeal) {
    abilities[3] = { ...sustain, id: sustain.id || `sustain-${asAbilityId(sustain.name)}` }
  }

  const seen = new Map<string, number>()
  const normalized = abilities.slice(0, 4).map(item => {
    const hits = seen.get(item.id) ?? 0
    seen.set(item.id, hits + 1)
    if (hits === 0) return item
    return { ...item, id: `${item.id}-${hits + 1}` }
  })

  return normalized
}

export const pickOpponentAbility = (
  pokemon: Pokemon,
  abilities: CombatAbility[],
  cooldowns: AbilityCooldownMap,
  hp: number,
  maxHp: number,
  targetTypes: string[],
): CombatAbility => {
  const ready = abilities.filter(item => abilityIsReady(cooldowns, item.id))
  const pool = ready.length ? ready : abilities

  const heal = pool.find(item => item.kind === 'heal')
  if (heal && hp / Math.max(1, maxHp) < 0.35) return heal

  const shield = pool.find(item => item.kind === 'shield')
  if (shield && hp / Math.max(1, maxHp) < 0.55 && Math.random() < 0.45) return shield

  const focus = pool.find(item => item.kind === 'focus')
  if (focus && Math.random() < 0.22) return focus

  const sortedByTypeAdvantage = pool
    .filter(item => item.kind === 'damage')
    .sort((a, b) => {
      const aEff = typeEffectiveness(a.type, targetTypes) * (a.power || 1)
      const bEff = typeEffectiveness(b.type, targetTypes) * (b.power || 1)
      return bEff - aEff
    })

  if (sortedByTypeAdvantage.length) return sortedByTypeAdvantage[0]

  return pool[0] ?? buildLoreAbilities(pokemon)[0]
}
