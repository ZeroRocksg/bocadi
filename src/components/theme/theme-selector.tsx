'use client'
import { useTheme, type Theme } from './theme-provider'

const THEMES: { id: Theme; bg: string; ring: string; label: string }[] = [
  { id: 'light', bg: '#FFFFFF', ring: '#E5E5E5', label: 'Claro' },
  { id: 'dark',  bg: '#1E1E1E', ring: '#555555', label: 'Oscuro' },
  { id: 'cyan',  bg: '#06B6D4', ring: '#0891B2', label: 'Cian' },
  { id: 'sepia', bg: '#C17A3A', ring: '#A0612E', label: 'Sepia' },
]

export function ThemeSelector() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1.5" title="Cambiar tema">
      {THEMES.map(t => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          title={t.label}
          className={`w-5 h-5 rounded-full border-2 transition-transform ${
            theme === t.id ? 'scale-125' : 'scale-100 hover:scale-110'
          }`}
          style={{
            backgroundColor: t.bg,
            borderColor: t.ring,
            outline: theme === t.id ? `2px solid ${t.ring}` : 'none',
            outlineOffset: '1px',
          }}
          aria-label={t.label}
        />
      ))}
    </div>
  )
}
