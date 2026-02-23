import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProteinTypeManager } from '@/components/workspace/protein-type-manager'
import { Button } from '@/components/ui/button'

export default async function WorkspaceSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Obtener workspace activo
  const { data: memberRow } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(id, name)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!memberRow) redirect('/workspace')

  const workspace = memberRow.workspaces as unknown as { id: string; name: string }

  // Obtener tipos de proteína
  const { data: proteinTypes } = await supabase
    .from('protein_types')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('created_at')

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/workspace">← Volver</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p className="text-sm text-zinc-500">{workspace.name}</p>
        </div>
      </div>

      <ProteinTypeManager
        workspaceId={workspace.id}
        proteinTypes={proteinTypes ?? []}
      />
    </div>
  )
}
