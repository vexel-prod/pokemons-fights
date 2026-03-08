import { prisma } from './prisma'

const REBIRTH_THRESHOLDS = [10, 30, 60, 120] as const
const REBIRTH_MULTIPLIERS = [1, 1.12, 1.28, 1.48, 1.72] as const

interface PokeApiPokemon {
  id?: number
  name?: string
  base_experience?: number
  species?: { url?: string }
  types?: Array<{ type?: { name?: string } }>
  stats?: Array<{ base_stat?: number; stat?: { name?: string } }>
}

interface PokeApiSpecies {
  evolution_chain?: { url?: string }
}

interface PokeApiEvolutionNode {
  species?: { name?: string }
  evolves_to?: PokeApiEvolutionNode[]
}

interface PokeApiEvolutionChain {
  chain?: PokeApiEvolutionNode
}

export interface ProgressSnapshot {
  pokemonId: number
  currentName: string
  battles: number
  rebirthLevel: number
  powerMultiplier: number
  scaledStats: {
    hp: number
    attack: number
    defense: number
    speed: number
    spAttack: number
    spDefense: number
  }
}

type PokemonProgress = Awaited<ReturnType<typeof prisma.pokemonProgress.findFirstOrThrow>>

const statValue = (
  stats: PokeApiPokemon['stats'],
  key: 'hp' | 'attack' | 'defense' | 'speed' | 'special-attack' | 'special-defense',
): number => {
  const found = (stats ?? []).find(item => item?.stat?.name === key)?.base_stat
  return Math.max(1, found ?? 1)
}

const rebirthLevelFromBattles = (battles: number): number => {
  if (battles >= REBIRTH_THRESHOLDS[3]) return 4
  if (battles >= REBIRTH_THRESHOLDS[2]) return 3
  if (battles >= REBIRTH_THRESHOLDS[1]) return 2
  if (battles >= REBIRTH_THRESHOLDS[0]) return 1
  return 0
}

const powerMultiplierForLevel = (rebirthLevel: number): number => {
  const idx = Math.max(0, Math.min(REBIRTH_MULTIPLIERS.length - 1, rebirthLevel))
  return REBIRTH_MULTIPLIERS[idx] ?? 1
}

const toTitle = (value: string): string =>
  value
    .split('-')
    .filter(Boolean)
    .map(part => part[0]?.toUpperCase() + part.slice(1))
    .join(' ')

const extractEvolutionPath = (chain: PokeApiEvolutionNode | undefined): string[] => {
  const path: string[] = []
  let cursor = chain
  while (cursor) {
    const name = cursor.species?.name
    if (name) path.push(name)
    cursor = cursor.evolves_to?.[0]
  }
  return path
}

const fetchJson = async <T>(url: string | null | undefined): Promise<T | null> => {
  if (!url) return null
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    return (await response.json()) as T
  } catch {
    return null
  }
}

const resolveCurrentName = (baseName: string, evolutionPathCsv: string | null, rebirthLevel: number): string => {
  const names = (evolutionPathCsv ?? '')
    .split('|')
    .map(item => item.trim())
    .filter(Boolean)

  if (!names.length) return toTitle(baseName)

  const baseIndex = Math.max(0, names.findIndex(item => item === baseName))
  const target = Math.min(names.length - 1, baseIndex + rebirthLevel)
  return toTitle(names[target] ?? baseName)
}

const scaleStats = (entry: {
  hp: number
  attack: number
  defense: number
  speed: number
  spAttack: number
  spDefense: number
  powerMultiplier: number
}): ProgressSnapshot['scaledStats'] => ({
  hp: Math.max(1, Math.round(entry.hp * entry.powerMultiplier)),
  attack: Math.max(1, Math.round(entry.attack * entry.powerMultiplier)),
  defense: Math.max(1, Math.round(entry.defense * entry.powerMultiplier)),
  speed: Math.max(1, Math.round(entry.speed * entry.powerMultiplier)),
  spAttack: Math.max(1, Math.round(entry.spAttack * entry.powerMultiplier)),
  spDefense: Math.max(1, Math.round(entry.spDefense * entry.powerMultiplier)),
})

const toSnapshot = (entry: PokemonProgress): ProgressSnapshot => ({
  pokemonId: entry.pokemonId,
  currentName: entry.currentName,
  battles: entry.battles,
  rebirthLevel: entry.rebirthLevel,
  powerMultiplier: entry.powerMultiplier,
  scaledStats: scaleStats(entry),
})

const ensureProgress = async (pokemonId: number): Promise<PokemonProgress> => {
  const existing = await prisma.pokemonProgress.findUnique({ where: { pokemonId } })
  if (existing) return existing

  const pokemon = await fetchJson<PokeApiPokemon>(`https://pokeapi.co/api/v2/pokemon/${pokemonId}`)
  if (!pokemon?.id || !pokemon.name) {
    throw new Error(`Failed to fetch base pokemon data for id=${pokemonId}`)
  }

  const species = await fetchJson<PokeApiSpecies>(pokemon.species?.url)
  const evolution = await fetchJson<PokeApiEvolutionChain>(species?.evolution_chain?.url)
  const evolutionPath = extractEvolutionPath(evolution?.chain)

  return prisma.pokemonProgress.create({
    data: {
      pokemonId,
      baseName: pokemon.name,
      currentName: toTitle(pokemon.name),
      battles: 0,
      rebirthLevel: 0,
      powerMultiplier: 1,
      speciesUrl: pokemon.species?.url ?? null,
      evolutionChainUrl: species?.evolution_chain?.url ?? null,
      evolutionPath: evolutionPath.length ? evolutionPath.join('|') : null,
      typesCsv: (pokemon.types ?? [])
        .map(item => item?.type?.name)
        .filter((value): value is string => Boolean(value))
        .join(','),
      baseExp: pokemon.base_experience ?? 0,
      hp: statValue(pokemon.stats, 'hp'),
      attack: statValue(pokemon.stats, 'attack'),
      defense: statValue(pokemon.stats, 'defense'),
      speed: statValue(pokemon.stats, 'speed'),
      spAttack: statValue(pokemon.stats, 'special-attack'),
      spDefense: statValue(pokemon.stats, 'special-defense'),
    },
  })
}

export const recordBattleForPokemon = async (pokemonId: number): Promise<ProgressSnapshot> => {
  const current = await ensureProgress(pokemonId)
  const battles = current.battles + 1
  const rebirthLevel = rebirthLevelFromBattles(battles)
  const powerMultiplier = powerMultiplierForLevel(rebirthLevel)
  const currentName = resolveCurrentName(current.baseName, current.evolutionPath, rebirthLevel)

  const updated = await prisma.pokemonProgress.update({
    where: { pokemonId },
    data: {
      battles,
      rebirthLevel,
      powerMultiplier,
      currentName,
    },
  })

  return toSnapshot(updated)
}

export const getProgressByPokemonId = async (pokemonId: number): Promise<ProgressSnapshot | null> => {
  const found = await prisma.pokemonProgress.findUnique({ where: { pokemonId } })
  if (!found) return null
  return toSnapshot(found)
}

export const listProgressEntries = async () => {
  const rows = await prisma.pokemonProgress.findMany({
    orderBy: [{ battles: 'desc' }, { updatedAt: 'desc' }],
    take: 300,
  })

  return rows.map(row => ({
    ...toSnapshot(row),
    baseName: toTitle(row.baseName),
    types: row.typesCsv.split(',').filter(Boolean),
    baseExp: row.baseExp,
    updatedAt: row.updatedAt,
  }))
}
