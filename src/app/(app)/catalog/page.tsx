import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DishCatalog } from '@/components/catalog/dish-catalog'
import type { Dish } from '@/lib/types'

export default async function CatalogPage() {
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
    return <div className="text-center py-16 text-zinc-400">No perteneces a ningún workspace.</div>
  }

  const workspaceId = memberRow.workspace_id

  // Platos con proteína e ingredientes
  const { data: dishes } = await supabase
    .from('dishes')
    .select(`
      *,
      protein_type:protein_types(*),
      ingredients(*)
    `)
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  // Tipos de proteína
  const { data: proteinTypes } = await supabase
    .from('protein_types')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('name')

  return (
    <DishCatalog
      workspaceId={workspaceId}
      dishes={(dishes as Dish[]) ?? []}
      proteinTypes={proteinTypes ?? []}
    />
  )
}
