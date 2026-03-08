import type { AbilityCooldownMap, CombatAbility, CombatZone, TacticsPool } from '../../types/battle'

interface BattleControlsProps {
  abilities: CombatAbility[]
  cooldowns: AbilityCooldownMap
  tactics: TacticsPool
  canUseAbility: boolean
  msLeft: number
  windowMs: number
  attackZone: CombatZone
  blockZone: CombatZone
  onSetAttackZone: (zone: CombatZone) => void
  onSetBlockZone: (zone: CombatZone) => void
  onUseAbility: (id: string) => void
}

export function BattleControls({
  abilities,
  cooldowns,
  tactics,
  canUseAbility,
  msLeft,
  windowMs,
  attackZone,
  blockZone,
  onSetAttackZone,
  onSetBlockZone,
  onUseAbility,
}: BattleControlsProps) {
  const progress = Math.round((Math.max(0, msLeft) / Math.max(2, windowMs)) * 100)
  const zones: CombatZone[] = ['high', 'mid', 'low']
  const zoneLabel: Record<CombatZone, string> = { high: 'HIGH', mid: 'MID', low: 'LOW' }
  const canPay = (ability: CombatAbility): boolean => {
    const cost = ability.tacticCost
    if (!cost) return true
    return (
      tactics.attack >= (cost.attack ?? 0) &&
      tactics.defense >= (cost.defense ?? 0) &&
      tactics.counter >= (cost.counter ?? 0) &&
      tactics.spirit >= (cost.spirit ?? 0)
    )
  }

  return (
    <div className='battle-controls mt-3 border border-zinc-300/25 rounded-xl p-3'>
      <div className='flex items-center justify-between gap-3 text-[11px] mb-3 text-zinc-200/80'>
        <span>Тайминг окна способности</span>
        <span className='font-bold tabular-nums'>{(msLeft / 1000).toFixed(2)}s</span>
      </div>
      <div className='ability-timer'>
        <div className='ability-timer-fill' style={{ width: `${progress}%` }} />
      </div>
      <div className='mt-3 grid grid-cols-2 gap-2 text-[10px] text-zinc-200/80'>
        <div className='rounded-lg border border-zinc-400/30 bg-zinc-900/20 p-2'>
          <div className='mb-1 tracking-wide text-zinc-300/70'>ATK ZONE</div>
          <div className='flex gap-1'>
            {zones.map(zone => (
              <button
                key={`atk-${zone}`}
                type='button'
                onClick={() => onSetAttackZone(zone)}
                className={`px-2 py-1 rounded border ${attackZone === zone ? 'border-cyan-300/70 bg-cyan-500/20 text-cyan-100' : 'border-zinc-500/50 bg-zinc-800/40'}`}
              >
                {zoneLabel[zone]}
              </button>
            ))}
          </div>
        </div>
        <div className='rounded-lg border border-zinc-400/30 bg-zinc-900/20 p-2'>
          <div className='mb-1 tracking-wide text-zinc-300/70'>BLOCK ZONE</div>
          <div className='flex gap-1'>
            {zones.map(zone => (
              <button
                key={`blk-${zone}`}
                type='button'
                onClick={() => onSetBlockZone(zone)}
                className={`px-2 py-1 rounded border ${blockZone === zone ? 'border-amber-300/70 bg-amber-500/20 text-amber-100' : 'border-zinc-500/50 bg-zinc-800/40'}`}
              >
                {zoneLabel[zone]}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className='mt-2 flex flex-wrap gap-2 text-[10px] text-zinc-200/90'>
        <span className='rounded-md border border-zinc-400/30 bg-zinc-900/30 px-2 py-1'>ATK {tactics.attack}</span>
        <span className='rounded-md border border-zinc-400/30 bg-zinc-900/30 px-2 py-1'>DEF {tactics.defense}</span>
        <span className='rounded-md border border-zinc-400/30 bg-zinc-900/30 px-2 py-1'>CTR {tactics.counter}</span>
        <span className='rounded-md border border-zinc-400/30 bg-zinc-900/30 px-2 py-1'>SPR {tactics.spirit}</span>
      </div>
      <div className='grid grid-cols-2 gap-2 mt-3'>
        {abilities.map((ability, index) => {
          const cooldown = cooldowns[ability.id] ?? 0
          const affordable = canPay(ability)
          const disabled = !canUseAbility || cooldown > 0 || !affordable
          return (
            <button
              key={`${ability.id}-${index}`}
              className='ability-btn'
              disabled={disabled}
              onClick={() => onUseAbility(ability.id)}
              title={
                affordable
                  ? ability.description
                  : `${ability.description} (нужно: ${JSON.stringify(ability.tacticCost ?? {})})`
              }
            >
              <span className='ability-btn__slot'>{index + 1}</span>
              <span className='ability-btn__label'>
                <span className='ability-btn__name'>
                  {ability.icon} {ability.name}
                </span>
                {cooldown > 0 ? (
                  <span className='ability-btn__meta'>CD {cooldown}</span>
                ) : affordable ? (
                  <span className='ability-btn__meta'>READY</span>
                ) : (
                  <span className='ability-btn__meta'>NO TACTIC</span>
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
