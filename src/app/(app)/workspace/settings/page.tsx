import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ProteinTypeManager } from '@/components/workspace/protein-type-manager'
import { NutritionistProfileForm } from '@/components/workspace/nutritionist-profile-form'
import { ThemeSelector } from '@/components/theme/theme-selector'
import { Button } from '@/components/ui/button'

export default async function WorkspaceSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberRow } = await supabase
    .from('workspace_members')
    .select('workspace_id, workspaces(id, name)')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!memberRow) redirect('/workspace')

  const workspace = memberRow.workspaces as unknown as { id: string; name: string }

  const { data: proteinTypes } = await supabase
    .from('protein_types')
    .select('*')
    .eq('workspace_id', workspace.id)
    .order('created_at')

  const { data: nutritionistProfile } = await supabase
    .from('nutritionist_profile')
    .select('name, license_number, logo_url')
    .eq('workspace_id', workspace.id)
    .maybeSingle()

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/workspace">← Volver</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p className="text-sm text-muted-foreground">{workspace.name}</p>
        </div>
      </div>

      {/* Apariencia */}
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Apariencia</h2>
        <div className="bg-card border rounded-lg px-4 py-4 space-y-3">
          <p className="text-sm text-muted-foreground">Selecciona el tema visual de la aplicación:</p>
          <div className="flex items-center gap-4">
            <ThemeSelector showLabels />
          </div>
        </div>
      </div>

      {/* Tipos de proteína */}
      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Tipos de proteína</h2>
        <ProteinTypeManager
          workspaceId={workspace.id}
          proteinTypes={proteinTypes ?? []}
        />
      </div>

      {/* Perfil del nutricionista */}
      <div className="space-y-3">
        <div>
          <h2 className="font-semibold text-lg">Perfil del Nutricionista</h2>
          <p className="text-sm text-muted-foreground">Información que aparecerá en los reportes PDF generados.</p>
        </div>
        <NutritionistProfileForm
          workspaceId={workspace.id}
          initial={nutritionistProfile ?? null}
        />
      </div>
    </div>
  )
}
