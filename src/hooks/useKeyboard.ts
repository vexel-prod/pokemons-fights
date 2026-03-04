import { useEffect, type Dispatch, type SetStateAction } from 'react'

interface KeyboardOptions {
  isFighting: boolean
  onShield: () => void
  onHeal: () => void
  onCounter: () => void
  onMega: () => void
  canMega: boolean
  megaUsed: boolean
  setPressedKey: Dispatch<SetStateAction<string | null>>
}

export function useKeyboard({
  isFighting,
  onShield,
  onHeal,
  onCounter,
  onMega,
  canMega,
  megaUsed,
  setPressedKey,
}: KeyboardOptions): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName
      if (!isFighting || activeTag === 'INPUT' || activeTag === 'TEXTAREA') return

      let keyName: string | null = null

      if (event.key === '1' || event.key === 'q' || event.key === 'Q' || event.key === 'к') {
        event.preventDefault()
        keyName = 'shield'
        onShield()
      }
      if (event.key === '2' || event.key === 'w' || event.key === 'W' || event.key === 'ц') {
        event.preventDefault()
        keyName = 'heal'
        onHeal()
      }
      if (event.key === '3' || event.key === 'e' || event.key === 'E' || event.key === 'у') {
        event.preventDefault()
        keyName = 'counter'
        onCounter()
      }
      if (event.key === 'm' || event.key === 'M' || event.key === ' ' || event.key === 'ь') {
        event.preventDefault()
        keyName = 'mega'
        if (canMega && !megaUsed) onMega()
      }

      if (keyName) {
        setPressedKey(keyName)
        window.setTimeout(() => setPressedKey(null), 150)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFighting, canMega, megaUsed, onShield, onHeal, onCounter, onMega, setPressedKey])
}
