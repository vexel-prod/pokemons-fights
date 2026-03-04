import { useEffect, type Dispatch, type RefObject, type SetStateAction } from 'react'
import type { LogEntry, LogTone } from '../../types/battle'
import { isBattleHeaderText } from '../../utils/helpers'

interface BattleLogProps {
  pageItems: LogEntry[]
  totalPages: number
  page: number
  setPage: Dispatch<SetStateAction<number>>
  logScrollRef: RefObject<HTMLDivElement | null>
  toneClass: (tone: LogTone) => string
  isFighting: boolean
}

export function BattleLog({
  pageItems,
  totalPages,
  page,
  setPage,
  logScrollRef,
  toneClass,
  isFighting,
}: BattleLogProps) {
  useEffect(() => {
    const element = logScrollRef.current
    if (!element) return

    requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight
    })
  }, [pageItems.length, logScrollRef])

  useEffect(() => {
    if (isFighting && page !== totalPages) {
      setPage(totalPages)
    }
  }, [isFighting, page, totalPages, setPage])

  const handlePrevPage = () => setPage(prev => Math.max(1, prev - 1))
  const handleNextPage = () => setPage(prev => Math.min(totalPages, prev + 1))
  const handleJumpToLast = () => setPage(totalPages)

  return (
    <div className='flex flex-col flex-1 min-h-0'>
      <div
        ref={logScrollRef}
        className='no-scrollbar text-[11px] opacity-90 whitespace-pre-wrap leading-4 overflow-y-auto p-2.5 space-y-1.5 scroll-smooth overscroll-contain rounded-xl border border-zinc-400/30 flex-1 min-h-0'
        style={{ minHeight: '0px' }}
      >
        {pageItems.length ? (
          pageItems.map((entry, idx) => {
            const headerLike = isBattleHeaderText(entry.text)
            const tone = headerLike ? 'header' : entry.tone
            return (
              <div
                key={entry.id}
                className={`border p-1.5 rounded-lg ${toneClass(tone)} ${headerLike ? 'mt-2.5 first:mt-0' : ''}`}
                data-i={idx}
              >
                {entry.text}
              </div>
            )
          })
        ) : (
          <div className='text-center opacity-50 py-8'>
            <div className='text-2xl mb-2'>📜</div>
            <div>Лог пуст</div>
            <div className='text-xs opacity-60 mt-1'>Начните бой чтобы увидеть события</div>
          </div>
        )}
      </div>

      <div className='flex items-center justify-between mt-3 pt-3 border-t border-zinc-400/30 shrink-0'>
        <div className='flex items-center gap-2'>
          <button
            onClick={handlePrevPage}
            disabled={page === 1}
            className='px-3 py-1 text-xs rounded border border-zinc-400/50 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700/30 transition'
            title='Предыдущая страница'
          >
            ←
          </button>

          <div className='text-xs opacity-80 tabular-nums min-w-20 text-center'>
            Стр. {page} из {totalPages}
          </div>

          <button
            onClick={handleNextPage}
            disabled={page === totalPages}
            className='px-3 py-1 text-xs rounded border border-zinc-400/50 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700/30 transition'
            title='Следующая страница'
          >
            →
          </button>
        </div>

        <button
          onClick={handleJumpToLast}
          disabled={page === totalPages}
          className='px-3 py-1 text-xs rounded border border-zinc-400/50 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700/30 transition'
          title='Перейти к последним событиям'
        >
          К концу
        </button>
      </div>
    </div>
  )
}
