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
  const handleMouseMove = (event: MouseEvent<HTMLDivElement>): void => {
    const target = event.currentTarget
    if (isDefeated) return

    const bounds = target.getBoundingClientRect()
    const x = event.clientX - bounds.left
    const y = event.clientY - bounds.top
    const rx = ((y / bounds.height - 0.5) * -14).toFixed(2)
    const ry = ((x / bounds.width - 0.5) * 16).toFixed(2)
    target.style.setProperty('--grid-rx', `${rx}deg`)
    target.style.setProperty('--grid-ry', `${ry}deg`)
  }

  const handleMouseLeave = (event: MouseEvent<HTMLDivElement>): void => {
    event.currentTarget.style.setProperty('--grid-rx', '0deg')
    event.currentTarget.style.setProperty('--grid-ry', '0deg')
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`${isDefeated ? 'overflow-hidden' : 'battle-card-3dgrid'} ${isHit ? 'battle-card-hit' : ''} ${auraClass} md:col-span-1 rounded-2xl relative h-123.25 battle-card-frame`}
    >
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
