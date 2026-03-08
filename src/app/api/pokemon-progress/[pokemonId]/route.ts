import { NextResponse } from 'next/server'
import { getProgressByPokemonId } from '../../../../lib/progression'

interface Params {
  params: Promise<{ pokemonId: string }>
}

export async function GET(_request: Request, { params }: Params) {
  const resolved = await params
  const pokemonId = Number(resolved.pokemonId)
  if (!Number.isInteger(pokemonId) || pokemonId <= 0) {
    return NextResponse.json({ ok: false, error: 'Invalid pokemonId' }, { status: 400 })
  }

  const progress = await getProgressByPokemonId(pokemonId)
  return NextResponse.json({ ok: true, progress })
}
