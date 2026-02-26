import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { getAIClient } from '@/lib/gemini'

interface IngredientInput {
  id: string
  name: string
  quantity: number | null
  unit: string | null
  forceRecalc?: boolean
}

interface NutritionValues {
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  sodium_mg: number
  vitamin_c_mg: number
  vitamin_d_ui: number
  calcium_mg: number
  iron_mg: number
  potassium_mg: number
}

const UNIT_MAP: Record<string, string> = {
  gramo: 'g', gramos: 'g', gr: 'g', grs: 'g',
  kilogramo: 'kg', kilogramos: 'kg', kilo: 'kg', kilos: 'kg',
  mililitro: 'ml', mililitros: 'ml', mililiter: 'ml',
  litro: 'l', litros: 'l',
  cucharada: 'cda', cucharadas: 'cda', tbsp: 'cda',
  cucharadita: 'cdta', cucharaditas: 'cdta', tsp: 'cdta',
  taza: 'taza', tazas: 'taza', cup: 'taza',
  unidad: 'u', unidades: 'u', pieza: 'u', piezas: 'u',
}

function normalizeUnit(unit: string | null): string {
  if (!unit) return 'u'
  const lower = unit.toLowerCase().trim()
  return UNIT_MAP[lower] ?? lower
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, '_')
}

function buildCacheKey(name: string, quantity: number | null, unit: string | null): string {
  return `${normalizeName(name)}_${quantity ?? 0}_${normalizeUnit(unit)}`
}

function safeNum(val: unknown): number {
  const n = Number(val)
  return isFinite(n) && n >= 0 ? n : 0
}

function zeroNutrition(): NutritionValues {
  return { kcal: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, sodium_mg: 0, vitamin_c_mg: 0, vitamin_d_ui: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0 }
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const ingredients: IngredientInput[] = Array.isArray(body)
    ? body
    : [{ id: body.ingredientId, name: body.name, quantity: body.quantity, unit: body.unit, forceRecalc: body.forceRecalc }]

  const valid = ingredients.filter(i => i.id && i.name)
  if (valid.length === 0) return NextResponse.json({ results: [] })

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Separar los que van a caché vs los que van a Groq
  const cacheKeys = valid.map(i => buildCacheKey(i.name, i.quantity, i.unit))
  const nutritionMap: Record<string, NutritionValues> = {}

  // Buscar en caché (solo si no es forceRecalc)
  const toFetchFromCache = valid.filter((_, idx) => !valid[idx].forceRecalc)
  const cacheKeysToCheck = toFetchFromCache.map((_, idx) => cacheKeys[valid.indexOf(toFetchFromCache[idx])])

  if (cacheKeysToCheck.length > 0) {
    const { data: cached } = await supabase
      .from('nutrition_cache')
      .select('*')
      .in('cache_key', cacheKeysToCheck)

    if (cached) {
      for (const row of cached) {
        nutritionMap[row.cache_key] = {
          kcal: row.kcal, protein_g: row.protein_g, carbs_g: row.carbs_g, fat_g: row.fat_g,
          fiber_g: row.fiber_g, sodium_mg: row.sodium_mg, vitamin_c_mg: row.vitamin_c_mg,
          vitamin_d_ui: row.vitamin_d_ui, calcium_mg: row.calcium_mg, iron_mg: row.iron_mg,
          potassium_mg: row.potassium_mg,
        }
      }
    }
  }

  // Determinar cuáles necesitan llamar a Groq
  const needGroq = valid.filter((ing, idx) => !nutritionMap[cacheKeys[idx]])

  if (needGroq.length > 0) {
    const prompt = `Nutrition data for ${needGroq.length} ingredient(s). Respond ONLY with a JSON array, no text, no markdown.
Each object must have exactly these keys (numbers only, 0 if unknown):
{"kcal":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0,"sodium_mg":0,"vitamin_c_mg":0,"vitamin_d_ui":0,"calcium_mg":0,"iron_mg":0,"potassium_mg":0}
Ingredients:
${needGroq.map((i, idx) => `${idx + 1}. ${i.quantity ?? ''}${i.unit ?? ''} ${i.name}`).join('\n')}`

    try {
      const client = getAIClient()
      const completion = await client.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: needGroq.length * 80,
        temperature: 0,
      })

      const raw = completion.choices[0]?.message?.content?.trim() ?? '[]'
      const jsonStr = raw.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim()
      const parsed: unknown[] = JSON.parse(jsonStr)

      for (let i = 0; i < needGroq.length; i++) {
        const ing = needGroq[i]
        const values = (parsed[i] ?? {}) as Record<string, unknown>
        const nutrition: NutritionValues = {
          kcal: safeNum(values.kcal),
          protein_g: safeNum(values.protein_g),
          carbs_g: safeNum(values.carbs_g),
          fat_g: safeNum(values.fat_g),
          fiber_g: safeNum(values.fiber_g),
          sodium_mg: safeNum(values.sodium_mg),
          vitamin_c_mg: safeNum(values.vitamin_c_mg),
          vitamin_d_ui: safeNum(values.vitamin_d_ui),
          calcium_mg: safeNum(values.calcium_mg),
          iron_mg: safeNum(values.iron_mg),
          potassium_mg: safeNum(values.potassium_mg),
        }
        const key = buildCacheKey(ing.name, ing.quantity, ing.unit)
        nutritionMap[key] = nutrition

        // Guardar en caché
        await supabase.from('nutrition_cache').upsert({ cache_key: key, ...nutrition }, { onConflict: 'cache_key' })
      }
    } catch (err) {
      console.error('[estimate-kcal] Groq error:', err)
      // Poner ceros para los que fallaron
      for (const ing of needGroq) {
        nutritionMap[buildCacheKey(ing.name, ing.quantity, ing.unit)] = zeroNutrition()
      }
    }
  }

  // Actualizar ingredients en Supabase y devolver resultados
  const results = await Promise.all(
    valid.map(async (ing, idx) => {
      const nutrition = nutritionMap[cacheKeys[idx]] ?? zeroNutrition()
      await supabase
        .from('ingredients')
        .update({ estimated_kcal: nutrition.kcal, ...nutrition })
        .eq('id', ing.id)
      return { id: ing.id, ...nutrition }
    })
  )

  return NextResponse.json({ results })
}
