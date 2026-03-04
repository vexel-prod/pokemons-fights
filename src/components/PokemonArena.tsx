import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { BattleCard, BattleControls, BattleHeader, BattleLog } from './Battle'
import { useKeyboard } from '../hooks/useKeyboard'
import { useBattleLog } from '../hooks/useBattleLog'
import { usePokemon } from '../hooks/usePokemon'
import { clamp, delay } from '../utils/helpers'
import { statusIcon, statusName, tickStatus, trySkipTurnByStatus } from '../utils/statusEffects'
import { applyShieldAbsorb, calcDamage, initBattleState } from '../utils/battleCalc'
import { fetchPokemon, getRandomPokemonId } from '../api/poke'
import type { BattleSide, BattleState, Item, LogTone, Pokemon, StatusEffect } from '../types/battle'

interface ActiveAbilities {
  shield: { available: boolean; cooldown: number }
  heal: { available: boolean; cooldown: number }
  counter: { available: boolean; cooldown: number }
}

const makeDefaultAbilities = (): ActiveAbilities => ({
  shield: { available: true, cooldown: 0 },
  heal: { available: true, cooldown: 0 },
  counter: { available: true, cooldown: 0 },
})

const formatLine = (parts: Array<string | null | undefined>): string => parts.filter(Boolean).join('  ')

export default function PokemonArena() {
  const { count, champ, challenger, setChamp, setChallenger } = usePokemon()
  const { page, totalPages, pageItems, setPage, appendLog, clearLog, logScrollRef } = useBattleLog()

  const [champHp, setChampHp] = useState(0)
  const [challengerHp, setChallengerHp] = useState(0)
  const [isFighting, setIsFighting] = useState(false)
  const [needsOpponent, setNeedsOpponent] = useState(false)
  const [activeStatus, setActiveStatus] = useState<{ champ: StatusEffect | null; opp: StatusEffect | null }>(
    {
      champ: null,
      opp: null,
    },
  )
  const [pressedKey, setPressedKey] = useState<string | null>(null)
  const [activeAbilities, setActiveAbilities] = useState<ActiveAbilities>(makeDefaultAbilities)
  const [canMega, setCanMega] = useState(false)
  const [megaUsed, setMegaUsed] = useState(false)
  const [isMega, setIsMega] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [logMaxHeight, setLogMaxHeight] = useState<number | null>(null)

  const battleStateRef = useRef<BattleState>(initBattleState())
  const fightTokenRef = useRef(0)
  const fightNoRef = useRef(0)
  const leftCardRef = useRef<HTMLDivElement | null>(null)

  const champMaxHp = champ?.stats?.hp ?? 0

  useLayoutEffect(() => {
    const element = leftCardRef.current
    if (!element || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(entries => {
      const height = entries?.[0]?.contentRect?.height
      if (height && Number.isFinite(height)) {
        setLogMaxHeight(Math.floor(height))
      }
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const hasBoth = Boolean(champ && challenger)
  const isIdle = !champ && !challenger

  const canPrepare = useMemo(
    () => Boolean(count) && !isLoading && !isFighting && isIdle,
    [count, isLoading, isFighting, isIdle],
  )

  const canLoadOpponent = useMemo(
    () => Boolean(champ && count) && !isLoading && !isFighting && needsOpponent,
    [champ, count, isLoading, isFighting, needsOpponent],
  )

  const canFight = useMemo(
    () => hasBoth && Boolean(count) && !isLoading && !isFighting && !needsOpponent,
    [hasBoth, count, isLoading, isFighting, needsOpponent],
  )

  const getNewPokemon = useCallback(
    async (excludeId?: number): Promise<Pokemon> => {
      const max = count ?? 1010
      const id = getRandomPokemonId(max, excludeId)
      return fetchPokemon(id)
    },
    [count],
  )

  const resetSession = useCallback(() => {
    clearLog()
    setActiveStatus({ champ: null, opp: null })
    setActiveAbilities(makeDefaultAbilities())
    setCanMega(false)
    setIsMega(false)
    setMegaUsed(false)
    fightNoRef.current = 0
    battleStateRef.current = initBattleState()
  }, [clearLog])

  const getStatusLine = (side: BattleSide): string | null => {
    const state = battleStateRef.current.status[side]
    if (!state) return null
    return `${statusIcon(state.kind)} ${statusName(state.kind)} (${state.turns})`
  }

  const handleActivateAbility = useCallback(
    (type: keyof ActiveAbilities) => {
      if (!isFighting || !activeAbilities[type].available) return

      if (type === 'shield') {
        battleStateRef.current.shield.champ += 8
        setActiveAbilities(prev => ({ ...prev, shield: { available: false, cooldown: 3 } }))
        appendLog(formatLine(['🛡️', 'ЩИТ АКТИВИРОВАН! +8 защиты']), 'good')
      }

      if (type === 'heal') {
        const heal = clamp(Math.floor(champMaxHp * 0.25), 10, 30)
        setChampHp(prev => Math.min(champMaxHp, prev + heal))
        setActiveAbilities(prev => ({ ...prev, heal: { available: false, cooldown: 4 } }))
        appendLog(formatLine(['🩹', `ЛЕЧЕНИЕ! +${heal} HP`]), 'good')
      }

      if (type === 'counter') {
        battleStateRef.current.counterActive = true
        setActiveAbilities(prev => ({ ...prev, counter: { available: false, cooldown: 5 } }))
        appendLog(formatLine(['⚔️', 'КОНТР-УДАР готов! Следующая атака отразится']), 'good')
      }
    },
    [activeAbilities, appendLog, champMaxHp, isFighting],
  )

  const handleMega = useCallback(() => {
    if (!canMega || megaUsed) return

    setIsMega(true)
    setMegaUsed(true)

    const boost = clamp(Math.floor(champMaxHp * 0.3), 15, 40)
    setChampHp(prev => Math.min(champMaxHp + boost, prev + boost))
    appendLog(formatLine(['🦖', 'МЕГА-ЭВОЛЮЦИЯ! +30% HP и урона']), 'good')
  }, [appendLog, canMega, champMaxHp, megaUsed])

  const decreaseCooldowns = useCallback(() => {
    setActiveAbilities(prev => ({
      shield: {
        available: prev.shield.cooldown <= 1,
        cooldown: Math.max(0, prev.shield.cooldown - 1),
      },
      heal: {
        available: prev.heal.cooldown <= 1,
        cooldown: Math.max(0, prev.heal.cooldown - 1),
      },
      counter: {
        available: prev.counter.cooldown <= 1,
        cooldown: Math.max(0, prev.counter.cooldown - 1),
      },
    }))
  }, [])

  useKeyboard({
    isFighting,
    onShield: () => handleActivateAbility('shield'),
    onHeal: () => handleActivateAbility('heal'),
    onCounter: () => handleActivateAbility('counter'),
    onMega: handleMega,
    canMega,
    megaUsed,
    setPressedKey,
  })

  const prepareBattleHandler = async () => {
    if (!canPrepare) return

    setIsLoading(true)
    resetSession()
    appendLog(formatLine(['⏳', 'Загрузка чемпиона и оппонента...']), 'meta')

    try {
      const champion = await getNewPokemon()
      const opponent = await getNewPokemon(champion.id)

      setChamp(champion)
      setChampHp(champion.stats?.hp ?? 1)
      setChallenger(opponent)
      setChallengerHp(opponent.stats?.hp ?? 1)
      setNeedsOpponent(false)

      const canMegaEvolve = Math.random() < 0.4
      setCanMega(canMegaEvolve)
      if (canMegaEvolve) {
        appendLog(formatLine(['🦖', `${champion.name.toUpperCase()} может мега-эволюционировать!`]), 'good')
      }

      appendLog(formatLine(['✅', 'Подготовка завершена.']), 'good')
      appendLog(formatLine(['🏆', 'Чемпион:', champion.name.toUpperCase()]))
      if (champion.item?.name && champion.item.name !== 'none') {
        appendLog(formatLine(['🎒', `Предмет: ${champion.item.name.replace(/-/g, ' ')}`]), 'meta')
      }
      appendLog(formatLine(['🥊', 'Оппонент:', opponent.name.toUpperCase()]))
      if (opponent.item?.name && opponent.item.name !== 'none') {
        appendLog(formatLine(['🎒', `Предмет: ${opponent.item.name.replace(/-/g, ' ')}`]), 'meta')
      }
      appendLog(formatLine(['▶️', 'Нажмите «Начать бой».']), 'meta')
    } catch {
      appendLog(formatLine(['❌', 'Не удалось загрузить покемонов. Попробуйте ещё раз.']), 'bad')
      setChamp(null)
      setChallenger(null)
      setChampHp(0)
      setChallengerHp(0)
      setNeedsOpponent(false)
    } finally {
      setIsLoading(false)
    }
  }

  const loadOpponentHandler = async () => {
    if (!canLoadOpponent || !champ) return

    setIsLoading(true)
    appendLog(formatLine(['⏳', 'Загрузка нового оппонента...']), 'meta')

    try {
      const opponent = await getNewPokemon(champ.id)
      setChallenger(opponent)
      setChallengerHp(opponent.stats?.hp ?? 1)
      setNeedsOpponent(false)
      setChampHp(champ?.stats?.hp ?? 1)
      battleStateRef.current = initBattleState()
      setActiveStatus({ champ: null, opp: null })
      setCanMega(false)
      setIsMega(false)
      setMegaUsed(false)

      appendLog(formatLine(['✅', 'Новый оппонент:', opponent.name.toUpperCase()]), 'good')
      if (opponent.item?.name && opponent.item.name !== 'none') {
        appendLog(formatLine(['🎒', `Предмет: ${opponent.item.name.replace(/-/g, ' ')}`]), 'meta')
      }
      appendLog(formatLine(['▶️', 'Нажмите «Начать бой».']), 'meta')
    } catch {
      appendLog(formatLine(['❌', 'Не удалось загрузить оппонента. Попробуйте ещё раз.']), 'bad')
    } finally {
      setIsLoading(false)
    }
  }

  const fight = async () => {
    if (!canFight || !champ || !challenger) return

    setIsFighting(true)
    fightNoRef.current += 1
    fightTokenRef.current += 1
    const token = fightTokenRef.current

    battleStateRef.current = initBattleState()
    setActiveStatus({ champ: null, opp: null })
    setActiveAbilities(makeDefaultAbilities())
    setMegaUsed(false)
    setIsMega(false)

    const localChamp = champ
    const localOpp = challenger

    let cHp = localChamp.stats?.hp ?? 1
    let oHp = localOpp.stats?.hp ?? 1
    setChampHp(cHp)
    setChallengerHp(oHp)

    const applyEndOfTurn = (
      side: BattleSide,
      hp: number,
      maxHp: number,
      setHp: React.Dispatch<React.SetStateAction<number>>,
      whoNameUpper: string,
      item: Item,
    ): number => {
      const status = battleStateRef.current.status[side]
      if (!status) return hp

      if (status.dot && status.dot > 0) {
        const next = Math.max(0, hp - status.dot)
        if (next !== hp) {
          setHp(next)
          appendLog(
            formatLine([
              statusIcon(status.kind),
              `☠️ ${statusName(status.kind)} тикает! ${whoNameUpper} теряет ${status.dot} HP!`,
              `(осталось ${next} HP)`,
            ]),
            'bad',
          )
          hp = next
        }
      }

      if ((status.kind === 'PARALYZE' || status.kind === 'FREEZE') && Math.random() < 0.18) {
        battleStateRef.current.status[side] = null
        setActiveStatus(prev => ({ ...prev, [side]: null }))
        appendLog(formatLine(['✨', `${whoNameUpper} ИЗБАВИЛСЯ от ${statusName(status.kind).toLowerCase()}!`]), 'good')
        return hp
      }

      const updatedStatus = tickStatus(status)
      if (!updatedStatus) {
        battleStateRef.current.status[side] = null
        setActiveStatus(prev => ({ ...prev, [side]: null }))
        appendLog(
          formatLine(['✨', `${whoNameUpper} больше не под эффектом ${statusName(status.kind).toLowerCase()}.`]),
          'meta',
        )
      } else {
        battleStateRef.current.status[side] = updatedStatus
        setActiveStatus(prev => ({ ...prev, [side]: updatedStatus }))
      }

      if (item?.effect === 'heal_turn') {
        const heal = clamp(Math.floor(maxHp * 0.05), 2, 6)
        const next = Math.min(maxHp, hp + heal)
        if (next !== hp) {
          setHp(next)
          appendLog(formatLine(['🟢', `${whoNameUpper} лечится от Leftovers: +${heal} HP`]), 'good')
          hp = next
        }
      }

      if (Math.random() < 0.1) {
        const heal = clamp(Math.floor(maxHp * 0.04), 1, 8)
        const next = Math.min(maxHp, hp + heal)
        if (next !== hp) {
          setHp(next)
          appendLog(formatLine(['🩹', `${whoNameUpper} немного восстанавливается: +${heal} HP.`]), 'good')
          hp = next
        }
      }

      return hp
    }

    const doSingleHit = async (
      attacker: Pokemon,
      defender: Pokemon,
      atkSide: BattleSide,
      defSide: BattleSide,
      getDefHp: () => number,
      setDefHp: (value: number) => void,
      getAtkHp: () => number,
      setAtkHp: (value: number) => void,
    ): Promise<{ defHp: number; atkHp: number; stopped: boolean }> => {
      await delay(Math.floor(Math.random() * (900 - 600 + 1)) + 600)
      if (token !== fightTokenRef.current) {
        return { defHp: getDefHp(), atkHp: getAtkHp(), stopped: true }
      }

      const atkStatus = battleStateRef.current.status[atkSide]
      const skip = trySkipTurnByStatus(atkStatus)
      if (skip.skip) {
        appendLog(formatLine(['⛔', `${attacker.name.toUpperCase()} НЕ МОЖЕТ атаковать — ${skip.reason}!`]), 'bad')
        return { defHp: getDefHp(), atkHp: getAtkHp(), stopped: false }
      }

      const result = calcDamage(attacker, defender, battleStateRef.current, atkSide)

      if (result.kind === 'MISS') {
        appendLog(
          formatLine([
            '🥷',
            `${attacker.name.toUpperCase()} промахнулся — ${defender.name.toUpperCase()} увернулся.`,
          ]),
          'meta',
        )
        return { defHp: getDefHp(), atkHp: getAtkHp(), stopped: false }
      }

      if (result.shieldGainAttacker) {
        battleStateRef.current.shield[atkSide] += result.shieldGainAttacker
        appendLog(
          formatLine(['🛡️', `${attacker.name.toUpperCase()} получает щит +${result.shieldGainAttacker}.`]),
          'meta',
        )
      }

      if (result.shieldGainDefender) {
        battleStateRef.current.shield[defSide] += result.shieldGainDefender
        appendLog(
          formatLine(['🛡️', `${defender.name.toUpperCase()} укрепляет защиту +${result.shieldGainDefender}.`]),
          'meta',
        )
      }

      const shieldBefore = battleStateRef.current.shield[defSide]
      const { dmgAfter, shieldAfter, absorbed } = applyShieldAbsorb(result.dmg, shieldBefore)
      battleStateRef.current.shield[defSide] = shieldAfter

      const finalDamage = dmgAfter
      if (battleStateRef.current.counterActive && defSide === 'champ') {
        const reflected = clamp(Math.floor(dmgAfter * 0.5), 3, 10)
        battleStateRef.current.counterActive = false
        const newAtkHp = Math.max(1, getAtkHp() - reflected)
        setAtkHp(newAtkHp)
        appendLog(formatLine(['⚔️', `КОНТР-УДАР! ${attacker.name.toUpperCase()} получает ${reflected} урона!`]), 'good')
      }

      let defHp = getDefHp() - finalDamage
      if (result.itemEffect?.type === 'sash' && defHp <= 0) {
        battleStateRef.current.sashUsed = true
        defHp = 1
        appendLog(
          formatLine(['💎', `${defender.name.toUpperCase()} выжил благодаря Focus Sash с 1 HP!`]),
          'good',
        )
      }

      defHp = Math.max(0, defHp)
      setDefHp(defHp)

      const critTag = result.crit ? '💥 КРИТ!' : '⚔️'
      const specialTag = result.usedSpecial ? '✨ спец' : '💪 физ'
      const shieldTag = absorbed ? `🛡️ поглощено ${absorbed}` : null
      let effTag: string | null = null

      if (result.eff === 0) effTag = '🚫 не действует'
      else if (result.eff >= 2) effTag = '✅ суперэффективно'
      else if (result.eff <= 0.5) effTag = '🪨 неэффективно'

      appendLog(
        formatLine([
          critTag,
          `${attacker.name.toUpperCase()} наносит удар (${specialTag}): -${finalDamage} HP.`,
          effTag,
          `(${defender.name.toUpperCase()} осталось ${defHp} HP)`,
          shieldTag,
        ]),
        defHp === 0 ? 'good' : 'default',
      )

      if (result.itemEffect?.type === 'helmet') {
        const newAtkHp = Math.max(1, getAtkHp() - result.itemEffect.value)
        setAtkHp(newAtkHp)
        appendLog(
          formatLine([
            '🪨',
            `${attacker.name.toUpperCase()} получает от Rocky Helmet: -${result.itemEffect.value} HP`,
          ]),
          'bad',
        )
      }

      if (result.attackerItem === 'dmg_plus') {
        const recoil = clamp(Math.floor((attacker.stats?.hp ?? 1) * 0.1), 2, 8)
        const newAtkHp = Math.max(1, getAtkHp() - recoil)
        setAtkHp(newAtkHp)
        appendLog(formatLine(['🔴', `${attacker.name.toUpperCase()} получает от Life Orb: -${recoil} HP`]), 'bad')
      }

      if (result.healAttacker) {
        const attackerMax = attacker.stats?.hp ?? 1
        const next = Math.min(attackerMax, getAtkHp() + result.healAttacker)
        setAtkHp(next)
        appendLog(formatLine(['🩹', `${attacker.name.toUpperCase()} лечится: +${result.healAttacker} HP.`]), 'good')
      }

      if (result.healDefender) {
        const defenderMax = defender.stats?.hp ?? 1
        const next = Math.min(defenderMax, defHp + result.healDefender)
        setDefHp(next)
        defHp = next
        appendLog(
          formatLine(['✨', `${defender.name.toUpperCase()} восстанавливается: +${result.healDefender} HP.`]),
          'good',
        )
      }

      if (defender.item?.effect === 'heal_30' && defHp <= (defender.stats?.hp ?? 1) * 0.3 && !battleStateRef.current.berryUsed) {
        battleStateRef.current.berryUsed = true
        const heal = clamp(Math.floor((defender.stats?.hp ?? 1) * 0.2), 8, 15)
        const next = Math.min(defender.stats?.hp ?? 1, defHp + heal)
        setDefHp(next)
        defHp = next
        appendLog(formatLine(['🫐', `${defender.name.toUpperCase()} съел Oran Berry: +${heal} HP`]), 'good')
      }

      if (result.statusApplied && !battleStateRef.current.status[defSide]) {
        battleStateRef.current.status[defSide] = result.statusApplied
        setActiveStatus(prev => ({ ...prev, [defSide]: result.statusApplied }))
        appendLog(
          formatLine([
            statusIcon(result.statusApplied.kind),
            `⚠️ ${defender.name.toUpperCase()} ПОЛУЧАЕТ ${statusName(result.statusApplied.kind)} на ${result.statusApplied.turns} хода!`,
            `(урон за ход: ${result.statusApplied.dot} HP)`,
          ]),
          'bad',
        )
      }

      if (result.extraHits && defHp > 0) {
        appendLog(formatLine(['⚡️', `${attacker.name.toUpperCase()} начинает серию ударов: +${result.extraHits}.`]), 'meta')

        for (let i = 0; i < result.extraHits; i += 1) {
          await delay(Math.floor(Math.random() * (380 - 260 + 1)) + 260)
          if (token !== fightTokenRef.current) return { defHp, atkHp: getAtkHp(), stopped: true }
          if (defHp <= 0) break

          const mini = clamp(Math.round(finalDamage * (0.45 + Math.random() * 0.25)), 1, 9)
          const shield = battleStateRef.current.shield[defSide]
          const miniAbsorb = applyShieldAbsorb(mini, shield)
          battleStateRef.current.shield[defSide] = miniAbsorb.shieldAfter

          const miniAfter = miniAbsorb.dmgAfter
          defHp = Math.max(0, defHp - miniAfter)
          setDefHp(defHp)

          appendLog(
            formatLine([
              '⚡',
              `Доп. удар: -${miniAfter} HP.`,
              `(${defender.name.toUpperCase()} осталось ${defHp} HP)`,
              miniAbsorb.absorbed ? `🛡️ поглощено ${miniAbsorb.absorbed}` : null,
            ]),
            defHp === 0 ? 'good' : 'default',
          )
        }
      }

      return { defHp, atkHp: getAtkHp(), stopped: false }
    }

    appendLog(
      formatLine([
        '⚔️',
        `БОЙ #${fightNoRef.current}:`,
        localChamp.name.toUpperCase(),
        'vs',
        localOpp.name.toUpperCase(),
      ]),
      'header',
    )

    const champSpeed = localChamp.stats?.speed ?? 0
    const oppSpeed = localOpp.stats?.speed ?? 0
    const champFirst = champSpeed >= oppSpeed

    appendLog(
      formatLine([
        '🧭',
        'Порядок хода:',
        (champFirst ? localChamp.name : localOpp.name).toUpperCase(),
        'ходит первым.',
      ]),
      'meta',
    )

    try {
      await delay(Math.floor(Math.random() * (950 - 650 + 1)) + 650)
      if (token !== fightTokenRef.current) return

      while (cHp > 0 && oHp > 0) {
        if (token !== fightTokenRef.current) return

        battleStateRef.current.turn += 1
        appendLog(formatLine(['🕒', `ХОД ${battleStateRef.current.turn}`]), 'meta')

        const champStatusLine = getStatusLine('champ')
        const oppStatusLine = getStatusLine('opp')
        if (champStatusLine || oppStatusLine) {
          appendLog(
            formatLine([
              '📌',
              champStatusLine ? `Чемпион: ${champStatusLine}` : null,
              oppStatusLine ? `Оппонент: ${oppStatusLine}` : null,
            ]),
            'meta',
          )
        }

        const champShield = battleStateRef.current.shield.champ
        const oppShield = battleStateRef.current.shield.opp
        if (champShield || oppShield) {
          appendLog(
            formatLine([
              '🛡️',
              champShield ? `Щит чемпиона: ${champShield}` : null,
              oppShield ? `Щит оппонента: ${oppShield}` : null,
            ]),
            'meta',
          )
        }

        const firstTurn = champFirst
          ? { atk: localChamp, def: localOpp, atkSide: 'champ' as const, defSide: 'opp' as const }
          : { atk: localOpp, def: localChamp, atkSide: 'opp' as const, defSide: 'champ' as const }

        const secondTurn = champFirst
          ? { atk: localOpp, def: localChamp, atkSide: 'opp' as const, defSide: 'champ' as const }
          : { atk: localChamp, def: localOpp, atkSide: 'champ' as const, defSide: 'opp' as const }

        let result = await doSingleHit(
          firstTurn.atk,
          firstTurn.def,
          firstTurn.atkSide,
          firstTurn.defSide,
          firstTurn.atkSide === 'champ' ? () => oHp : () => cHp,
          firstTurn.atkSide === 'champ'
            ? value => {
                oHp = value
                setChallengerHp(value)
              }
            : value => {
                cHp = value
                setChampHp(value)
              },
          firstTurn.atkSide === 'champ' ? () => cHp : () => oHp,
          firstTurn.atkSide === 'champ'
            ? value => {
                cHp = value
                setChampHp(value)
              }
            : value => {
                oHp = value
                setChallengerHp(value)
              },
        )

        if (result.stopped) return
        if (firstTurn.defSide === 'opp') oHp = result.defHp
        else cHp = result.defHp
        if (cHp <= 0 || oHp <= 0) break

        result = await doSingleHit(
          secondTurn.atk,
          secondTurn.def,
          secondTurn.atkSide,
          secondTurn.defSide,
          secondTurn.atkSide === 'champ' ? () => oHp : () => cHp,
          secondTurn.atkSide === 'champ'
            ? value => {
                oHp = value
                setChallengerHp(value)
              }
            : value => {
                cHp = value
                setChampHp(value)
              },
          secondTurn.atkSide === 'champ' ? () => cHp : () => oHp,
          secondTurn.atkSide === 'champ'
            ? value => {
                cHp = value
                setChampHp(value)
              }
            : value => {
                oHp = value
                setChallengerHp(value)
              },
        )

        if (result.stopped) return
        if (secondTurn.defSide === 'opp') oHp = result.defHp
        else cHp = result.defHp
        if (cHp <= 0 || oHp <= 0) break

        await delay(Math.floor(Math.random() * (420 - 260 + 1)) + 260)
        if (token !== fightTokenRef.current) return

        const champMax = localChamp.stats?.hp ?? 1
        const oppMax = localOpp.stats?.hp ?? 1

        cHp = applyEndOfTurn('champ', cHp, champMax, setChampHp, localChamp.name.toUpperCase(), localChamp.item)
        if (cHp <= 0) break

        oHp = applyEndOfTurn('opp', oHp, oppMax, setChallengerHp, localOpp.name.toUpperCase(), localOpp.item)
        if (oHp <= 0) break

        decreaseCooldowns()
      }

      if (cHp > 0 && oHp <= 0) {
        appendLog(formatLine(['✅', 'Победа чемпиона:', localChamp.name.toUpperCase()]), 'good')
        setChallengerHp(0)
        setNeedsOpponent(true)
        appendLog(formatLine(['▶️', 'Нажмите «Следующий бой».']), 'meta')
      } else if (oHp > 0 && cHp <= 0) {
        appendLog(formatLine(['👑', 'Новый чемпион:', localOpp.name.toUpperCase()]), 'good')
        setChamp(localOpp)
        setChampHp(localOpp.stats?.hp ?? 1)
        setChallenger(localChamp)
        setChallengerHp(0)
        setNeedsOpponent(true)
        appendLog(formatLine(['▶️', 'Нажмите «Следующий бой».']), 'meta')
      } else {
        appendLog(formatLine(['🤝', 'Ничья.']), 'meta')
        setNeedsOpponent(true)
        appendLog(formatLine(['▶️', 'Нажмите «Следующий бой».']), 'meta')
      }
    } finally {
      setIsFighting(false)
    }
  }

  const toneClass = (tone: LogTone): string => {
    if (tone === 'header') return 'border-t-2 border-t-zinc-500/70 bg-zinc-900/20'
    if (tone === 'good') return 'bg-emerald-500/10 border-emerald-400/30'
    if (tone === 'bad') return 'bg-rose-500/10 border-rose-400/30'
    if (tone === 'meta') return 'bg-zinc-900/10 border-zinc-400/40'
    return 'bg-zinc-900/0 border-zinc-400/50'
  }

  const logPanelHeightStyle = logMaxHeight
    ? ({ maxHeight: `${logMaxHeight}px`, height: '100%' } as const)
    : ({ maxHeight: '500px' } as const)

  const loser = Boolean(challenger && challengerHp <= 0)

  return (
    <>
      <BattleHeader
        champ={champ}
        challenger={challenger}
        champHp={champHp}
        challengerHp={challengerHp}
        activeStatus={activeStatus}
        isMega={isMega}
      />

      <section className='grid grid-cols-1 md:grid-cols-3 gap-6 items-start'>
        <BattleCard ref={leftCardRef} pokemon={champ} />

        <div
          className='md:col-span-1 rounded-2xl border border-zinc-400/50 p-4 shadow-[0px_0px_13px_-4px_rgba(0,0,0,0.4)] flex flex-col'
          style={logPanelHeightStyle}
        >
          <div className='flex items-center justify-between p-2 mb-3 gap-3'>
            <div className='text-sm font-semibold'>Лог боя</div>
            <div className='flex items-center gap-2'>
              {isIdle ? (
                <button className='btn btn-success' onClick={prepareBattleHandler} disabled={!canPrepare}>
                  {isLoading ? 'Загрузка...' : 'Подготовить'}
                </button>
              ) : (
                <>
                  {needsOpponent && (
                    <button className='btn btn-warning' onClick={loadOpponentHandler} disabled={!canLoadOpponent}>
                      {isLoading ? 'Загрузка...' : 'Следующий бой'}
                    </button>
                  )}
                  {hasBoth && !needsOpponent && (
                    <button className='btn btn-error' onClick={fight} disabled={!canFight}>
                      {isFighting ? 'Идет бой...' : 'Начать бой'}
                    </button>
                  )}
                </>
              )}
            </div>
            <div className='text-xs opacity-60 tabular-nums'>
              {fightNoRef.current ? `Бои: ${fightNoRef.current}` : '-'}
            </div>
          </div>

          {isFighting && (
            <BattleControls
              activeAbilities={activeAbilities}
              onShield={() => handleActivateAbility('shield')}
              onHeal={() => handleActivateAbility('heal')}
              onCounter={() => handleActivateAbility('counter')}
              canMega={canMega}
              megaUsed={megaUsed}
              onMega={handleMega}
              champHp={champHp}
              champMaxHp={champMaxHp}
              pressedKey={pressedKey}
            />
          )}

          <BattleLog
            pageItems={pageItems}
            totalPages={totalPages}
            page={page}
            setPage={setPage}
            logScrollRef={logScrollRef}
            toneClass={toneClass}
            isFighting={isFighting}
          />
        </div>

        <BattleCard pokemon={challenger} isDefeated={loser} />
      </section>
    </>
  )
}
