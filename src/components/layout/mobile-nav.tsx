'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/planner',   label: 'Planificador', icon: '📅' },
  { href: '/catalog',   label: 'Catálogo',     icon: '📚' },
  { href: '/workspace', label: 'Workspace',    icon: '⚙️' },
]

export function MobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t sm:hidden z-40">
      <div className="flex">
        {links.map(link => {
          const active = pathname.startsWith(link.href)
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
                active ? 'text-zinc-900 font-semibold' : 'text-zinc-400'
              }`}
            >
              <span className="text-xl leading-none">{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
