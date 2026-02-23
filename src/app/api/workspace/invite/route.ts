import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, workspaceId } = await request.json()

  if (!email || !workspaceId) {
    return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
  }

  // Verificar que el usuario que invita es owner
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, owner_id')
    .eq('id', workspaceId)
    .single()

  if (!workspace || workspace.owner_id !== user.id) {
    return NextResponse.json({ error: 'Solo el propietario puede invitar miembros' }, { status: 403 })
  }

  // Buscar usuario por email con service role
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: users, error: listError } = await adminClient.auth.admin.listUsers()
  if (listError) return NextResponse.json({ error: 'Error buscando usuario' }, { status: 500 })

  const target = users.users.find(u => u.email === email)
  if (!target) {
    return NextResponse.json(
      { error: 'No existe un usuario con ese email. Deben registrarse primero.' },
      { status: 404 }
    )
  }

  // Agregar al workspace
  const { error: insertError } = await adminClient
    .from('workspace_members')
    .upsert({ workspace_id: workspaceId, user_id: target.id, role: 'member' })

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
