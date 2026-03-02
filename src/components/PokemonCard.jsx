function StatBar({ label, value, max = 200, tone = 'neutral' }) {
  const safeValue = Number.isFinite(value) ? value : 0
  const safeMax = Number.isFinite(max) && max > 0 ? max : 1
  const pct = Math.min(100, Math.round((safeValue / safeMax) * 100))

  const bar =
    {
      hp: 'bg-gradient-to-r from-emerald-400 via-lime-300 to-emerald-500',
      atk: 'bg-gradient-to-r from-red-500 via-orange-400 to-yellow-300',
      def: 'bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-300',
      spa: 'bg-gradient-to-r from-violet-500 via-fuchsia-400 to-pink-300',
      spd: 'bg-gradient-to-r from-indigo-500 via-blue-400 to-cyan-300',
      spe: 'bg-gradient-to-r from-amber-400 via-yellow-300 to-orange-400',
      neutral: 'bg-gradient-to-r from-primary via-secondary to-accent',
    }[tone] ?? 'bg-gradient-to-r from-primary via-secondary to-accent'

  return (
    <div className='grid grid-cols-[62px_1fr_44px] items-center gap-3'>
      <span className='text-[11px] font-bold opacity-80 tracking-wide'>{label}</span>

      <div className='h-3 rounded-full bg-base-200/60 border border-base-300/70 overflow-hidden shadow-inner'>
        <div
          className={`h-full ${bar} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <span className='text-[11px] font-extrabold tabular-nums text-right opacity-90'>
        {safeValue}
      </span>
    </div>
  )
}

export default function PokemonCard({ pokemon, isDefeated }) {
  if (!pokemon) return null

  const isGold = Boolean(pokemon.isGold)

  const typeBadge = {
    fire: 'badge-error',
    water: 'badge-info',
    grass: 'badge-success',
    electric: 'badge-warning',
    psychic: 'badge-secondary',
    ice: 'badge-info',
    dragon: 'badge-accent',
    dark: 'badge-neutral',
    fairy: 'badge-secondary',
    fighting: 'badge-error',
    poison: 'badge-secondary',
    ground: 'badge-warning',
    flying: 'badge-info',
    bug: 'badge-success',
    rock: 'badge-warning',
    ghost: 'badge-secondary',
    steel: 'badge-neutral',
    normal: 'badge-ghost',
  }

  const frameClass = isGold
    ? [
        'border-4 border-yellow-300/80',
        'bg-linear-to-br from-yellow-50/10 via-base-100/10 to-yellow-200/10',
        !isDefeated && 'hover:shadow-[0_30px_90px_-30px_rgba(255,215,0,0.6)]',
      ]
        .filter(Boolean)
        .join(' ')
    : [
        'border border-base-300/60',
        'bg-linear-to-br from-base-100/20 via-base-100/10 to-base-200/10',
        !isDefeated && 'hover:shadow-[0_30px_90px_-30px_rgba(0,0,0,0.25)]',
      ]
        .filter(Boolean)
        .join(' ')

  const headerClass = isGold
    ? 'bg-linear-to-r from-yellow-300/30 via-orange-300/20 to-pink-300/20 border-b border-yellow-200/30'
    : 'bg-linear-to-r from-base-200/30 via-base-100/10 to-base-200/20 border-b border-base-300/40'

  const goldLabel = pokemon.isLegendary ? 'LEGENDARY' : pokemon.isMythical ? 'MYTHICAL' : 'GOLD'

  return (
    <div className='hover-3d w-full max-w-5xl relative rounded-2xl'>
      <div
        className={[
          'rounded-2xl overflow-hidden shadow-2xl transition-all duration-500',
          frameClass,
          isDefeated ? 'grayscale opacity-60 scale-[0.98]' : '',
        ].join(' ')}
      >
        <div className={['relative p-4', headerClass].join(' ')}>
          <div className='flex items-start justify-between gap-3'>
            <div className='min-w-0'>
              <div className='flex items-center gap-2'>
                <h2 className='text-xl font-black tracking-wide truncate drop-shadow'>
                  {pokemon.name.toUpperCase()}
                </h2>
                <span className='text-xs font-bold opacity-70'>
                  #{String(pokemon.id).padStart(3, '0')}
                </span>

                {isGold && (
                  <span className='ml-1 badge badge-sm font-black tracking-widest bg-yellow-300/30 border border-yellow-200/40'>
                    {goldLabel}
                  </span>
                )}
              </div>

              <div className='mt-2 flex flex-wrap gap-2'>
                {(pokemon.types ?? []).map(t => (
                  <span
                    key={t}
                    className={[
                      'badge badge-sm font-extrabold tracking-wide',
                      typeBadge[t] ?? 'badge-primary',
                      'border border-base-300/60',
                    ].join(' ')}
                  >
                    {String(t).toUpperCase()}
                  </span>
                ))}
              </div>
            </div>

            <div className='shrink-0 text-right'>
              <div className='flex gap-2 items-center px-3 py-2 rounded-2xl bg-base-100/40 border border-zinc-400/50'>
                <div className='text-[10px] font-bold opacity-70 tracking-widest'>BASE EXP</div>
                <div className='text-lg font-black leading-none'>{pokemon.baseExp}</div>
              </div>
            </div>
          </div>
        </div>

        <div className='p-4 flex flex-col gap-4'>
          <div className='rounded-2xl shadow-2xl border border-zinc-400/50'>
            {pokemon.image ? (
              <img
                src={pokemon.image}
                alt={pokemon.name}
                className='w-full h-full object-contain'
                loading='lazy'
              />
            ) : (
              <div className='text-xs opacity-60 p-4'>No image</div>
            )}
          </div>

          <div className='rounded-2xl shadow-2xl p-4 text-zinc-300 border border-zinc-400/50'>
            <div className='text-[11px] font-black tracking-widest opacity-80 mb-2'>
              POWER METER
            </div>

            <div className='grid gap-2'>
              <StatBar
                label='HP'
                value={pokemon.stats?.hp ?? 0}
                max={200}
                tone='hp'
              />
              <StatBar
                label='ATK'
                value={pokemon.stats?.attack ?? 0}
                max={200}
                tone='atk'
              />
              <StatBar
                label='DEF'
                value={pokemon.stats?.defense ?? 0}
                max={200}
                tone='def'
              />
              <StatBar
                label='SP.ATK'
                value={pokemon.stats?.['special-attack'] ?? 0}
                max={200}
                tone='spa'
              />
              <StatBar
                label='SP.DEF'
                value={pokemon.stats?.['special-defense'] ?? 0}
                max={200}
                tone='spd'
              />
              <StatBar
                label='SPEED'
                value={pokemon.stats?.speed ?? 0}
                max={200}
                tone='spe'
              />
            </div>
          </div>
        </div>
      </div>

      {isDefeated && (
        <div className='absolute inset-0 pointer-events-none'>
          <div className='absolute inset-0 bg-black/60 backdrop-blur-[2px] animate-fadeIn' />

          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='w-[200%] h-0.5 bg-red-600/30 rotate-[-25deg] animate-slash' />
          </div>
          <div className='absolute inset-0 flex items-center justify-center'>
            <div className='w-[200%] h-0.5 bg-red-600/30 rotate-75 animate-slash' />
          </div>

          <div className='absolute inset-0 flex items-center justify-center'>
            <span className='text-3xl font-black tracking-widest text-red-400 drop-shadow animate-pop'>
              DEFEATED
            </span>
          </div>
        </div>
      )}
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
    </div>
  )
}
