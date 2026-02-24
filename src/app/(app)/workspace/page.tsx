import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { MembersPanel } from '@/components/workspace/members-panel'
import { Button } from '@/components/ui/button'

export default async function WorkspacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Obtener workspace activo
  const { data: memberRow } = await supabase
    .from('workspace_members')
    .select('workspace_id, role, workspaces(id, name, owner_id, created_at)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!memberRow) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        No perteneces a ningún workspace.
      </div>
    )
  }

  const workspace = memberRow.workspaces as unknown as { id: string; name: string; owner_id: string; created_at: string }

  // Obtener todos los miembros
  const { data: members } = await supabase
    .from('workspace_members')
    .select('workspace_id, user_id, role')
    .eq('workspace_id', workspace.id)

  // Obtener emails vía Admin API (server-side con service role)
  const membersWithEmail = (members ?? []).map(m => ({
    ...m,
    email: m.user_id === user.id ? user.email : undefined,
  }))

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{workspace.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestión del workspace</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/workspace/settings">Configuración</Link>
        </Button>
      </div>

      <MembersPanel
        workspace={workspace}
        members={membersWithEmail}
        currentUserId={user.id}
      />
    </div>
  )
}
