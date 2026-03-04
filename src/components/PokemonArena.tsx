import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { BattleCard, BattleControls, BattleHeader, BattleLog } from './Battle'
import { useBattleEngine } from '../hooks/useBattleEngine'
import { useBattleLog } from '../hooks/useBattleLog'
import { usePokemon } from '../hooks/usePokemon'
import type { LogTone } from '../types/battle'
import { WEATHER_BG_IMAGE } from '../utils/weatherScene'
import { Button3D } from 'react-3d-button'
import 'react-3d-button/styles'

const toneClass = (tone: LogTone): string => {
  if (tone === 'header') return 'border-t-2 border-t-zinc-500/70 bg-zinc-900/20'
  if (tone === 'good') return 'bg-emerald-500/10 border-emerald-400/30'
  if (tone === 'bad') return 'bg-rose-500/10 border-rose-400/30'
  if (tone === 'meta') return 'bg-zinc-900/10 border-zinc-400/40'
  return 'bg-zinc-900/0 border-zinc-400/50'
}

export default function PokemonArena() {
  const { count, champ, challenger, setChamp, setChallenger } = usePokemon()
  const { page, totalPages, pageItems, setPage, appendLog, clearLog, logScrollRef } = useBattleLog(14)

  const [logMaxHeight, setLogMaxHeight] = useState<number | null>(null)
  const leftCardRef = useRef<HTMLDivElement | null>(null)

  const {
    champHp,
    challengerHp,
    isFighting,
    isLoading,
    needsOpponent,
    weather,
    impactSide,
    msLeft,
    canPrepare,
    canLoadOpponent,
    canFight,
    canUseAbility,
    playerAbilities,
    playerCooldowns,
    prepareBattle,
    loadOpponent,
    startBattle,
    triggerAbility,
  } = useBattleEngine({
    count,
    champ,
    challenger,
    setChamp,
    setChallenger,
    appendLog,
    clearLog,
  })

  useLayoutEffect(() => {
    const element = leftCardRef.current
    if (!element || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(entries => {
      const height = entries?.[0]?.contentRect?.height
      if (height && Number.isFinite(height)) setLogMaxHeight(Math.floor(height))
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!isFighting) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const idx = Number(event.key) - 1
      if (idx < 0 || idx > 3) return
      const ability = playerAbilities[idx]
      if (!ability) return
      event.preventDefault()
      void triggerAbility(ability.id)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFighting, playerAbilities, triggerAbility])

  const hasBoth = Boolean(champ && challenger)
  const loser = Boolean(challenger && challengerHp <= 0)
  const weatherAuraClass =
    weather.kind === 'SUN'
      ? 'arena-aura-sun'
      : weather.kind === 'RAIN'
        ? 'arena-aura-rain'
        : weather.kind === 'STORM'
          ? 'arena-aura-storm'
          : weather.kind === 'MIST'
            ? 'arena-aura-mist'
            : 'arena-aura-clear'

  const bgImage = isFighting ? WEATHER_BG_IMAGE[weather.kind] : WEATHER_BG_IMAGE.NEUTRAL
  const sceneStyle = useMemo(
    () =>
      ({
        ['--arena-bg-image' as string]: `url('${bgImage}')`,
      }) as CSSProperties,
    [bgImage],
  )

  const logPanelHeightStyle = logMaxHeight
    ? ({ maxHeight: `${logMaxHeight}px`, height: '100%' } as const)
    : ({ maxHeight: '500px' } as const)

  return (
    <div
      className={`arena-scene arena-weather-${weather.kind.toLowerCase()}`}
      style={sceneStyle}
    >
      <div
        className='arena-parallax'
        aria-hidden
      >
        <div className='arena-bg-image-layer' />
        <div className='arena-glow' />
        <div className='arena-grid' />
        <div className='arena-particles' />
      </div>

      <BattleHeader
        champ={champ}
        challenger={challenger}
        champHp={champHp}
        challengerHp={challengerHp}
        activeStatus={{ champ: null, opp: null }}
        combo={{ champ: 0, opp: 0 }}
        rage={{ champ: Math.round((msLeft / 2500) * 100), opp: 0 }}
        berserk={{ champ: 0, opp: 0 }}
        weather={weather}
        isMega={false}
      />

      <section className='grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 items-start relative z-10 mt-8 md:mt-10'>
        <BattleCard
          ref={leftCardRef}
          pokemon={champ}
          isHit={impactSide === 'champ'}
          auraClass={weatherAuraClass}
        />

        <div
          className='battle-console md:col-span-1 rounded-2xl border border-zinc-400/50 p-4 shadow-[0px_0px_13px_-4px_rgba(0,0,0,0.4)] flex flex-col'
          style={logPanelHeightStyle}
        >
          <div className='flex items-center justify-center p-2 mb-2 gap-2'>
            <div className='flex text-zinc-200 items-center justify-center gap-2 min-w-37.5 special-button-wrapper'>
              {!hasBoth ? (
                <Button3D
                  type='success'
                  onPress={() => void prepareBattle()}
                  disabled={!canPrepare}
                >
                  {isLoading ? 'LOADING...' : 'NEW GAME'}
                </Button3D>
              ) : (
                <>
                  {needsOpponent && (
                    <Button3D
                      type='warning'
                      onPress={() => void loadOpponent()}
                      disabled={!canLoadOpponent}
                    >
                      {isLoading ? 'LOADING...' : 'RESUME'}
                    </Button3D>
                  )}
                  {hasBoth && !needsOpponent && (
                    <Button3D
                      type='danger'
                      onPress={() => void startBattle()}
                      disabled={!canFight}
                    >
                      {isFighting ? 'FIGHTING...' : 'FIGHT!'}
                    </Button3D>
                  )}
                </>
              )}
            </div>
          </div>

          <BattleLog
            pageItems={pageItems}
            totalPages={totalPages}
            page={page}
            setPage={setPage}
            logScrollRef={logScrollRef}
            toneClass={toneClass}
            isFighting={isFighting}
          />

          {isFighting && (
            <BattleControls
              abilities={playerAbilities}
              cooldowns={playerCooldowns}
              canUseAbility={canUseAbility}
              msLeft={msLeft}
              windowMs={2500}
              onUseAbility={id => {
                void triggerAbility(id)
              }}
            />
          )}
        </div>

        <BattleCard
          pokemon={challenger}
          isDefeated={loser}
          isHit={impactSide === 'opp'}
          auraClass={weatherAuraClass}
        />
      </section>
    </div>
  )
}
