import type { Pokemon, PokemonStats } from '../types/battle'
import { getRandomItem } from '../utils/items'
import { randomNumber } from '../utils/helpers'

interface PokeApiStat {
  base_stat: number
  stat?: { name?: string }
}

interface PokeApiResponse {
  id?: number
  name?: string
  height?: number
  weight?: number
  base_experience?: number
  stats?: PokeApiStat[]
  types?: Array<{ type?: { name?: string } }>
  abilities?: Array<{ ability?: { name?: string } }>
  species?: { url?: string }
  sprites?: {
    front_default?: string | null
    other?: {
      ['official-artwork']?: { front_default?: string | null }
      home?: { front_default?: string | null }
    }
  }
}

interface PokeSpeciesResponse {
  is_legendary?: boolean
  is_mythical?: boolean
  evolution_chain?: { url?: string }
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

const mapPokemonStats = (stats: PokeApiStat[] | undefined): PokemonStats =>
  (stats ?? []).reduce<PokemonStats>((acc, stat) => {
    const key = stat?.stat?.name
    if (key) acc[key] = stat?.base_stat ?? 0
    return acc
  }, {})

const mapImage = (data: PokeApiResponse): string =>
  data?.sprites?.other?.['official-artwork']?.front_default ??
  data?.sprites?.other?.home?.front_default ??
  data?.sprites?.front_default ??
  ''

export async function getSpeciesCount(): Promise<number> {
  try {
    const response = await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=0')
    if (!response.ok) return 1010

    const data = (await response.json()) as { count?: number }
    return data?.count ?? 1010
  } catch {
    return 1010
  }
}

export const getRandomPokemonId = (maxCount: number, excludeId?: number): number => {
  let id = randomNumber(1, maxCount)
  if (excludeId && id === excludeId) id = (id % maxCount) + 1
  return id
}

export async function fetchPokemon(id: number): Promise<Pokemon> {
  const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(id)}`)
  if (!response.ok) throw new Error(`Failed to fetch pokemon: ${id}`)

  const data = (await response.json()) as PokeApiResponse
  const speciesUrl = data?.species?.url
  const species = await fetchJson<PokeSpeciesResponse>(speciesUrl)

  const isLegendary = Boolean(species?.is_legendary)
  const isMythical = Boolean(species?.is_mythical)

  return {
    id: data?.id ?? id,
    name: data?.name ?? 'unknown',
    image: mapImage(data),
    types: (data?.types ?? []).map(t => t?.type?.name).filter((t): t is string => Boolean(t)),
    height: (data?.height ?? 0) / 10,
    weight: (data?.weight ?? 0) / 10,
    baseExp: data?.base_experience ?? 0,
    stats: mapPokemonStats(data?.stats),
    abilities: (data?.abilities ?? [])
      .map(a => a?.ability?.name)
      .filter((a): a is string => Boolean(a)),
    item: getRandomItem(),
    speciesUrl: speciesUrl ?? null,
    evolutionChainUrl: species?.evolution_chain?.url ?? null,
    isGold: isLegendary || isMythical,
    isLegendary,
    isMythical,
  }
}
