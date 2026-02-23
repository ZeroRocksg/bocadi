import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from './sign-out-button'

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
    <header className="border-b bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo + workspace */}
        <div className="flex items-center gap-4">
          <Link href="/planner" className="font-bold text-lg">
            🍽️ Bocadi
          </Link>
          {workspace && (
            <Link
              href="/workspace"
              className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors"
            >
              {workspace.name}
            </Link>
          )}
        </div>

        {/* Nav links */}
        <nav className="hidden sm:flex items-center gap-1">
          <Link
            href="/planner"
            className="px-3 py-1.5 text-sm rounded-md hover:bg-zinc-100 transition-colors"
          >
            Planificador
          </Link>
          <Link
            href="/catalog"
            className="px-3 py-1.5 text-sm rounded-md hover:bg-zinc-100 transition-colors"
          >
            Catálogo
          </Link>
        </nav>

        {/* Usuario + sign out */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-zinc-500 hidden sm:block">
            {user?.email}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  )
}
