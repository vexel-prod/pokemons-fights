export type BattleSide = 'champ' | 'opp'

export type ItemEffect =
  | 'heal_30'
  | 'heal_turn'
  | 'survive_1'
  | 'dmg_plus'
  | 'atk_plus'
  | 'reflect_dmg'
  | null

export interface Item {
  name: string
  chance: number
  effect: ItemEffect
}

export interface PokemonStats {
  hp?: number
  attack?: number
  defense?: number
  speed?: number
  'special-attack'?: number
  'special-defense'?: number
  [key: string]: number | undefined
}

export interface Pokemon {
  id: number
  name: string
  image: string
  types: string[]
  height: number
  weight: number
  baseExp: number
  stats: PokemonStats
  abilities: string[]
  item: Item
  speciesUrl?: string | null
  evolutionChainUrl?: string | null
  isGold?: boolean
  isLegendary?: boolean
  isMythical?: boolean
}

export type StatusKind = 'BURN' | 'POISON' | 'CURSE' | 'PARALYZE' | 'FREEZE'

export interface StatusEffect {
  kind: StatusKind
  turns: number
  dot: number
}

export interface BattleState {
  turn: number
  tempo: Record<BattleSide, number>
  combo: Record<BattleSide, number>
  shield: Record<BattleSide, number>
  status: Record<BattleSide, StatusEffect | null>
  sashUsed: boolean
  berryUsed: boolean
  counterActive: boolean
}

export type ArenaWeatherKind = 'CLEAR' | 'SUN' | 'RAIN' | 'STORM' | 'MIST'

export interface ArenaWeather {
  kind: ArenaWeatherKind
  name: string
  icon: string
  description: string
}

export interface DamageItemEffect {
  type: 'sash' | 'helmet'
  value: number
}

export interface DamageBase {
  usedSpecial: boolean
  attackType: string | null
  eff: number
  dmg: number
  crit: boolean
  extraHits: number
  healAttacker: number
  healDefender: number
  shieldGainAttacker: number
  shieldGainDefender: number
  statusApplied: StatusEffect | null
  itemEffect: DamageItemEffect | null
}

export interface MissDamageResult extends DamageBase {
  kind: 'MISS'
  attackerItem?: ItemEffect
}

export interface HitDamageResult extends DamageBase {
  kind: 'HIT'
  attackerItem?: ItemEffect
}

export type DamageResult = MissDamageResult | HitDamageResult

export type LogTone = 'default' | 'header' | 'good' | 'bad' | 'meta'

export interface LogEntry {
  id: string
  text: string
  tone: LogTone
}

export type CombatAbilityKind = 'damage' | 'shield' | 'heal' | 'focus'

export interface CombatAbility {
  id: string
  name: string
  description: string
  icon: string
  kind: CombatAbilityKind
  type: string | null
  power: number
  accuracy: number
  cooldown: number
  shieldValue?: number
  healRatio?: number
  focusBonus?: number
}

export type AbilityCooldownMap = Record<string, number>
