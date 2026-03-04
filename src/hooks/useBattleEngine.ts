import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { fetchPokemon, getRandomPokemonId } from '../api/poke'
import type {
  AbilityCooldownMap,
  ArenaWeather,
  BattleSide,
  CombatAbility,
  LogTone,
  Pokemon,
} from '../types/battle'
import { clamp, delay, getTypes } from '../utils/helpers'
import { abilityIsReady, buildLoreAbilities, pickOpponentAbility, reduceCooldowns } from '../utils/loreAbilities'
import { ARENA_WEATHERS, pickWeather } from '../utils/weatherScene'
import { typeEffectiveness } from '../utils/typeChart'

interface UseBattleEngineOptions {
  count: number | null
  champ: Pokemon | null
  challenger: Pokemon | null
  setChamp: Dispatch<SetStateAction<Pokemon | null>>
  setChallenger: Dispatch<SetStateAction<Pokemon | null>>
  appendLog: (text: string, tone?: LogTone) => void
  clearLog: () => void
}

interface AbilityChoice {
  ability: CombatAbility
  side: BattleSide
  timingBonus: number
}

interface RuntimeMeters {
  shield: Record<BattleSide, number>
  focus: Record<BattleSide, number>
  cooldowns: Record<BattleSide, AbilityCooldownMap>
  abilities: Record<BattleSide, CombatAbility[]>
}

interface UseBattleEngineResult {
  champHp: number
  challengerHp: number
  isFighting: boolean
  isLoading: boolean
  needsOpponent: boolean
  weather: ArenaWeather
  impactSide: BattleSide | null
  turn: number
  msLeft: number
  canPrepare: boolean
  canLoadOpponent: boolean
  canFight: boolean
  canUseAbility: boolean
  playerAbilities: CombatAbility[]
  playerCooldowns: AbilityCooldownMap
  prepareBattle: () => Promise<void>
  loadOpponent: () => Promise<void>
  startBattle: () => Promise<void>
  triggerAbility: (abilityId: string) => Promise<void>
}

const ACTION_WINDOW_MS = 2500

const toLine = (parts: Array<string | null | undefined>): string => parts.filter(Boolean).join('  ')

const timingMultiplier = (reactionMs: number): number => {
  if (reactionMs <= 700) return 1.25
  if (reactionMs <= 1400) return 1.12
  if (reactionMs <= ACTION_WINDOW_MS) return 1
  return 0.88
}

const weatherDamageMultiplier = (weather: ArenaWeather, attackType: string | null): number => {
  if (!attackType) return 1
  if (weather.kind === 'SUN') {
    if (attackType === 'fire') return 1.2
    if (attackType === 'water') return 0.85
  }
  if (weather.kind === 'RAIN') {
    if (attackType === 'water') return 1.2
    if (attackType === 'fire') return 0.85
  }
  return 1
}

export function useBattleEngine({
  count,
  champ,
  challenger,
  setChamp,
  setChallenger,
  appendLog,
  clearLog,
}: UseBattleEngineOptions): UseBattleEngineResult {
  const [champHp, setChampHp] = useState(0)
  const [challengerHp, setChallengerHp] = useState(0)
  const [isFighting, setIsFighting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [needsOpponent, setNeedsOpponent] = useState(false)
  const [weather, setWeather] = useState<ArenaWeather>(ARENA_WEATHERS[0])
  const [impactSide, setImpactSide] = useState<BattleSide | null>(null)
  const [turn, setTurn] = useState(0)
  const [msLeft, setMsLeft] = useState(0)
  const [playerAbilities, setPlayerAbilities] = useState<CombatAbility[]>([])
  const [playerCooldowns, setPlayerCooldowns] = useState<AbilityCooldownMap>({})

  const fightTokenRef = useRef(0)
  const waitingRef = useRef(false)
  const deadlineRef = useRef(0)
  const turnStartRef = useRef(0)
  const timeoutRef = useRef<number | null>(null)
  const hpRef = useRef({ champ: 0, opp: 0 })
  const runtimeRef = useRef<RuntimeMeters>({
    shield: { champ: 0, opp: 0 },
    focus: { champ: 0, opp: 0 },
    cooldowns: { champ: {}, opp: {} },
    abilities: { champ: [], opp: [] },
  })

  const hasBoth = Boolean(champ && challenger)
  const isIdle = !champ && !challenger

  const canPrepare = useMemo(
    () => Boolean(count) && !isLoading && !isFighting && isIdle,
    [count, isFighting, isIdle, isLoading],
  )
  const canLoadOpponent = useMemo(
    () => Boolean(count && champ) && !isLoading && !isFighting && needsOpponent,
    [count, champ, isFighting, isLoading, needsOpponent],
  )
  const canFight = useMemo(
    () => Boolean(count) && hasBoth && !isLoading && !isFighting && !needsOpponent,
    [count, hasBoth, isFighting, isLoading, needsOpponent],
  )
  const canUseAbility = waitingRef.current && isFighting

  const updateImpact = (side: BattleSide): void => {
    setImpactSide(side)
    window.setTimeout(() => {
      setImpactSide(prev => (prev === side ? null : prev))
    }, 250)
  }

  const getNewPokemon = useCallback(
    async (excludeId?: number): Promise<Pokemon> => {
      const max = count ?? 1010
      const id = getRandomPokemonId(max, excludeId)
      return fetchPokemon(id)
    },
    [count],
  )

  const clearTimers = (): void => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  useEffect(
    () => () => {
      clearTimers()
      waitingRef.current = false
      fightTokenRef.current += 1
    },
    [],
  )

  useEffect(() => {
    if (!isFighting) {
      setMsLeft(0)
      return
    }

    const interval = window.setInterval(() => {
      if (!waitingRef.current) {
        setMsLeft(0)
        return
      }

      const left = Math.max(0, deadlineRef.current - Date.now())
      setMsLeft(left)
    }, 80)

    return () => window.clearInterval(interval)
  }, [isFighting])

  const applyAbility = useCallback(
    (choice: AbilityChoice): { damage: number; defenderLeft: number } => {
      const attacker = choice.side === 'champ' ? champ : challenger
      const defender = choice.side === 'champ' ? challenger : champ
      if (!attacker || !defender) return { damage: 0, defenderLeft: 0 }

      const attackerMaxHp = attacker.stats?.hp ?? 1
      const defenderMaxHp = defender.stats?.hp ?? 1
      const attackerHp = choice.side === 'champ' ? hpRef.current.champ : hpRef.current.opp
      const defenderHp = choice.side === 'champ' ? hpRef.current.opp : hpRef.current.champ
      const defSide: BattleSide = choice.side === 'champ' ? 'opp' : 'champ'

      if (choice.ability.kind === 'shield') {
        const amount = choice.ability.shieldValue ?? 10
        runtimeRef.current.shield[choice.side] = runtimeRef.current.shield[choice.side] + amount
        appendLog(toLine(['🛡️', attacker.name.toUpperCase(), `поднимает барьер (+${amount}).`]), 'good')
        return { damage: 0, defenderLeft: defenderHp }
      }

      if (choice.ability.kind === 'heal') {
        const ratio = choice.ability.healRatio ?? 0.16
        const amount = clamp(Math.round(attackerMaxHp * ratio * choice.timingBonus), 6, 36)
        const next = Math.min(attackerMaxHp, attackerHp + amount)
        if (choice.side === 'champ') {
          hpRef.current.champ = next
          setChampHp(next)
        } else {
          hpRef.current.opp = next
          setChallengerHp(next)
        }
        appendLog(toLine(['💚', attacker.name.toUpperCase(), `восстанавливает ${amount} HP.`]), 'good')
        return { damage: 0, defenderLeft: defenderHp }
      }

      if (choice.ability.kind === 'focus') {
        const bonus = choice.ability.focusBonus ?? 0.16
        runtimeRef.current.focus[choice.side] = clamp(runtimeRef.current.focus[choice.side] + bonus, 0, 0.35)
        appendLog(
          toLine(['🎯', attacker.name.toUpperCase(), `концентрируется (+${Math.round(bonus * 100)}% к следующему удару).`]),
          'meta',
        )
        return { damage: 0, defenderLeft: defenderHp }
      }

      const atkStat = Math.max(attacker.stats?.attack ?? 1, attacker.stats?.['special-attack'] ?? 1)
      const defStat = Math.max(defender.stats?.defense ?? 1, defender.stats?.['special-defense'] ?? 1)
      const base = Math.round(((atkStat / Math.max(1, defStat)) * (choice.ability.power || 16)) / 2.3)
      const eff = typeEffectiveness(choice.ability.type, getTypes(defender))
      const stab = choice.ability.type && getTypes(attacker).includes(choice.ability.type) ? 1.2 : 1
      const focusBonus = 1 + runtimeRef.current.focus[choice.side]
      const weatherBonus = weatherDamageMultiplier(weather, choice.ability.type)
      const crit = Math.random() < clamp((attacker.stats?.speed ?? 0) / 620, 0.05, 0.24)
      const critMul = crit ? 1.45 : 1

      runtimeRef.current.focus[choice.side] = 0

      const landed = Math.random() <= choice.ability.accuracy
      if (!landed) {
        appendLog(toLine(['💨', attacker.name.toUpperCase(), `${choice.ability.name} промахивается.`]), 'bad')
        return { damage: 0, defenderLeft: defenderHp }
      }

      let dmg = Math.round(base * eff * stab * focusBonus * weatherBonus * choice.timingBonus * critMul)
      dmg = clamp(dmg, 2, 60)

      const shield = runtimeRef.current.shield[defSide]
      const absorbed = Math.min(shield, dmg)
      runtimeRef.current.shield[defSide] = Math.max(0, shield - absorbed)
      dmg -= absorbed

      const left = Math.max(0, defenderHp - dmg)
      if (defSide === 'opp') {
        hpRef.current.opp = left
        setChallengerHp(left)
      } else {
        hpRef.current.champ = left
        setChampHp(left)
      }

      const effTag =
        eff >= 2 ? 'суперэффективно' : eff <= 0.5 ? 'малоэффективно' : eff === 0 ? 'не действует' : null
      const critTag = crit ? 'КРИТ!' : null
      const shieldTag = absorbed > 0 ? `щит поглотил ${absorbed}` : null

      appendLog(
        toLine([
          choice.ability.icon,
          `${attacker.name.toUpperCase()} применяет ${choice.ability.name}: -${dmg} HP.`,
          effTag,
          critTag,
          shieldTag,
          `(${defender.name.toUpperCase()} ${left}/${defenderMaxHp})`,
        ]),
        left === 0 ? 'good' : 'default',
      )
      updateImpact(defSide)

      return { damage: dmg, defenderLeft: left }
    },
    [appendLog, champ, challenger, weather],
  )

  const finishBattle = useCallback(
    (token: number): void => {
      if (token !== fightTokenRef.current) return

      waitingRef.current = false
      clearTimers()
      setMsLeft(0)
      setIsFighting(false)
      setNeedsOpponent(true)

      const champAlive = hpRef.current.champ > 0
      const oppAlive = hpRef.current.opp > 0

      if (champAlive && !oppAlive) {
        appendLog(toLine(['🏆', 'Чемпион победил.', champ?.name?.toUpperCase()]), 'good')
      } else if (!champAlive && oppAlive) {
        appendLog(toLine(['👑', 'Новый чемпион:', challenger?.name?.toUpperCase()]), 'good')
        if (challenger && champ) {
          setChamp(challenger)
          setChampHp(challenger.stats?.hp ?? 1)
          setChallenger(champ)
          setChallengerHp(0)
        }
      } else {
        appendLog('🤝 Ничья.', 'meta')
      }

      appendLog('▶️ Нажмите «Следующий бой».', 'meta')
    },
    [appendLog, champ, challenger, setChamp, setChallenger],
  )

  const runTurn = useCallback(
    async (chosenAbilityId?: string): Promise<void> => {
      const token = fightTokenRef.current
      if (token <= 0 || !champ || !challenger) return

      waitingRef.current = false
      clearTimers()
      setMsLeft(0)

      const now = Date.now()
      const reactionMs = Math.max(0, now - turnStartRef.current)
      const playerTiming = timingMultiplier(reactionMs)

      const champAbilities = runtimeRef.current.abilities.champ
      const ability =
        champAbilities.find(item => item.id === chosenAbilityId) ??
        champAbilities.find(item => abilityIsReady(runtimeRef.current.cooldowns.champ, item.id)) ??
        champAbilities[0]

      if (!ability) return

      runtimeRef.current.cooldowns.champ[ability.id] = ability.cooldown
      setPlayerCooldowns({ ...runtimeRef.current.cooldowns.champ })

      if (!chosenAbilityId) {
        appendLog('⌛ Время вышло, срабатывает базовая атака.', 'bad')
      } else {
        appendLog(toLine(['🕹️', `Тайминг: ${reactionMs}мс`, `(бонус x${playerTiming.toFixed(2)})`]), 'meta')
      }

      applyAbility({ ability, side: 'champ', timingBonus: playerTiming })
      if (hpRef.current.opp <= 0) {
        finishBattle(token)
        return
      }

      await delay(360)
      if (token !== fightTokenRef.current || !champ || !challenger) return

      const oppAbilities = runtimeRef.current.abilities.opp
      const oppChoice = pickOpponentAbility(
        challenger,
        oppAbilities,
        runtimeRef.current.cooldowns.opp,
        hpRef.current.opp,
        challenger.stats?.hp ?? 1,
        getTypes(champ),
      )
      runtimeRef.current.cooldowns.opp[oppChoice.id] = oppChoice.cooldown
      applyAbility({ ability: oppChoice, side: 'opp', timingBonus: 1 })

      if (hpRef.current.champ <= 0) {
        finishBattle(token)
        return
      }

      runtimeRef.current.cooldowns.champ = reduceCooldowns(runtimeRef.current.cooldowns.champ)
      runtimeRef.current.cooldowns.opp = reduceCooldowns(runtimeRef.current.cooldowns.opp)
      setPlayerCooldowns({ ...runtimeRef.current.cooldowns.champ })

      setTurn(prev => prev + 1)
      appendLog(toLine(['🕒', `ХОД ${turn + 1}`]), 'meta')

      waitingRef.current = true
      turnStartRef.current = Date.now()
      deadlineRef.current = turnStartRef.current + ACTION_WINDOW_MS
      setMsLeft(ACTION_WINDOW_MS)
      timeoutRef.current = window.setTimeout(() => {
        void runTurn(undefined)
      }, ACTION_WINDOW_MS)
    },
    [appendLog, applyAbility, champ, challenger, finishBattle, turn],
  )

  const resetForNewFight = useCallback((): void => {
    fightTokenRef.current += 1
    waitingRef.current = false
    clearTimers()
    setTurn(0)
    setImpactSide(null)
    runtimeRef.current = {
      shield: { champ: 0, opp: 0 },
      focus: { champ: 0, opp: 0 },
      cooldowns: { champ: {}, opp: {} },
      abilities: { champ: [], opp: [] },
    }
    setPlayerCooldowns({})
    setPlayerAbilities([])
    setMsLeft(0)
  }, [])

  const prepareBattle = useCallback(async (): Promise<void> => {
    if (!canPrepare) return

    setIsLoading(true)
    clearLog()
    resetForNewFight()
    appendLog('⏳ Загрузка чемпиона и оппонента...', 'meta')

    try {
      const champion = await getNewPokemon()
      const opponent = await getNewPokemon(champion.id)
      setChamp(champion)
      setChallenger(opponent)
      setChampHp(champion.stats?.hp ?? 1)
      setChallengerHp(opponent.stats?.hp ?? 1)
      setNeedsOpponent(false)

      const localWeather = pickWeather()
      setWeather(localWeather)

      appendLog(toLine(['🏆 Чемпион:', champion.name.toUpperCase()]), 'good')
      appendLog(toLine(['🥊 Оппонент:', opponent.name.toUpperCase()]), 'default')
      appendLog(toLine(['🌦️ Арена:', localWeather.name]), 'meta')
      appendLog('▶️ Нажмите «Начать бой».', 'meta')
    } catch {
      appendLog('❌ Не удалось загрузить покемонов. Попробуйте снова.', 'bad')
      setChamp(null)
      setChallenger(null)
      setChampHp(0)
      setChallengerHp(0)
      setNeedsOpponent(false)
    } finally {
      setIsLoading(false)
    }
  }, [appendLog, canPrepare, clearLog, getNewPokemon, resetForNewFight, setChamp, setChallenger])

  const loadOpponent = useCallback(async (): Promise<void> => {
    if (!canLoadOpponent || !champ) return

    setIsLoading(true)
    resetForNewFight()
    appendLog('⏳ Загрузка нового оппонента...', 'meta')

    try {
      const opponent = await getNewPokemon(champ.id)
      setChallenger(opponent)
      setChallengerHp(opponent.stats?.hp ?? 1)
      setChampHp(champ.stats?.hp ?? 1)
      setNeedsOpponent(false)
      const localWeather = pickWeather()
      setWeather(localWeather)
      appendLog(toLine(['✅ Новый оппонент:', opponent.name.toUpperCase()]), 'good')
      appendLog(toLine(['🌦️ Арена:', localWeather.name]), 'meta')
      appendLog('▶️ Нажмите «Начать бой».', 'meta')
    } catch {
      appendLog('❌ Не удалось загрузить оппонента.', 'bad')
    } finally {
      setIsLoading(false)
    }
  }, [appendLog, canLoadOpponent, champ, getNewPokemon, resetForNewFight, setChallenger])

  const startBattle = useCallback(async (): Promise<void> => {
    if (!canFight || !champ || !challenger) return

    resetForNewFight()
    setIsFighting(true)
    setNeedsOpponent(false)
    setTurn(1)
    appendLog(toLine(['⚔️ БОЙ:', champ.name.toUpperCase(), 'vs', challenger.name.toUpperCase()]), 'header')

    const localWeather = pickWeather()
    setWeather(localWeather)
    appendLog(toLine(['🌦️ Условия арены:', localWeather.name, `(${localWeather.description})`]), 'meta')

    const champMax = champ.stats?.hp ?? 1
    const oppMax = challenger.stats?.hp ?? 1
    hpRef.current = { champ: champMax, opp: oppMax }
    setChampHp(champMax)
    setChallengerHp(oppMax)

    const champAbilities = buildLoreAbilities(champ)
    const oppAbilities = buildLoreAbilities(challenger)

    const champCooldowns: AbilityCooldownMap = {}
    champAbilities.forEach(item => {
      champCooldowns[item.id] = 0
    })
    const oppCooldowns: AbilityCooldownMap = {}
    oppAbilities.forEach(item => {
      oppCooldowns[item.id] = 0
    })

    runtimeRef.current = {
      shield: { champ: 0, opp: 0 },
      focus: { champ: 0, opp: 0 },
      cooldowns: { champ: champCooldowns, opp: oppCooldowns },
      abilities: { champ: champAbilities, opp: oppAbilities },
    }

    setPlayerAbilities(champAbilities)
    setPlayerCooldowns({ ...champCooldowns })

    waitingRef.current = true
    turnStartRef.current = Date.now()
    deadlineRef.current = turnStartRef.current + ACTION_WINDOW_MS
    setMsLeft(ACTION_WINDOW_MS)
    timeoutRef.current = window.setTimeout(() => {
      void runTurn(undefined)
    }, ACTION_WINDOW_MS)
    appendLog('🕒 ХОД 1', 'meta')
  }, [appendLog, canFight, champ, challenger, resetForNewFight, runTurn])

  const triggerAbility = useCallback(
    async (abilityId: string): Promise<void> => {
      if (!waitingRef.current || !isFighting) return
      if (!abilityIsReady(runtimeRef.current.cooldowns.champ, abilityId)) return
      await runTurn(abilityId)
    },
    [isFighting, runTurn],
  )

  return {
    champHp,
    challengerHp,
    isFighting,
    isLoading,
    needsOpponent,
    weather,
    impactSide,
    turn,
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
  }
}
