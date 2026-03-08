import { NextResponse } from 'next/server'
import { recordBattleForPokemon } from '../../../lib/progression'

interface BattleResultBody {
  pokemonIds?: number[]
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BattleResultBody
    const ids = Array.from(
      new Set((body.pokemonIds ?? []).map(value => Number(value)).filter(value => Number.isInteger(value) && value > 0)),
    )

    if (!ids.length) {
      return NextResponse.json({ ok: false, error: 'pokemonIds is required' }, { status: 400 })
    }

    const updates = await Promise.all(ids.map(id => recordBattleForPokemon(id)))
    return NextResponse.json({ ok: true, updates })
  } catch (error) {
    console.error('battle-result error', error)
    return NextResponse.json({ ok: false, error: 'Failed to save battle result' }, { status: 500 })
  }
}
