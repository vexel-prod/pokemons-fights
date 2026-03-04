import type { Pokemon } from '../types/battle'

export const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v))

export const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

export const delay = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

export const getTypes = (pokemon: Pokemon | null | undefined): string[] => {
  if (!Array.isArray(pokemon?.types)) return []

  return pokemon.types
    .map(type => {
      if (typeof type === 'string') return type
      if (type && typeof type === 'object' && 'type' in (type as Record<string, unknown>)) {
        const nested = (type as { type?: { name?: string } }).type?.name
        return typeof nested === 'string' ? nested : null
      }
      return null
    })
    .filter((value): value is string => Boolean(value))
}

export const hasType = (pokemon: Pokemon | null | undefined, typeName: string): boolean =>
  getTypes(pokemon).includes(typeName)

export const getAbilities = (pokemon: Pokemon | null | undefined): string[] => {
  if (!Array.isArray(pokemon?.abilities)) return []

  return pokemon.abilities
    .map(ability => {
      if (typeof ability === 'string') return ability
      if (ability && typeof ability === 'object' && 'ability' in (ability as Record<string, unknown>)) {
        const nested = (ability as { ability?: { name?: string } }).ability?.name
        return typeof nested === 'string' ? nested : null
      }
      return null
    })
    .filter((value): value is string => Boolean(value))
}

export const hasAbility = (pokemon: Pokemon | null | undefined, abilityName: string): boolean =>
  getAbilities(pokemon).includes(abilityName)

export const formatLine = (parts: Array<string | null | undefined>): string => parts.filter(Boolean).join('  ')

export const isBattleHeaderText = (text: string): boolean => text.includes('⚔️') && text.includes('БОЙ #')

export const randomNumber = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min
