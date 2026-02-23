import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Leer .env.local manualmente
const envPath = join(__dirname, '..', '.env.local')
const env = {}
readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  if (line.includes('=') && !line.startsWith('#')) {
    const [k, ...v] = line.split('=')
    env[k.trim()] = v.join('=').trim()
  }
})

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL']
const serviceRoleKey = env['SUPABASE_SERVICE_ROLE_KEY']

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

  const { data: workspaces, error: wsError } = await supabase
    .from('workspaces')
    .select('id, name')
    .limit(1)

  if (wsError) {
    console.error('Error obteniendo workspaces:', wsError.message)
    console.log('\n⚠️  Asegúrate de que las tablas existen y RLS está configurado.')
    process.exit(1)
  }

  if (!workspaces || workspaces.length === 0) {
    console.log('⚠️  No hay workspaces aún.')
    console.log('   Registra un usuario en /login para crear el workspace personal automáticamente.')
    console.log('   Luego vuelve a ejecutar este seed.')
    process.exit(0)
  }

  const workspace = workspaces[0]
  console.log(`✅ Workspace encontrado: "${workspace.name}" (${workspace.id})\n`)

  for (const pt of DEFAULT_PROTEIN_TYPES) {
    const { error } = await supabase
      .from('protein_types')
      .insert({ ...pt, workspace_id: workspace.id })

    if (error && error.code !== '23505') { // 23505 = unique_violation (ya existe)
      console.error(`  ❌ Error insertando "${pt.name}":`, error.message)
    } else {
      console.log(`  ✅ ${pt.name}  ${pt.color}`)
    }
  }

  console.log('\n🎉 Seed completado.')
}

seed()
