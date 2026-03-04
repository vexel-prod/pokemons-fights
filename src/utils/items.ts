import type { Item } from '../types/battle'

export const ITEMS: Item[] = [
  { name: '🍊', chance: 0.2, effect: 'heal_30' },
  { name: '⚕️', chance: 0.15, effect: 'heal_turn' },
  { name: '🧘', chance: 0.1, effect: 'survive_1' },
  { name: '🗡️', chance: 0.15, effect: 'dmg_plus' },
  { name: '🥷', chance: 0.12, effect: 'atk_plus' },
  { name: '🪖', chance: 0.1, effect: 'reflect_dmg' },
  { name: 'none', chance: 0.18, effect: null },
]

export const getRandomItem = (): Item => {
  const random = Math.random()
  let cumulative = 0

  for (const item of ITEMS) {
    cumulative += item.chance
    if (random <= cumulative) return item
  }

  return ITEMS[ITEMS.length - 1]
}

export const getItemName = (item: Item | null | undefined): string | null => {
  if (!item || item.name === 'none') return null
  return item.name.replace(/-/g, ' ')
}
