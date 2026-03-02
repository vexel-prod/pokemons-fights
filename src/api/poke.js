export function randomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export async function getSpeciesCount() {
  try {
    const r = await fetch('https://pokeapi.co/api/v2/pokemon-species?limit=0')
    const data = await r.json()
    return data?.count ?? 1010
  } catch {
    return 1010
  }
}

async function fetchPokemonSpeciesByName(name) {
  if (!name) return null
  try {
    const r = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${encodeURIComponent(name)}`)
    if (!r.ok) return null
    return await r.json()
  } catch {
    return null
  }
}

export async function fetchPokemon(id) {
  const r = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
  const data = await r.json()

  const image =
    data?.sprites?.other?.['official-artwork']?.front_default || data?.sprites?.front_default || ''

  const statsObj = (data?.stats ?? []).reduce((acc, s) => {
    acc[s?.stat?.name] = s?.base_stat ?? 0
    return acc
  }, {})

  const name = data?.name ?? 'unknown'

  const species = await fetchPokemonSpeciesByName(name)
  const isGold = Boolean(species?.is_legendary || species?.is_mythical)

  return {
    id: data?.id,
    name,
    image,
    types: (data?.types ?? []).map(t => t?.type?.name).filter(Boolean),
    height: (data?.height ?? 0) / 10,
    weight: (data?.weight ?? 0) / 10,
    baseExp: data?.base_experience ?? 0,
    stats: statsObj,
    abilities: (data?.abilities ?? []).map(a => a?.ability?.name).filter(Boolean),
    isGold,
    isLegendary: Boolean(species?.is_legendary),
    isMythical: Boolean(species?.is_mythical),
  }
}
