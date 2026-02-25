'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface Props {
  userEmail?: string
  workspaceName?: string
}

export function NavMenuToggle({ userEmail, workspaceName }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="sm:hidden relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="p-2 rounded-md hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
        aria-label="Menú"
      >
        {open ? '✕' : '☰'}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-card border rounded-lg shadow-lg py-2 min-w-48 z-50">
          <Link
            href="/planner"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-colors"
          >
            📅 Planificador
          </Link>
          <Link
            href="/catalog"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-colors"
          >
            📚 Catálogo
          </Link>
          <Link
            href="/workspace"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-colors"
          >
            🏢 Workspace
          </Link>
          <Link
            href="/workspace/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-accent transition-colors"
          >
            ⚙️ Configuración
          </Link>
          {(workspaceName || userEmail) && (
            <div className="border-t mt-2 pt-2 px-4">
              {workspaceName && <p className="text-xs text-muted-foreground">{workspaceName}</p>}
              {userEmail && <p className="text-xs text-muted-foreground truncate">{userEmail}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
