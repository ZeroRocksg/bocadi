import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from './sign-out-button'
import { ThemeSelector } from '@/components/theme/theme-selector'

export async function Navbar() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // Obtener workspace activo (primero al que pertenece el usuario)
  const { data: memberRows } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(id, name)')
    .eq('user_id', user?.id ?? '')
    .limit(1)
    .single()

  const workspace = memberRows?.workspaces as unknown as { id: string; name: string } | null

  return (
    <header className="border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo + workspace */}
        <div className="flex items-center gap-4">
          <Link href="/planner" className="font-bold text-lg">
            🍽️ Bocadi
          </Link>
          {workspace && (
            <Link
              href="/workspace"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {workspace.name}
            </Link>
          )}
        </div>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-1">
          <Link
            href="/planner"
            className="px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors"
          >
            Planificador
          </Link>
          <Link
            href="/catalog"
            className="px-3 py-1.5 text-sm rounded-md hover:bg-accent transition-colors"
          >
            Catálogo
          </Link>
        </nav>

        {/* ThemeSelector + usuario + sign out */}
        <div className="flex items-center gap-3">
          <ThemeSelector />
          <span className="text-sm text-muted-foreground hidden sm:block">
            {user?.email}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}
