import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WeekPlanner } from '@/components/planner/week-planner'
import type { Dish } from '@/lib/types'

export default async function PlannerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Workspace activo
  const { data: memberRow } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (!memberRow) {
    return (
      <div className="text-center py-16 text-zinc-400">
        No perteneces a ningún workspace.
      </div>
    )
  }

  const workspaceId = memberRow.workspace_id

  // Platos con proteína e ingredientes (para cálculo de costos)
  const { data: dishes } = await supabase
    .from('dishes')
    .select('*, protein_type:protein_types(*), ingredients(*)')
    .eq('workspace_id', workspaceId)
    .order('name')

  return (
    <WeekPlanner
      workspaceId={workspaceId}
      dishes={(dishes as Dish[]) ?? []}
    />
  )
}
