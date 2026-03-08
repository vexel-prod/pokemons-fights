import type { AbilityCooldownMap, CombatAbility } from '../../types/battle'

interface BattleControlsProps {
  abilities: CombatAbility[]
  cooldowns: AbilityCooldownMap
  canUseAbility: boolean
  msLeft: number
  windowMs: number
  onUseAbility: (id: string) => void
}

export function BattleControls({
  abilities,
  cooldowns,
  canUseAbility,
  msLeft,
  windowMs,
  onUseAbility,
}: BattleControlsProps) {
  const progress = Math.round((Math.max(0, msLeft) / Math.max(1, windowMs)) * 100)

  return (
    <div className='battle-controls mt-3 border border-zinc-300/25 rounded-xl p-3'>
      <div className='flex items-center justify-between gap-3 text-[11px] mb-3 text-zinc-200/80'>
        <span>Тайминг окна способности</span>
        <span className='font-bold tabular-nums'>{(msLeft / 1000).toFixed(2)}s</span>
      </div>
      <div className='ability-timer'>
        <div className='ability-timer-fill' style={{ width: `${progress}%` }} />
      </div>
      <div className='grid grid-cols-2 gap-2 mt-3'>
        {abilities.map((ability, index) => {
          const cooldown = cooldowns[ability.id] ?? 0
          const disabled = !canUseAbility || cooldown > 0
          return (
            <button
              // key={`${ability.id}-${index}`}
              key={index}
              className='ability-btn'
              disabled={disabled}
              onClick={() => onUseAbility(ability.id)}
              title={ability.description}
            >
              <span className='ability-btn__slot'>{index + 1}</span>
              <span className='ability-btn__label'>
                <span className='ability-btn__name'>
                  {ability.icon} {ability.name}
                </span>
                {cooldown > 0 ? <span className='ability-btn__meta'>CD {cooldown}</span> : <span className='ability-btn__meta'>READY</span>}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
