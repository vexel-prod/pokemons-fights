import Link from 'next/link'
import { listProgressEntries } from '../../lib/progression'

export const dynamic = 'force-dynamic'

const rebirthLabel = (value: number): string => {
  if (value >= 4) return 'MAX'
  return `R${value}`
}

export default async function HubPage() {
  const entries = await listProgressEntries()

  return (
    <main className='min-h-dvh px-4 md:px-8 py-8 text-zinc-100'>
      <div className='mx-auto max-w-6xl'>
        <div className='flex items-center justify-between gap-4 mb-6'>
          <div>
            <h1 className='text-3xl font-black tracking-wider'>POKE HUB</h1>
            <p className='text-zinc-300/80 text-sm'>Прогресс покемонов по количеству боёв и перерождений</p>
          </div>
          <Link
            href='/'
            className='rounded-lg border border-zinc-300/40 px-4 py-2 text-sm hover:bg-zinc-900/40 transition-colors'
          >
            ← В арену
          </Link>
        </div>

        <div className='overflow-x-auto rounded-2xl border border-zinc-300/30 bg-zinc-900/30'>
          <table className='w-full text-sm'>
            <thead className='bg-zinc-900/50'>
              <tr className='text-left text-zinc-300/90'>
                <th className='px-4 py-3'>ID</th>
                <th className='px-4 py-3'>Форма</th>
                <th className='px-4 py-3'>Бои</th>
                <th className='px-4 py-3'>Перерождение</th>
                <th className='px-4 py-3'>Множитель</th>
                <th className='px-4 py-3'>Типы</th>
                <th className='px-4 py-3'>Статы (HP/ATK/DEF/SPD)</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td className='px-4 py-5 text-zinc-300/75' colSpan={7}>
                    Пока нет данных. Проведи несколько боёв на арене.
                  </td>
                </tr>
              )}

              {entries.map(entry => (
                <tr key={entry.pokemonId} className='border-t border-zinc-300/20'>
                  <td className='px-4 py-3 font-semibold'>#{entry.pokemonId}</td>
                  <td className='px-4 py-3'>
                    <div className='font-bold'>{entry.currentName}</div>
                    <div className='text-[11px] text-zinc-400'>{entry.baseName}</div>
                  </td>
                  <td className='px-4 py-3'>{entry.battles}</td>
                  <td className='px-4 py-3'>
                    <span className='rounded-md border border-amber-300/50 px-2 py-1 text-xs text-amber-200'>
                      {rebirthLabel(entry.rebirthLevel)}
                    </span>
                  </td>
                  <td className='px-4 py-3'>x{entry.powerMultiplier.toFixed(2)}</td>
                  <td className='px-4 py-3'>{entry.types.join(', ') || '—'}</td>
                  <td className='px-4 py-3'>
                    {entry.scaledStats.hp}/{entry.scaledStats.attack}/{entry.scaledStats.defense}/{entry.scaledStats.speed}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
