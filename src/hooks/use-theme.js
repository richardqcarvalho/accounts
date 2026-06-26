import { useEffect, useState } from 'react'

const STORAGE_KEY = 'theme'
const prefersDark = () =>
  window.matchMedia('(prefers-color-scheme: dark)').matches
const resolve = (theme) =>
  theme === 'dark' || (theme === 'system' && prefersDark()) ? 'dark' : 'light'

// Gerencia o tema 'light' | 'dark' | 'system' (default 'system'), persiste a
// escolha e aplica a classe `dark` no <html>. Expõe `resolvedTheme` (light/dark
// efetivo) e acompanha mudanças do sistema enquanto estiver em 'system'.
export function useTheme() {
  const stored = () => localStorage.getItem(STORAGE_KEY) ?? 'system'
  const [theme, setThemeState] = useState(stored)
  const [resolvedTheme, setResolvedTheme] = useState(() => resolve(stored()))

  useEffect(() => {
    const apply = () => {
      const next = resolve(theme)
      document.documentElement.classList.toggle('dark', next === 'dark')
      setResolvedTheme(next)
    }
    apply()
    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [theme])

  function setTheme(next) {
    localStorage.setItem(STORAGE_KEY, next)
    setThemeState(next)
  }

  return { theme, resolvedTheme, setTheme }
}
