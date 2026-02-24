'use client'
import { createContext, useContext, useState } from 'react'

export type Theme = 'light' | 'dark' | 'cyan' | 'sepia'

const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: 'light',
  setTheme: () => {},
})

export function ThemeProvider({
  children,
  defaultTheme,
}: {
  children: React.ReactNode
  defaultTheme: Theme
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme)

  function setTheme(t: Theme) {
    setThemeState(t)
    localStorage.setItem('bocadi-theme', t)
    document.cookie = `bocadi-theme=${t};path=/;max-age=31536000`
    document.documentElement.dataset.theme = t
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
