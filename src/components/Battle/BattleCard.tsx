import { forwardRef } from 'react'
import type { Pokemon } from '../../types/battle'
import PokemonCard from '../PokemonCard'

interface BattleCardProps {
  pokemon: Pokemon | null
  isDefeated?: boolean
}

export const BattleCard = forwardRef<HTMLDivElement, BattleCardProps>(function BattleCard(
  { pokemon, isDefeated = false },
  ref,
) {
  return (
    <div
      ref={ref}
      className={`${isDefeated ? 'overflow-hidden' : 'hover-3d'} md:col-span-1 rounded-2xl relative h-123.25`}
    >
      <PokemonCard pokemon={pokemon} />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />
      <div />

      {isDefeated && (
        <div
          className='absolute inset-0 rounded-2xl pointer-events-none bg-center bg-cover bg-no-repeat animate-spriteIn backdrop-blur-[2px] animate-fadeIn'
          style={{ backgroundImage: "url('/sprite.svg')" }}
        >
          <div className='absolute inset-0 flex items-center bg-zinc-900/70 justify-center rounded-2xl'>
            <span className='rotate-[-11deg] text-5xl font-extrabold tracking-widest text-red-700 drop-shadow animate-pop leading-none'>
              DEFEATED
            </span>
          </div>
        </div>
      )}
    </div>
  )
})
