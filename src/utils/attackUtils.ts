import type { Pokemon } from '../types/battle'
import { getTypes } from './helpers'

export const pickAttackType = (attacker: Pokemon): string | null => {
  const types = getTypes(attacker)
  if (!types.length) return null

  return types.length === 1 ? types[0] : Math.random() < 0.72 ? types[0] : types[1]
}
