import type { Pokemon } from '../types/battle'

interface StatBarProps {
  label: string
  value: number
  max?: number
  tone?: 'hp' | 'atk' | 'def' | 'spa' | 'spd' | 'spe' | 'neutral'
}

function StatBar({ label, value, max = 200, tone = 'neutral' }: StatBarProps) {
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
    <div className='grid grid-cols-[62px_1fr_44px] items-center'>
      <span className='text-[11px] font-bold opacity-80 tracking-wide'>{label}</span>

      <div className='h-3 rounded-full bg-base-200/60 overflow-hidden shadow-[0px_0px_13px_-4px_rgba(0,0,0,0.4)] border border-zinc-400/50'>
        <div
          className={`h-full ${bar} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <span className='text-[11px] font-extrabold tabular-nums text-right opacity-90'>{safeValue}</span>
    </div>
  )
}

interface PokemonCardProps {
  pokemon: Pokemon | null
}

export default function PokemonCard({ pokemon }: PokemonCardProps) {
  if (!pokemon) return null

  const typeBadge: Record<string, string> = {
    fire: 'badge-error',
    water: 'badge-info',
    grass: 'badge-success',
    electric: 'badge-electric',
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

  const typeBadgeIcon: Record<string, string> = {
    fire: '🔥',
    water: '💦',
    grass: '🌳',
    electric: '⚡️',
    psychic: '😵‍💫',
    ice: '🧊',
    dragon: '🐉',
    dark: '🌚',
    fairy: '🧚',
    fighting: '🥊',
    poison: '☠️',
    ground: '💩',
    flying: '🦅',
    bug: '🐛',
    rock: '🪨',
    ghost: '👻',
    steel: '⚔️',
    normal: '',
  }

  const uniquenessLabel = pokemon.isLegendary
    ? 'LEGENDARY'
    : pokemon.isMythical
      ? 'MYTHICAL'
      : 'GOLD'

  const rarityClass = pokemon.isLegendary
    ? 'pokemon-card-legendary'
    : pokemon.isMythical
      ? 'pokemon-card-mythical'
      : 'pokemon-card-standard'

  const statConfig = [
    { label: 'HP:', key: 'hp', tone: 'hp' },
    { label: 'ATK:', key: 'attack', tone: 'atk' },
    { label: 'DEF:', key: 'defense', tone: 'def' },
    { label: 'SP.ATK:', key: 'special-attack', tone: 'spa' },
    { label: 'SP.DEF:', key: 'special-defense', tone: 'spd' },
    { label: 'SPEED:', key: 'speed', tone: 'spe' },
  ] as const

  const totalStats = Object.values(pokemon.stats ?? {})
    .filter((value): value is number => typeof value === 'number')
    .reduce((sum, value) => sum + value, 0)

  return (
    <div
      className={`pokemon-card-3d h-123.25 overflow-hidden rounded-2xl p-4 ${rarityClass}`}
    >
      <div className='pokemon-card-noise' aria-hidden />
      <div className='pokemon-card-specular' aria-hidden />
      <div className='pokemon-card-rim' aria-hidden />

      <div className='pokemon-card-inner'>
        <div className='flex justify-between'>
          <div className='flex flex-col gap-2 relative'>
            <div className='flex gap-2 overflow-clip items-center'>
              <h2 className='max-w-35 text-xl font-black tracking-wide truncate drop-shadow leading-none text-zinc-100'>
                {pokemon.name.toUpperCase()}
              </h2>

              <span className='pokemon-id-pill'>#{String(pokemon.id).padStart(3, '0')}</span>
            </div>
            <div className='flex flex-col gap-1'>
              {(pokemon.types ?? []).map(type => (
                <span
                  key={type}
                  className={[
                    'border border-zinc-300/40 badge badge-sm font-extrabold tracking-wide',
                    typeBadge[type] ?? 'badge-primary',
                  ].join(' ')}
                >
                  {typeBadgeIcon[type]} {String(type).toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          <div className='flex flex-col gap-2'>
            {(pokemon.isLegendary || pokemon.isMythical) && (
              <div className='badge badge-sm bg-white/90 text-zinc-900 font-extrabold tracking-wide border border-zinc-300/60 shadow-sm'>
                <span className='skeleton skeleton-text'>{uniquenessLabel}</span>
              </div>
            )}
          </div>
        </div>

        <div className='flex flex-col items-center gap-2'>
          <div className='pokemon-sprite-wrap'>
            {pokemon.image ? (
              <img
                src={pokemon.image}
                alt={pokemon.name}
                className='pokemon-sprite-3d object-contain'
                loading='lazy'
              />
            ) : (
              <div className='text-xs opacity-60 p-4'>No image</div>
            )}
          </div>

          <div className='w-full pokemon-stats-panel'>
            <div className='flex justify-between text-[11px] font-black tracking-widest opacity-90 mb-2 text-zinc-100'>
              <div>
                POWER METER: <span>{totalStats}</span>
              </div>
              <div>
                BASE EXP: <span>{pokemon.baseExp}</span>
              </div>
            </div>

            <div className='grid gap-1'>
              {statConfig.map(stat => (
                <StatBar
                  key={stat.key}
                  label={stat.label}
                  value={pokemon.stats?.[stat.key] ?? 0}
                  max={200}
                  tone={stat.tone}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
