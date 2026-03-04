import { useEffect, useState, type Dispatch, type SetStateAction } from 'react'
import type { Pokemon } from '../types/battle'
import { getSpeciesCount } from '../api/poke'

interface UsePokemonResult {
  count: number | null
  champ: Pokemon | null
  challenger: Pokemon | null
  setChamp: Dispatch<SetStateAction<Pokemon | null>>
  setChallenger: Dispatch<SetStateAction<Pokemon | null>>
}

export function usePokemon(): UsePokemonResult {
  const [count, setCount] = useState<number | null>(null)
  const [champ, setChamp] = useState<Pokemon | null>(null)
  const [challenger, setChallenger] = useState<Pokemon | null>(null)

  useEffect(() => {
    let isMounted = true

    getSpeciesCount().then(value => {
      if (isMounted) setCount(value)
    })

    return () => {
      isMounted = false
    }
  }, [])

  return {
    count,
    champ,
    challenger,
    setChamp,
    setChallenger,
  }
}
