import type { BattleSide, BattleState, DamageResult, Pokemon, StatusEffect } from '../types/battle'
import { clamp, getTypes, hasAbility, hasType } from './helpers'
import { statusCanApply } from './statusEffects'
import { pickAttackType } from './attackUtils'
import { typeEffectiveness } from './typeChart'

export const applyShieldAbsorb = (
  damage: number,
  shieldValue: number,
): { dmgAfter: number; shieldAfter: number; absorbed: number } => {
  if (shieldValue <= 0) return { dmgAfter: damage, shieldAfter: 0, absorbed: 0 }

  const absorbed = Math.min(shieldValue, damage)
  return { dmgAfter: damage - absorbed, shieldAfter: shieldValue - absorbed, absorbed }
}

export const initBattleState = (): BattleState => ({
  turn: 0,
  tempo: { champ: 0, opp: 0 },
  shield: { champ: 0, opp: 0 },
  status: { champ: null, opp: null },
  sashUsed: false,
  berryUsed: false,
  counterActive: false,
})

export const calcDamage = (
  attacker: Pokemon,
  defender: Pokemon,
  battleState: BattleState,
  atkSide: BattleSide,
): DamageResult => {
  const attackerStats = attacker.stats ?? {}
  const defenderStats = defender.stats ?? {}

  const atk = attackerStats.attack ?? 0
  const def = defenderStats.defense ?? 0
  const spa = attackerStats['special-attack'] ?? 0
  const spd = defenderStats['special-defense'] ?? 0

  let attackerSpeed = attackerStats.speed ?? 0
  let defenderSpeed = defenderStats.speed ?? 0
  const defenderMaxHp = defenderStats.hp ?? 1
  const attackerWeight = attacker.weight ?? 100
  const defenderWeight = defender.weight ?? 100
  const attackerHeight = attacker.height ?? 10
  const defenderHeight = defender.height ?? 10

  const atkStatus = battleState.status[atkSide]
  const defSide: BattleSide = atkSide === 'champ' ? 'opp' : 'champ'
  const defStatus = battleState.status[defSide]

  if (atkStatus?.kind === 'PARALYZE') attackerSpeed = Math.floor(attackerSpeed * 0.6)
  if (defStatus?.kind === 'PARALYZE') defenderSpeed = Math.floor(defenderSpeed * 0.6)

  const useSpecial = spa >= atk
  let rawAttack = useSpecial ? spa : atk
  const rawDefense = useSpecial ? spd : def

  if (!useSpecial && atkStatus?.kind === 'BURN') rawAttack = Math.floor(rawAttack * 0.75)

  const attackType = pickAttackType(attacker)
  const defenderTypes = getTypes(defender)
  const effectiveness = typeEffectiveness(attackType, defenderTypes)
  const stab = attackType && getTypes(attacker).includes(attackType) ? 1.2 : 1

  const defenderEvasionBonus =
    (hasType(defender, 'flying') ? 0.03 : 0) +
    (hasType(defender, 'ghost') ? 0.02 : 0) +
    (hasType(defender, 'rock') ? -0.02 : 0) +
    (hasType(defender, 'steel') ? -0.02 : 0)

  const attackerAccuracyBonus =
    (hasType(attacker, 'psychic') ? 0.02 : 0) + (hasAbility(attacker, 'compound-eyes') ? 0.04 : 0)

  const accuracy =
    0.8 +
    attackerAccuracyBonus +
    clamp((attackerSpeed - defenderSpeed) / 240, -0.14, 0.18) +
    clamp((defenderWeight - attackerWeight) / 1500, -0.07, 0.07) +
    clamp((defenderHeight - attackerHeight) / 220, -0.05, 0.05)

  const evade =
    0.09 +
    defenderEvasionBonus +
    clamp((defenderSpeed - attackerSpeed) / 220, -0.05, 0.18) +
    clamp((attackerWeight - defenderWeight) / 1700, -0.06, 0.06) +
    clamp((attackerHeight - defenderHeight) / 240, -0.04, 0.04)

  const shieldPenalty = clamp((battleState.shield[defSide] ?? 0) * 0.01, 0, 0.06)
  const hitChance = clamp(accuracy - evade - shieldPenalty, 0.5, 0.95)

  if (Math.random() > hitChance) {
    return {
      kind: 'MISS',
      usedSpecial: useSpecial,
      attackType,
      eff: effectiveness,
      dmg: 0,
      crit: false,
      extraHits: 0,
      healAttacker: 0,
      healDefender: 0,
      shieldGainAttacker: 0,
      shieldGainDefender: 0,
      statusApplied: null,
      itemEffect: null,
    }
  }

  const speedAtkMul = 1 + clamp(attackerSpeed / 280, 0, 0.22)
  const speedDefMul = 1 - clamp(defenderSpeed / 340, 0, 0.2)
  const tankMul = 1 - clamp(defenderMaxHp / 260, 0, 0.2)
  const weightAtkMul = 1 + clamp((attackerWeight - 100) / 2400, -0.05, 0.12)
  const weightDefMul = 1 - clamp((defenderWeight - 120) / 2600, -0.06, 0.1)

  const ratio = (rawAttack * speedAtkMul * weightAtkMul) / Math.max(1, rawDefense)
  let damage = 6 + Math.floor(ratio * 10 * speedDefMul * tankMul * weightDefMul)
  damage = Math.round(damage * effectiveness * stab)

  const critChance = clamp(0.2 + attackerSpeed / 2000, 0.18, 0.32)
  const crit = Math.random() < critChance
  if (crit) damage = Math.round(damage * 1.5)

  const variance = 0.85 + Math.random() * 0.3
  damage = Math.round(damage * variance)

  let shieldGainAttacker = 0
  let shieldGainDefender = 0
  if (hasType(attacker, 'steel')) shieldGainAttacker += 1
  if (hasType(attacker, 'rock') && Math.random() < 0.55) shieldGainAttacker += 1
  if (hasAbility(attacker, 'battle-armor') || hasAbility(attacker, 'shell-armor')) shieldGainAttacker += 1

  if (hasType(defender, 'steel')) shieldGainDefender += 1
  if (hasType(defender, 'rock') && Math.random() < 0.55) shieldGainDefender += 1
  if (hasAbility(defender, 'battle-armor') || hasAbility(defender, 'shell-armor')) shieldGainDefender += 1

  let healAttacker = 0
  let healDefender = 0
  if (hasType(attacker, 'grass') || hasType(attacker, 'bug') || hasType(attacker, 'dark')) {
    if (Math.random() < 0.28) healAttacker += clamp(Math.floor(damage * 0.22), 1, 8)
  }

  const regenLike =
    hasAbility(defender, 'regenerator') ||
    hasAbility(defender, 'rain-dish') ||
    hasAbility(defender, 'ice-body') ||
    hasAbility(defender, 'dry-skin') ||
    hasAbility(defender, 'poison-heal') ||
    hasAbility(defender, 'shed-skin') ||
    hasAbility(defender, 'healer')

  if (regenLike && Math.random() < 0.35) {
    healDefender += clamp(Math.floor(defenderMaxHp * 0.08), 2, 12)
  }

  let statusApplied: StatusEffect | null = null
  const defenderHasStatus = Boolean(battleState.status[defSide])
  const baseStatusChance = 0.5
  const effBonus = effectiveness >= 2 ? 0.15 : effectiveness <= 0.5 ? -0.1 : 0
  const statusChance = clamp(baseStatusChance + effBonus, 0.45, 0.65)

  if (!defenderHasStatus && attackType && Math.random() < statusChance) {
    const options = statusCanApply(attackType)
    if (options.length) {
      const chosen = options[Math.floor(Math.random() * options.length)]
      const turns = 4 + Math.floor(Math.random() * 3)
      let dot = 0

      if (chosen === 'POISON') dot = clamp(Math.floor(defenderMaxHp * 0.12), 5, 18)
      if (chosen === 'BURN') dot = clamp(Math.floor(defenderMaxHp * 0.1), 4, 15)
      if (chosen === 'CURSE') dot = clamp(Math.floor(defenderMaxHp * 0.08), 3, 12)

      statusApplied = { kind: chosen, turns, dot }
    }
  }

  let extraHits = 0
  const tempoAdd = attackerSpeed >= 95 ? 2 : 1
  const tempoTypeBonus = hasType(attacker, 'fighting') || hasType(attacker, 'bug') ? 1 : 0
  const newTempo = (battleState.tempo[atkSide] ?? 0) + tempoAdd + tempoTypeBonus

  const threshold = 4 + Math.floor(Math.random() * 3)
  if (newTempo >= threshold && Math.random() < 0.65) {
    extraHits = 1 + (attackerSpeed >= 120 && Math.random() < 0.45 ? 1 : 0)
    battleState.tempo[atkSide] = 0
    damage = Math.round(damage * 0.78)
  } else {
    battleState.tempo[atkSide] = newTempo
  }

  const maxDamage = effectiveness >= 2 ? 20 : 16
  damage = clamp(damage, 2, maxDamage)

  let itemEffect: DamageResult['itemEffect'] = null
  const defenderItem = defender.item?.effect

  if (defenderItem === 'survive_1' && !battleState.sashUsed) {
    itemEffect = { type: 'sash', value: 1 }
  }

  if (defenderItem === 'reflect_dmg') {
    itemEffect = { type: 'helmet', value: clamp(Math.floor(damage * 0.25), 2, 6) }
  }

  const attackerItem = attacker.item?.effect
  if (attackerItem === 'dmg_plus') {
    damage = Math.round(damage * 1.2)
  }

  if (attackerItem === 'atk_plus') {
    damage = Math.round(damage * 1.3)
  }

  const maxDamageWithItems = effectiveness >= 2 ? 25 : 20
  damage = clamp(damage, 2, maxDamageWithItems)

  return {
    kind: 'HIT',
    usedSpecial: useSpecial,
    attackType,
    eff: effectiveness,
    dmg: damage,
    crit,
    extraHits,
    healAttacker,
    healDefender,
    shieldGainAttacker,
    shieldGainDefender,
    statusApplied,
    itemEffect,
    attackerItem,
  }
}
