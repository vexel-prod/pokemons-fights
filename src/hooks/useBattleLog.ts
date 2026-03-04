import { useCallback, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { LogEntry, LogTone } from '../types/battle'
import { clamp } from '../utils/helpers'

interface UseBattleLogResult {
  log: LogEntry[]
  page: number
  totalPages: number
  pageItems: LogEntry[]
  setPage: Dispatch<SetStateAction<number>>
  appendLog: (text: string, tone?: LogTone) => void
  clearLog: () => void
  logScrollRef: React.RefObject<HTMLDivElement | null>
}

export function useBattleLog(logsPerPage = 10): UseBattleLogResult {
  const [log, setLog] = useState<LogEntry[]>([])
  const [page, setPage] = useState(1)
  const logScrollRef = useRef<HTMLDivElement | null>(null)

  const appendLog = useCallback((text: string, tone: LogTone = 'default') => {
    setLog(prev => [
      ...prev,
      {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        text,
        tone,
      },
    ])
  }, [])

  const clearLog = useCallback(() => {
    setLog([])
    setPage(1)
  }, [])

  const totalPages = Math.max(1, Math.ceil(log.length / logsPerPage))
  const normalizedPage = clamp(page, 1, totalPages)
  const pageItems = log.slice((normalizedPage - 1) * logsPerPage, normalizedPage * logsPerPage)

  return {
    log,
    page: normalizedPage,
    totalPages,
    pageItems,
    setPage,
    appendLog,
    clearLog,
    logScrollRef,
  }
}
