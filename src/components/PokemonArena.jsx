import { useEffect, useMemo, useRef, useState } from 'react'
import PokemonCard from './PokemonCard'
import { fetchPokemon, getSpeciesCount, randomNumber } from '../api/poke'

const clamp = (v, min, max) => Math.max(min, Math.min(max, v))
const pick = arr => arr[Math.floor(Math.random() * arr.length)]
const delay = ms => new Promise(r => setTimeout(r, ms))

function hasType(p, t) {
  return (p?.types ?? []).some(x => x?.type?.name === t)
}
function hasAbility(p, name) {
  return (p?.abilities ?? []).some(a => a?.ability?.name === name)
}

function initBattleState() {
  return {
    turn: 0,
    tempo: { champ: 0, opp: 0 },
    shield: { champ: 0, opp: 0 },
    status: {
      champ: null,
      opp: null,
    },
  }
}

function statusIcon(kind) {
  const m = {
    BURN: '🔥',
    POISON: '☠️',
    CURSE: '🕯️',
    PARALYZE: '⚡',
    FREEZE: '🧊',
  }
  return m[kind] ?? '✨'
}

function statusName(kind) {
  const m = {
    BURN: 'ОЖОГ',
    POISON: 'ЯД',
    CURSE: 'ПРОКЛЯТИЕ',
    PARALYZE: 'ПАРАЛИЧ',
    FREEZE: 'ЗАМОРОЗКА',
  }
  return m[kind] ?? 'ЭФФЕКТ'
}

function formatLine(parts) {
  return parts.filter(Boolean).join('  ')
}

function calcDamage(attacker, defender, battleState, atkSide) {
  const A = attacker.stats ?? {}
  const D = defender.stats ?? {}

  const atk = A.attack ?? 0
  const def = D.defense ?? 0
  const spa = A['special-attack'] ?? 0
  const spd = D['special-defense'] ?? 0

  const aSpd = A.speed ?? 0
  const dSpd = D.speed ?? 0

  const dHpMax = D.hp ?? 1

  const aW = attacker.weight ?? 100
  const dW = defender.weight ?? 100
  const aH = attacker.height ?? 10
  const dH = defender.height ?? 10

  const useSpecial = spa >= atk
  const rawAttack = useSpecial ? spa : atk
  const rawDefense = useSpecial ? spd : def

  const accuracy =
    0.78 +
    clamp((aSpd - dSpd) / 220, -0.15, 0.18) +
    clamp((dW - aW) / 1400, -0.08, 0.08) +
    clamp((dH - aH) / 200, -0.05, 0.05)

  const evade =
    0.1 +
    clamp((dSpd - aSpd) / 200, -0.06, 0.18) +
    clamp((aW - dW) / 1600, -0.06, 0.06) +
    clamp((aH - dH) / 220, -0.04, 0.04)

  const hitChance = clamp(accuracy - evade, 0.45, 0.95)
  const hitRoll = Math.random()
  if (hitRoll > hitChance) {
    return {
      kind: 'MISS',
      usedSpecial: useSpecial,
      dmg: 0,
      crit: false,
      extraHits: 0,
      healAttacker: 0,
      healDefender: 0,
      shieldGainAttacker: 0,
      shieldGainDefender: 0,
      statusApplied: null,
    }
  }

  const speedAtkMul = 1 + clamp(aSpd / 260, 0, 0.25)
  const speedDefMul = 1 - clamp(dSpd / 320, 0, 0.22)
  const tankMul = 1 - clamp(dHpMax / 240, 0, 0.22)

  const weightAtkMul = 1 + clamp((aW - 100) / 2200, -0.05, 0.12)
  const weightDefMul = 1 - clamp((dW - 120) / 2400, -0.06, 0.1)

  const ratio = (rawAttack * speedAtkMul * weightAtkMul) / Math.max(1, rawDefense)
  let dmg = 6 + Math.floor(ratio * 10 * speedDefMul * tankMul * weightDefMul)

  const critChance = clamp(1 / 18 + aSpd / 2600, 1 / 22, 1 / 10)
  const crit = Math.random() < critChance
  if (crit) dmg = Math.round(dmg * 1.45)

  const variance = 0.82 + Math.random() * 0.36
  dmg = Math.round(dmg * variance)

  let shieldGainAttacker = 0
  let shieldGainDefender = 0

  if (hasType(attacker, 'steel')) shieldGainAttacker += 1
  if (hasAbility(attacker, 'battle-armor') || hasAbility(attacker, 'shell-armor'))
    shieldGainAttacker += 1

  if (hasType(defender, 'steel')) shieldGainDefender += 1
  if (hasAbility(defender, 'battle-armor') || hasAbility(defender, 'shell-armor'))
    shieldGainDefender += 1

  let healAttacker = 0
  let healDefender = 0

  if (hasType(attacker, 'grass') || hasType(attacker, 'bug') || hasType(attacker, 'dark')) {
    if (Math.random() < 0.18) healAttacker += clamp(Math.floor(dmg * 0.25), 1, 8)
  }

  const regenLike =
    hasAbility(defender, 'regenerator') ||
    hasAbility(defender, 'rain-dish') ||
    hasAbility(defender, 'ice-body') ||
    hasAbility(defender, 'dry-skin') ||
    hasAbility(defender, 'poison-heal') ||
    hasAbility(defender, 'shed-skin') ||
    hasAbility(defender, 'healer')

  if (regenLike && Math.random() < 0.22) {
    healDefender += clamp(Math.floor(dHpMax * 0.08), 2, 12)
  }

  let statusApplied = null
  const defSide = atkSide === 'champ' ? 'opp' : 'champ'
  const defenderHasStatus = !!battleState?.status?.[defSide]

  if (!defenderHasStatus && Math.random() < 0.22) {
    const options = []
    if (hasType(attacker, 'fire')) options.push('BURN')
    if (hasType(attacker, 'poison')) options.push('POISON')
    if (hasType(attacker, 'electric')) options.push('PARALYZE')
    if (hasType(attacker, 'ice')) options.push('FREEZE')
    if (hasType(attacker, 'ghost')) options.push('CURSE')

    if (options.length) {
      const chosen = pick(options)
      const turns = chosen === 'FREEZE' ? 2 : 3

      let dot = 0
      if (chosen === 'POISON') dot = clamp(Math.floor(dHpMax * 0.06), 2, 10)
      if (chosen === 'BURN') dot = clamp(Math.floor(dHpMax * 0.05), 2, 9)
      if (chosen === 'CURSE') dot = clamp(Math.floor(dHpMax * 0.04), 2, 8)

      statusApplied = { kind: chosen, turns, dot }
    }
  }

  let extraHits = 0
  if (battleState) {
    battleState.tempo[atkSide] = (battleState.tempo[atkSide] ?? 0) + (aSpd >= 80 ? 2 : 1)
    const threshold = 6 + Math.floor(Math.random() * 3)
    if (battleState.tempo[atkSide] >= threshold && Math.random() < 0.55) {
      extraHits = 1 + (aSpd >= 110 && Math.random() < 0.35 ? 1 : 0)
      battleState.tempo[atkSide] = 0
      dmg = Math.round(dmg * 0.78)
    }
  }

  dmg = clamp(dmg, 2, 16)

  return {
    kind: 'HIT',
    usedSpecial: useSpecial,
    dmg,
    crit,
    extraHits,
    healAttacker,
    healDefender,
    shieldGainAttacker,
    shieldGainDefender,
    statusApplied,
  }
}

function applyShieldAbsorb(dmg, shieldValue) {
  if (shieldValue <= 0) return { dmgAfter: dmg, shieldAfter: 0, absorbed: 0 }
  const absorbed = Math.min(shieldValue, dmg)
  return { dmgAfter: dmg - absorbed, shieldAfter: shieldValue - absorbed, absorbed }
}

function trySkipTurnByStatus(status) {
  if (!status) return { skip: false, reason: null }

  if (status.kind === 'PARALYZE') {
    if (Math.random() < 0.25) return { skip: true, reason: '⚡ паралич' }
  }
  if (status.kind === 'FREEZE') {
    if (Math.random() < 0.6) return { skip: true, reason: '🧊 заморозка' }
  }
  return { skip: false, reason: null }
}

function tickStatus(status) {
  if (!status) return null
  const nextTurns = (status.turns ?? 1) - 1
  if (nextTurns <= 0) return null
  return { ...status, turns: nextTurns }
}

export default function PokemonArena() {
  const [count, setCount] = useState(null)

  const [champ, setChamp] = useState(null)
  const [challenger, setChallenger] = useState(null)

  const [champHp, setChampHp] = useState(0)
  const [challengerHp, setChallengerHp] = useState(0)

  const [needsOpponent, setNeedsOpponent] = useState(false)

  const [log, setLog] = useState([])
  const logBoxRef = useRef(null)

  const fightNoRef = useRef(0)
  const fightTokenRef = useRef(0)
  const battleStateRef = useRef(initBattleState())

  const [isFighting, setIsFighting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const appendLog = line => setLog(prev => [...prev, line])

  useEffect(() => {
    getSpeciesCount().then(setCount)
  }, [])

  useEffect(() => {
    const el = logBoxRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [log])

  const hasBoth = !!champ && !!challenger
  const isIdle = !champ && !challenger

  const canPrepare = useMemo(
    () => !!count && !isLoading && !isFighting && isIdle,
    [count, isLoading, isFighting, isIdle],
  )
  const canLoadOpponent = useMemo(
    () => !!champ && !!count && !isLoading && !isFighting && needsOpponent,
    [champ, count, isLoading, isFighting, needsOpponent],
  )
  const canFight = useMemo(
    () => hasBoth && !!count && !isLoading && !isFighting,
    [hasBoth, count, isLoading, isFighting],
  )

  async function getNewPokemon(excludeId) {
    const max = count ?? 1010
    let id = randomNumber(1, max)
    if (excludeId && id === excludeId) id = (id % max) + 1
    return await fetchPokemon(id)
  }

  function resetSession() {
    setLog([])
    fightNoRef.current = 0
    battleStateRef.current = initBattleState()
  }

  async function prepareBattle() {
    if (!canPrepare) return
    setIsLoading(true)
    resetSession()

    appendLog(formatLine(['⏳', 'Загрузка чемпиона и оппонента...']))

    try {
      const a = await getNewPokemon(null)
      const b = await getNewPokemon(a.id)

      setChamp(a)
      setChampHp(a.stats?.hp ?? 1)

      setChallenger(b)
      setChallengerHp(b.stats?.hp ?? 1)

      setNeedsOpponent(false)

      appendLog('')
      appendLog(formatLine(['✅', 'Подготовка завершена.']))
      appendLog(formatLine(['🏆', 'Чемпион:', a.name.toUpperCase()]))
      appendLog(formatLine(['🥊', 'Оппонент:', b.name.toUpperCase()]))
      appendLog(formatLine(['▶️', 'Нажмите «Начать бой».']))
    } catch {
      appendLog(formatLine(['❌', 'Не удалось загрузить покемонов. Попробуйте ещё раз.']))
      setChamp(null)
      setChallenger(null)
      setChampHp(0)
      setChallengerHp(0)
      setNeedsOpponent(false)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadOpponent() {
    if (!canLoadOpponent) return
    setIsLoading(true)

    appendLog('')
    appendLog(formatLine(['⏳', 'Загрузка нового оппонента...']))

    try {
      const opp = await getNewPokemon(champ.id)
      setChallenger(opp)
      setChallengerHp(opp.stats?.hp ?? 1)
      setNeedsOpponent(false)

      battleStateRef.current = initBattleState()

      appendLog(formatLine(['✅', 'Новый оппонент:', opp.name.toUpperCase()]))
      appendLog(formatLine(['▶️', 'Нажмите «Начать бой».']))
    } catch {
      appendLog(formatLine(['❌', 'Не удалось загрузить оппонента. Попробуйте ещё раз.']))
    } finally {
      setIsLoading(false)
    }
  }

  function hpPct(cur, max) {
    const m = Math.max(1, max ?? 1)
    return clamp(Math.round((Math.max(0, cur) / m) * 100), 0, 100)
  }

  function getStatusLine(sideKey) {
    const st = battleStateRef.current?.status?.[sideKey]
    if (!st) return null
    return `${statusIcon(st.kind)} ${statusName(st.kind)} (${st.turns})`
  }

  async function fight() {
    if (!canFight) return

    setIsFighting(true)
    fightNoRef.current += 1
    fightTokenRef.current += 1
    const token = fightTokenRef.current

    battleStateRef.current = initBattleState()

    const localChamp = champ
    const localOpp = challenger

    let cHp = localChamp.stats?.hp ?? 1
    let oHp = localOpp.stats?.hp ?? 1
    setChampHp(cHp)
    setChallengerHp(oHp)

    appendLog('')
    appendLog(
      formatLine([
        '⚔️',
        `БОЙ #${fightNoRef.current}:`,
        localChamp.name.toUpperCase(),
        'vs',
        localOpp.name.toUpperCase(),
      ]),
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
    )

    await delay(randomNumber(650, 950))
    if (token !== fightTokenRef.current) return

    const applyEndOfTurn = (sideKey, hp, maxHp, setHp, whoNameUpper) => {
      const st = battleStateRef.current.status[sideKey]
      if (!st) return hp

      if (st.dot && st.dot > 0) {
        const next = Math.max(0, hp - st.dot)
        setHp(next)
        appendLog(
          formatLine([
            statusIcon(st.kind),
            `${whoNameUpper} получает урон от эффекта: -${st.dot} HP.`,
          ]),
        )
        hp = next
      }

      battleStateRef.current.status[sideKey] = tickStatus(st)
      if (!battleStateRef.current.status[sideKey]) {
        appendLog(formatLine(['✨', `${whoNameUpper} больше не под эффектом.`]))
      }

      if (Math.random() < 0.1) {
        const heal = clamp(Math.floor(maxHp * 0.04), 1, 8)
        const next = Math.min(maxHp, hp + heal)
        if (next !== hp) {
          setHp(next)
          appendLog(formatLine(['🩹', `${whoNameUpper} немного восстанавливается: +${heal} HP.`]))
          hp = next
        }
      }

      return hp
    }

    const doSingleHit = async (
      attacker,
      defender,
      atkSide,
      defSide,
      getDefHp,
      setDefHp,
      getAtkHp,
      setAtkHp,
    ) => {
      await delay(randomNumber(600, 900))
      if (token !== fightTokenRef.current)
        return { defHp: getDefHp(), atkHp: getAtkHp(), stopped: true }

      const atkStatus = battleStateRef.current.status[atkSide]
      const skip = trySkipTurnByStatus(atkStatus)
      if (skip.skip) {
        appendLog(
          formatLine(['⛔', `${attacker.name.toUpperCase()} пропускает ход (${skip.reason}).`]),
        )
        return { defHp: getDefHp(), atkHp: getAtkHp(), stopped: false }
      }

      const res = calcDamage(attacker, defender, battleStateRef.current, atkSide)

      if (res.kind === 'MISS') {
        appendLog(
          formatLine([
            '💨',
            `${attacker.name.toUpperCase()} промахнулся — ${defender.name.toUpperCase()} увернулся.`,
          ]),
        )
        return { defHp: getDefHp(), atkHp: getAtkHp(), stopped: false }
      }

      if (res.shieldGainAttacker) {
        battleStateRef.current.shield[atkSide] += res.shieldGainAttacker
        appendLog(
          formatLine([
            '🛡️',
            `${attacker.name.toUpperCase()} получает щит +${res.shieldGainAttacker}.`,
          ]),
        )
      }
      if (res.shieldGainDefender) {
        battleStateRef.current.shield[defSide] += res.shieldGainDefender
        appendLog(
          formatLine([
            '🛡️',
            `${defender.name.toUpperCase()} укрепляет защиту +${res.shieldGainDefender}.`,
          ]),
        )
      }

      const shieldBefore = battleStateRef.current.shield[defSide]
      const { dmgAfter, shieldAfter, absorbed } = applyShieldAbsorb(res.dmg, shieldBefore)
      battleStateRef.current.shield[defSide] = shieldAfter

      let defHp = Math.max(0, getDefHp() - dmgAfter)
      setDefHp(defHp)

      const critTag = res.crit ? '💥 КРИТ!' : '⚔️'
      const specialTag = res.usedSpecial ? '✨ спец' : '💪 физ'
      const shieldTag = absorbed ? `🛡️ поглощено ${absorbed}` : null

      appendLog(
        formatLine([
          critTag,
          `${attacker.name.toUpperCase()} наносит удар (${specialTag}): -${dmgAfter} HP.`,
          `(${defender.name.toUpperCase()} осталось ${defHp} HP)`,
          shieldTag,
        ]),
      )

      if (res.healAttacker) {
        const aMax = attacker.stats?.hp ?? 1
        const next = Math.min(aMax, getAtkHp() + res.healAttacker)
        setAtkHp(next)
        appendLog(
          formatLine(['🩹', `${attacker.name.toUpperCase()} лечится: +${res.healAttacker} HP.`]),
        )
      }
      if (res.healDefender) {
        const dMax = defender.stats?.hp ?? 1
        const next = Math.min(dMax, defHp + res.healDefender)
        setDefHp(next)
        defHp = next
        appendLog(
          formatLine([
            '✨',
            `${defender.name.toUpperCase()} восстанавливается: +${res.healDefender} HP.`,
          ]),
        )
      }

      if (res.statusApplied && !battleStateRef.current.status[defSide]) {
        battleStateRef.current.status[defSide] = res.statusApplied
        appendLog(
          formatLine([
            statusIcon(res.statusApplied.kind),
            `${defender.name.toUpperCase()} получает эффект ${statusName(res.statusApplied.kind)} на ${res.statusApplied.turns} хода.`,
          ]),
        )
      }

      if (res.extraHits && defHp > 0) {
        appendLog(
          formatLine([
            '⚡',
            `${attacker.name.toUpperCase()} начинает серию ударов: +${res.extraHits}.`,
          ]),
        )
        for (let i = 0; i < res.extraHits; i++) {
          await delay(randomNumber(260, 380))
          if (token !== fightTokenRef.current) return { defHp, atkHp: getAtkHp(), stopped: true }
          if (defHp <= 0) break

          const mini = clamp(Math.round(res.dmg * (0.45 + Math.random() * 0.25)), 1, 8)

          const shieldB = battleStateRef.current.shield[defSide]
          const miniAbs = applyShieldAbsorb(mini, shieldB)
          battleStateRef.current.shield[defSide] = miniAbs.shieldAfter

          const miniAfter = miniAbs.dmgAfter
          defHp = Math.max(0, defHp - miniAfter)
          setDefHp(defHp)

          appendLog(
            formatLine([
              '⚡',
              `Доп. удар: -${miniAfter} HP.`,
              `(${defender.name.toUpperCase()} осталось ${defHp} HP)`,
              miniAbs.absorbed ? `🛡️ поглощено ${miniAbs.absorbed}` : null,
            ]),
          )
        }
      }

      return { defHp, atkHp: getAtkHp(), stopped: false }
    }

    while (cHp > 0 && oHp > 0) {
      if (token !== fightTokenRef.current) return
      battleStateRef.current.turn += 1
      appendLog('')
      appendLog(formatLine(['🕒', `ХОД ${battleStateRef.current.turn}`]))

      const champStatusLine = getStatusLine('champ')
      const oppStatusLine = getStatusLine('opp')
      if (champStatusLine || oppStatusLine) {
        appendLog(
          formatLine([
            '📌',
            champStatusLine ? `Чемпион: ${champStatusLine}` : null,
            oppStatusLine ? `Оппонент: ${oppStatusLine}` : null,
          ]),
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
        )
      }

      if (champFirst) {
        {
          const r = await doSingleHit(
            localChamp,
            localOpp,
            'champ',
            'opp',
            () => oHp,
            v => {
              oHp = v
              setChallengerHp(v)
            },
            () => cHp,
            v => {
              cHp = v
              setChampHp(v)
            },
          )
          if (r.stopped) return
          oHp = r.defHp
          if (oHp <= 0) break
        }

        {
          const r = await doSingleHit(
            localOpp,
            localChamp,
            'opp',
            'champ',
            () => cHp,
            v => {
              cHp = v
              setChampHp(v)
            },
            () => oHp,
            v => {
              oHp = v
              setChallengerHp(v)
            },
          )
          if (r.stopped) return
          cHp = r.defHp
          if (cHp <= 0) break
        }
      } else {
        {
          const r = await doSingleHit(
            localOpp,
            localChamp,
            'opp',
            'champ',
            () => cHp,
            v => {
              cHp = v
              setChampHp(v)
            },
            () => oHp,
            v => {
              oHp = v
              setChallengerHp(v)
            },
          )
          if (r.stopped) return
          cHp = r.defHp
          if (cHp <= 0) break
        }

        {
          const r = await doSingleHit(
            localChamp,
            localOpp,
            'champ',
            'opp',
            () => oHp,
            v => {
              oHp = v
              setChallengerHp(v)
            },
            () => cHp,
            v => {
              cHp = v
              setChampHp(v)
            },
          )
          if (r.stopped) return
          oHp = r.defHp
          if (oHp <= 0) break
        }
      }

      await delay(randomNumber(260, 420))
      if (token !== fightTokenRef.current) return

      const champMax = localChamp.stats?.hp ?? 1
      const oppMax = localOpp.stats?.hp ?? 1

      cHp = applyEndOfTurn(
        'champ',
        cHp,
        champMax,
        v => setChampHp(v),
        localChamp.name.toUpperCase(),
      )
      if (cHp <= 0) break
      oHp = applyEndOfTurn('opp', oHp, oppMax, v => setChallengerHp(v), localOpp.name.toUpperCase())
      if (oHp <= 0) break
    }

    appendLog('')
    if (cHp > 0 && oHp <= 0) {
      appendLog(formatLine(['✅', 'Победа чемпиона:', localChamp.name.toUpperCase()]))

      setChallenger(null)
      setChallengerHp(0)
      setNeedsOpponent(true)
      appendLog(formatLine(['▶️', 'Нажмите «Следующий оппонент».']))
    } else if (oHp > 0 && cHp <= 0) {
      appendLog(formatLine(['👑', 'Новый чемпион:', localOpp.name.toUpperCase()]))

      const newChamp = localOpp
      setChamp(newChamp)
      setChampHp(newChamp.stats?.hp ?? 1)

      setChallenger(null)
      setChallengerHp(0)

      setNeedsOpponent(true)
      appendLog(formatLine(['▶️', 'Нажмите «Следующий оппонент».']))
    } else {
      appendLog(formatLine(['🤝', 'Ничья.']))
      setChallenger(null)
      setChallengerHp(0)
      setNeedsOpponent(true)
      appendLog(formatLine(['▶️', 'Нажмите «Следующий оппонент».']))
    }

    setIsFighting(false)
  }

  const champMaxHp = champ?.stats?.hp ?? 0
  const oppMaxHp = challenger?.stats?.hp ?? 0

  return (
    <section className='w-full max-w-6xl mx-auto px-4 flex flex-col gap-5'>
      <div className='sticky top-0 z-30'>
        <div className='rounded-2xl border border-zinc-800/60 bg-base-100/85 backdrop-blur p-4 shadow-xl'>
          <div className='flex flex-col gap-3 items-center'>
            <div className='text-sm font-semibold'>
              {champ ? champ.name.toUpperCase() : '—'}{' '}
              <span className='opacity-60 text-red-500'> vs </span>{' '}
              {challenger ? challenger.name.toUpperCase() : '—'}
            </div>

            <div className='grid grid-cols-1 md:grid-cols-2 gap-3 w-full'>
              <div className='rounded-xl border border-zinc-800/40 bg-zinc-950/30 p-3'>
                <div className='flex items-center justify-between'>
                  <div className='text-xs opacity-70'>
                    {champ ? champ.name.toUpperCase() : 'HP чемпиона'}
                  </div>
                  <div className='text-xs tabular-nums'>
                    {champ ? `${champHp}/${champMaxHp}` : '—'}
                  </div>
                </div>
                <div className='mt-2 h-2 w-full rounded-full bg-zinc-900/70 overflow-hidden'>
                  <div
                    className='h-full bg-emerald-500/70'
                    style={{ width: `${champ ? hpPct(champHp, champMaxHp) : 0}%` }}
                  />
                </div>
              </div>

              <div className='rounded-xl border border-zinc-800/40 bg-zinc-950/30 p-3'>
                <div className='flex items-center justify-between'>
                  <div className='text-xs opacity-70'>
                    {challenger ? challenger.name.toUpperCase() : 'HP оппонента'}
                  </div>
                  <div className='text-xs tabular-nums'>
                    {challenger ? `${challengerHp}/${oppMaxHp}` : '—'}
                  </div>
                </div>
                <div className='mt-2 h-2 w-full rounded-full bg-zinc-900/70 overflow-hidden'>
                  <div
                    className='h-full bg-rose-500/70'
                    style={{ width: `${challenger ? hpPct(challengerHp, oppMaxHp) : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className='grid grid-cols-1 md:grid-cols-3 gap-6 items-start'>
        <div className='md:col-span-1'>
          <PokemonCard
            pokemon={champ}
            isDefeated={!!champ && champHp <= 0}
          />
        </div>

        <div className='md:col-span-1 rounded-2xl border border-zinc-800/60 bg-zinc-950/40 p-4'>
          <div className='flex flex-wrap gap-3 items-center justify-center pt-1'>
            {isIdle ? (
              <button
                className='btn btn-success'
                onClick={prepareBattle}
                disabled={!canPrepare}
              >
                {isLoading ? 'Загрузка...' : 'Начать бой'}
              </button>
            ) : (
              <>
                {needsOpponent && (
                  <button
                    className='btn btn-warning'
                    onClick={loadOpponent}
                    disabled={!canLoadOpponent}
                  >
                    {isLoading ? 'Загрузка...' : 'Следующий оппонент'}
                  </button>
                )}

                {hasBoth && (
                  <button
                    className='btn btn-error'
                    onClick={fight}
                    disabled={!canFight}
                  >
                    {isFighting ? 'Бой...' : 'Начать бой'}
                  </button>
                )}
              </>
            )}
          </div>
          <div className='flex items-center justify-between mb-2'>
            <div className='text-sm font-semibold'>Лог боя</div>
            <div className='text-xs opacity-60'>
              {fightNoRef.current ? `Бои: ${fightNoRef.current}` : '—'}
            </div>
          </div>
          <div
            ref={logBoxRef}
            className='text-xs opacity-90 whitespace-pre-wrap leading-5 overflow-y-auto rounded-xl border border-zinc-800/40 bg-zinc-950/40 p-3'
            style={{ maxHeight: '550px' }}
          >
            {log.length ? log.map((l, i) => <div key={i}>{l}</div>) : '—'}
          </div>
        </div>

        <div className='md:col-span-1'>
          <PokemonCard
            pokemon={challenger}
            isDefeated={!!challenger && challengerHp <= 0}
          />
        </div>
      </section>
    </section>
  )
}
