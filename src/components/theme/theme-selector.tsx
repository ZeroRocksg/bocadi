'use client'
import { useTheme, type Theme } from './theme-provider'

const THEMES: { id: Theme; bg: string; ring: string; label: string }[] = [
  { id: 'light', bg: '#FFFFFF', ring: '#E5E5E5', label: 'Claro' },
  { id: 'dark',  bg: '#1E1E1E', ring: '#555555', label: 'Oscuro' },
  { id: 'cyan',  bg: '#06B6D4', ring: '#0891B2', label: 'Cian' },
  { id: 'sepia', bg: '#C17A3A', ring: '#A0612E', label: 'Sepia' },
]

interface Props {
  showLabels?: boolean
}

export function ThemeSelector({ showLabels }: Props) {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-3" title="Cambiar tema">
      {THEMES.map(t => (
        <button
          key={t.id}
          onClick={() => setTheme(t.id)}
          title={t.label}
          className="flex flex-col items-center gap-1.5 group"
          aria-label={t.label}
        >
          <span
            className={`w-7 h-7 rounded-full border-2 transition-all block ${
              theme === t.id ? 'scale-125' : 'scale-100 group-hover:scale-110'
            }`}
            style={{
              backgroundColor: t.bg,
              borderColor: t.ring,
              outline: theme === t.id ? `2px solid ${t.ring}` : 'none',
              outlineOffset: '2px',
            }}
          />
          {showLabels && (
            <span className={`text-xs transition-colors ${theme === t.id ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {t.label}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
