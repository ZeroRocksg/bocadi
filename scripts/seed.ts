/**
 * Script de seed — inserta protein_types de prueba
 * Ejecutar DESPUÉS de correr las migraciones SQL.
 *
 * Uso: npx ts-node scripts/seed.ts
 * O:   node --loader ts-node/esm scripts/seed.ts
 */
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Cargar .env.local
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Faltan variables de entorno. Verifica .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

const DEFAULT_PROTEIN_TYPES = [
  { name: 'Pollo',   color: '#F5A623' },
  { name: 'Res',     color: '#C0392B' },
  { name: 'Pescado', color: '#2980B9' },
  { name: 'Vegano',  color: '#27AE60' },
  { name: 'Cerdo',   color: '#8E44AD' },
]

async function seed() {
  console.log('🌱 Iniciando seed de protein_types...\n')

  // Buscar el primer workspace disponible (workspace de prueba)
  const { data: workspaces, error: wsError } = await supabase
    .from('workspaces')
    .select('id, name')
    .limit(1)

  if (wsError) {
    console.error('Error obteniendo workspaces:', wsError.message)
    console.log('\n⚠️  Asegúrate de haber ejecutado las migraciones SQL primero.')
    console.log('   Y de que exista al menos un usuario registrado (para crear el workspace).')
    process.exit(1)
  }

  if (!workspaces || workspaces.length === 0) {
    console.log('⚠️  No hay workspaces. Registra un usuario primero para crear el workspace personal.')
    process.exit(0)
  }

  const workspace = workspaces[0]
  console.log(`✅ Workspace encontrado: "${workspace.name}" (${workspace.id})\n`)

  for (const pt of DEFAULT_PROTEIN_TYPES) {
    const { error } = await supabase
      .from('protein_types')
      .upsert(
        { ...pt, workspace_id: workspace.id },
        { onConflict: 'workspace_id,name', ignoreDuplicates: true }
      )

    if (error) {
      console.error(`  ❌ Error insertando "${pt.name}":`, error.message)
    } else {
      console.log(`  ✅ ${pt.name} (${pt.color})`)
    }
  }

  console.log('\n🎉 Seed completado.')
}

seed()
