import type { StatusEffect, StatusKind } from '../types/battle'
import { pick } from './helpers'

export const STATUS_ICONS: Record<StatusKind, string> = {
  BURN: '🔥',
  POISON: '☠️',
  CURSE: '🕯️',
  PARALYZE: '⚡',
  FREEZE: '🧊',
}

export const STATUS_NAMES: Record<StatusKind, string> = {
  BURN: 'ОЖОГ',
  POISON: 'ЯД',
  CURSE: 'ПРОКЛЯТИЕ',
  PARALYZE: 'ПАРАЛИЧ',
  FREEZE: 'ЗАМОРОЗКА',
}

export const statusIcon = (kind: StatusKind): string => STATUS_ICONS[kind] ?? '✨'

export const statusName = (kind: StatusKind): string => STATUS_NAMES[kind] ?? 'ЭФФЕКТ'

export const statusCanApply = (attackerType: string): StatusKind[] => {
  const allStatuses: StatusKind[] = ['BURN', 'POISON', 'PARALYZE', 'FREEZE', 'CURSE']

  if (attackerType === 'fire') return ['BURN']
  if (attackerType === 'poison') return ['POISON']
  if (attackerType === 'electric') return ['PARALYZE']
  if (attackerType === 'ice') return ['FREEZE']
  if (attackerType === 'ghost') return ['CURSE']

  if (attackerType === 'grass' || attackerType === 'bug' || attackerType === 'dark') {
    return ['POISON', 'CURSE']
  }
  if (attackerType === 'water') return ['PARALYZE']
  if (attackerType === 'rock' || attackerType === 'ground') return ['CURSE']
  if (attackerType === 'psychic' || attackerType === 'dragon' || attackerType === 'fairy') {
    return ['PARALYZE', 'CURSE']
  }
  if (attackerType === 'fighting' || attackerType === 'flying' || attackerType === 'steel') {
    return ['BURN']
  }
  if (attackerType === 'normal' && Math.random() < 0.15) {
    return ['BURN', 'PARALYZE']
  }

  return [pick(allStatuses)]
}

export const tickStatus = (status: StatusEffect | null): StatusEffect | null => {
  if (!status) return null
  const nextTurns = (status.turns ?? 1) - 1
  return nextTurns <= 0 ? null : { ...status, turns: nextTurns }
}

export const trySkipTurnByStatus = (
  status: StatusEffect | null,
): { skip: boolean; reason: string | null } => {
  if (!status) return { skip: false, reason: null }

  if (status.kind === 'PARALYZE' && Math.random() < 0.35) {
    return { skip: true, reason: '⚡ паралич' }
  }

  if (status.kind === 'FREEZE' && Math.random() < 0.7) {
    return { skip: true, reason: '🧊 заморозка' }
  }

  return { skip: false, reason: null }
}
