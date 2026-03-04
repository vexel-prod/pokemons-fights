import { forwardRef, type MouseEvent } from 'react'
import type { Pokemon } from '../../types/battle'
import PokemonCard from '../PokemonCard'

interface BattleCardProps {
  pokemon: Pokemon | null
  isDefeated?: boolean
  isHit?: boolean
  auraClass?: string
}

export const BattleCard = forwardRef<HTMLDivElement, BattleCardProps>(function BattleCard(
  { pokemon, isDefeated = false, isHit = false, auraClass = '' },
  ref,
) {
  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (isDefeated) return
    const rect = event.currentTarget.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width
    const py = (event.clientY - rect.top) / rect.height
    const ry = (px - 0.5) * 22
    const rx = (0.5 - py) * 18
    event.currentTarget.style.setProperty('--card-rx', `${rx.toFixed(2)}deg`)
    event.currentTarget.style.setProperty('--card-ry', `${ry.toFixed(2)}deg`)
    event.currentTarget.style.setProperty('--card-mx', `${(px * 100).toFixed(1)}%`)
    event.currentTarget.style.setProperty('--card-my', `${(py * 100).toFixed(1)}%`)
  }

  const handleMouseLeave = (event: MouseEvent<HTMLDivElement>) => {
    event.currentTarget.style.setProperty('--card-rx', '0deg')
    event.currentTarget.style.setProperty('--card-ry', '0deg')
    event.currentTarget.style.setProperty('--card-mx', '50%')
    event.currentTarget.style.setProperty('--card-my', '30%')
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`${isDefeated ? 'overflow-hidden' : 'battle-card-tilt'} ${isHit ? 'battle-card-hit' : ''} ${auraClass} md:col-span-1 rounded-2xl relative h-123.25 battle-card-frame`}
    >
      <div className='battle-card-glare' aria-hidden />
      <PokemonCard pokemon={pokemon} />

      {isDefeated && (
        <div
          className='absolute inset-0 rounded-2xl pointer-events-none bg-center bg-cover bg-no-repeat animate-spriteIn backdrop-blur-[2px] animate-fadeIn'
          style={{ backgroundImage: "url('/sprite.svg')" }}
        >
          <div className='absolute inset-0 flex items-center bg-zinc-900/70 justify-center rounded-2xl'>
            <span className='rotate-[-11deg] text-6xl font-extrabold tracking-widest text-red-700 drop-shadow animate-bounce leading-none'>
              DEFEATED
            </span>
          </div>
        </div>
      )}
    </div>
  )
})
