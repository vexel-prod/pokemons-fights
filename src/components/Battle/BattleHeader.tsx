import type { ArenaWeather, Pokemon, StatusEffect } from '../../types/battle'
import { statusIcon } from '../../utils/statusEffects'
import { getItemName } from '../../utils/items'

interface BattleHeaderProps {
  champ: Pokemon | null
  challenger: Pokemon | null
  champHp: number
  challengerHp: number
  activeStatus: {
    champ: StatusEffect | null
    opp: StatusEffect | null
  }
  combo: {
    champ: number
    opp: number
  }
  rage: {
    champ: number
    opp: number
  }
  berserk: {
    champ: number
    opp: number
  }
  weather: ArenaWeather
  isMega: boolean
}

export function BattleHeader({
  champ,
  challenger,
  champHp,
  challengerHp,
  activeStatus,
  combo,
  rage,
  berserk,
  weather,
  isMega,
}: BattleHeaderProps) {
  const champMaxHp = champ?.stats?.hp ?? 1
  const oppMaxHp = challenger?.stats?.hp ?? 1

  const hpPct = (current: number, max: number): number => {
    const safeMax = Math.max(1, max)
    return Math.max(0, Math.min(100, Math.round((Math.max(0, current) / safeMax) * 100)))
  }

  return (
    <section className='battle-header-panel shadow-[0px_0px_18px_-2px_rgba(0,0,0,0.45)] rounded-2xl p-6 md:p-8 border border-zinc-300/40 relative'>
      <div className='flex flex-col gap-3 items-center'>
        <div className='flex justify-between w-full items-center gap-10'>
          <div className='w-full flex flex-col items-start justify-center'>
            <div className='flex items-center justify-start gap-2'>
              <div className='text-3xl font-extrabold tracking-widest'>
                {champ ? champ.name.toUpperCase() : '—'}
              </div>
              {activeStatus.champ && (
                <span
                  className='text-2xl animate-pulse'
                  title={activeStatus.champ.kind}
                >
                  {statusIcon(activeStatus.champ.kind)}
                </span>
              )}
              {isMega && (
                <span
                  className='text-2xl'
                  title='Мега-форма'
                >
                  🦖
                </span>
              )}
            </div>

            <div className='relative mt-2 h-6 w-full rounded-md bg-zinc-700/50 overflow-hidden hp-bar-track'>
              <div
                className='h-full bg-emerald-500/70 hp-bar-fill relative'
                style={{
                  width: `${champ ? hpPct(champHp, champMaxHp) : 0}%`,
                  transform: 'translateZ(0)',
                }}
              />
              <span className='absolute inset-0 flex items-center justify-center leading-none font-extrabold opacity-80'>
                {champ ? `${champHp} / ${champMaxHp}` : '—'}
              </span>
            </div>

            <div className='mt-2 flex items-center gap-2 flex-wrap justify-start w-full'>
              <span className='combo-chip'>🔥 COMBO: {combo.champ}</span>
              <span className='combo-chip'>
                ⚡ RAGE: {Math.min(100, rage.champ)}%
                {berserk.champ > 0 ? ` • BERSERK ${berserk.champ}` : ''}
              </span>
              {champ?.item && getItemName(champ.item) && (
                <div className='text-xl opacity-80'>{getItemName(champ.item)?.toUpperCase()}</div>
              )}
            </div>
          </div>

          <div className='relative flex items-center justify-center'>
            <span
              className='absolute inset-0 flex items-center justify-center text-9xl opacity-10'
            >{weather.icon}
            </span>
            <span className='font-extrabold text-5xl skeleton skeleton-text'>VS</span>
            <span className='absolute left-0 font-extrabold text-5xl skeleton skeleton-text text-yellow-400/70'>
              VS
            </span>
          </div>

          <div className='w-full flex flex-col items-end justify-center'>
            <div className='flex items-center justify-end gap-2'>
              <div className='text-3xl font-extrabold tracking-widest'>
                {challenger ? challenger.name.toUpperCase() : '—'}
              </div>
              {activeStatus.opp && (
                <span
                  className='text-2xl animate-pulse'
                  title={activeStatus.opp.kind}
                >
                  {statusIcon(activeStatus.opp.kind)}
                </span>
              )}
            </div>

            <div className='relative mt-2 h-6 w-full rounded-md bg-zinc-700/50 overflow-hidden hp-bar-track'>
              <div
                className='h-full bg-red-500/70 hp-bar-fill relative'
                style={{
                  width: `${challenger ? hpPct(challengerHp, oppMaxHp) : 0}%`,
                  transform: 'translateZ(0)',
                }}
              />
              <span className='absolute inset-0 flex items-center justify-center leading-none font-extrabold opacity-80'>
                {challenger ? `${challengerHp} / ${oppMaxHp}` : '—'}
              </span>
            </div>

            <div className='mt-2 flex items-center gap-2 flex-wrap justify-end w-full'>
              {challenger?.item && getItemName(challenger.item) && (
                <div className='text-xl opacity-80'>
                  {getItemName(challenger.item)?.toUpperCase()}
                </div>
              )}
              <span className='combo-chip'>🔥 COMBO: {combo.opp}</span>
              <span className='combo-chip'>
                ⚡ RAGE: {Math.min(100, rage.opp)}%
                {berserk.opp > 0 ? ` • BERSERK ${berserk.opp}` : ''}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
