interface AbilityState {
  available: boolean
  cooldown: number
}

interface BattleControlsProps {
  activeAbilities: {
    shield: AbilityState
    heal: AbilityState
    counter: AbilityState
  }
  onShield: () => void
  onHeal: () => void
  onCounter: () => void
  canMega: boolean
  megaUsed: boolean
  onMega: () => void
  champHp: number
  champMaxHp: number
  pressedKey: string | null
}

export function BattleControls({
  activeAbilities,
  onShield,
  onHeal,
  onCounter,
  canMega,
  megaUsed,
  onMega,
  champHp,
  champMaxHp,
  pressedKey,
}: BattleControlsProps) {
  return (
    <div className='flex items-center gap-2 mb-3 p-2 bg-zinc-800/30 rounded-lg border border-zinc-400/30'>
      <button
        onClick={onShield}
        disabled={!activeAbilities.shield.available}
        className={`flex-1 px-2 py-2 text-xs font-bold rounded transition relative ${
          activeAbilities.shield.available
            ? 'bg-blue-500/70 hover:bg-blue-400/70 text-white'
            : 'bg-zinc-600/50 text-zinc-400 cursor-not-allowed'
        } ${pressedKey === 'shield' ? 'ring-2 ring-white scale-95' : ''}`}
        title='Щит: +8 защиты (клавиша 1 или Q)'
      >
        <span className='absolute -top-2 -left-1 bg-zinc-900 border border-zinc-500 rounded px-1 text-[10px] opacity-80'>
          1
        </span>
        🛡️ Щит
        {!activeAbilities.shield.available && ` (${activeAbilities.shield.cooldown})`}
      </button>

      <button
        onClick={onHeal}
        disabled={!activeAbilities.heal.available || champHp >= champMaxHp}
        className={`flex-1 px-2 py-2 text-xs font-bold rounded transition relative ${
          activeAbilities.heal.available && champHp < champMaxHp
            ? 'bg-emerald-500/70 hover:bg-emerald-400/70 text-white'
            : 'bg-zinc-600/50 text-zinc-400 cursor-not-allowed'
        } ${pressedKey === 'heal' ? 'ring-2 ring-white scale-95' : ''}`}
        title='Лечение: +25% HP (клавиша 2 или W)'
      >
        <span className='absolute -top-2 -left-1 bg-zinc-900 border border-zinc-500 rounded px-1 text-[10px] opacity-80'>
          2
        </span>
        🩹 Лечение
        {!activeAbilities.heal.available && ` (${activeAbilities.heal.cooldown})`}
      </button>

      <button
        onClick={onCounter}
        disabled={!activeAbilities.counter.available}
        className={`flex-1 px-2 py-2 text-xs font-bold rounded transition relative ${
          activeAbilities.counter.available
            ? 'bg-rose-500/70 hover:bg-rose-400/70 text-white'
            : 'bg-zinc-600/50 text-zinc-400 cursor-not-allowed'
        } ${pressedKey === 'counter' ? 'ring-2 ring-white scale-95' : ''}`}
        title='Контр-удар: отразить 50% урона (клавиша 3 или E)'
      >
        <span className='absolute -top-2 -left-1 bg-zinc-900 border border-zinc-500 rounded px-1 text-[10px] opacity-80'>
          3
        </span>
        ⚔️ Контр
        {!activeAbilities.counter.available && ` (${activeAbilities.counter.cooldown})`}
      </button>

      {canMega && !megaUsed && (
        <button
          onClick={onMega}
          className={`flex-1 px-2 py-2 text-xs font-bold rounded bg-purple-500/70 hover:bg-purple-400/70 text-white animate-pulse relative ${
            pressedKey === 'mega' ? 'ring-2 ring-white scale-95' : ''
          }`}
          title='Мега-эволюция: +30% HP (клавиша M или Space)'
        >
          <span className='absolute -top-2 -left-1 bg-zinc-900 border border-zinc-500 rounded px-1 text-[10px] opacity-80'>
            M
          </span>
          🦖 МЕГА
        </button>
      )}
    </div>
  )
}
