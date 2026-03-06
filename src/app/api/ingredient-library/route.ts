import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ')
}

const supabase = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET: buscar ingredientes por nombre
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ results: [] })

  const { data } = await supabase()
    .from('ingredient_library')
    .select('id, name, kcal, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, vitamin_c_mg, vitamin_d_ui, calcium_mg, iron_mg, potassium_mg')
    .ilike('name_normalized', `%${normalizeName(q)}%`)
    .limit(8)

  return NextResponse.json({ results: data ?? [] })
}

// POST: agregar nuevo ingrediente a la biblioteca
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, kcal, protein_g, carbs_g, fat_g, fiber_g, sodium_mg, vitamin_c_mg, vitamin_d_ui, calcium_mg, iron_mg, potassium_mg, created_by } = body

  if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })

  const name_normalized = normalizeName(name)

  // Verificar si ya existe
  const { data: existing } = await supabase()
    .from('ingredient_library')
    .select('id, name')
    .eq('name_normalized', name_normalized)
    .single()

  if (existing) return NextResponse.json({ error: 'Ya existe', existing }, { status: 409 })

  const { data, error } = await supabase()
    .from('ingredient_library')
    .insert({ name, name_normalized, kcal: kcal ?? 0, protein_g: protein_g ?? 0, carbs_g: carbs_g ?? 0, fat_g: fat_g ?? 0, fiber_g: fiber_g ?? 0, sodium_mg: sodium_mg ?? 0, vitamin_c_mg: vitamin_c_mg ?? 0, vitamin_d_ui: vitamin_d_ui ?? 0, calcium_mg: calcium_mg ?? 0, iron_mg: iron_mg ?? 0, potassium_mg: potassium_mg ?? 0, created_by: created_by ?? null })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}