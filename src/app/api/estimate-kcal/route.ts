import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGeminiModel } from '@/lib/gemini'

export async function POST(req: NextRequest) {
  const { ingredientId, name, quantity, unit } = await req.json()

  if (!ingredientId || !name) {
    return NextResponse.json({ kcal: 0 })
  }

  let kcal = 0

  try {
    const model = getGeminiModel()
    const prompt = `Estima las kilocalorías de: ${quantity ?? ''}${unit ?? ''} de ${name}.
Considera que es un ingrediente crudo para cocinar.
Responde SOLO con un número entero. Sin texto adicional.`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    const parsed = parseInt(text, 10)
    if (!isNaN(parsed)) kcal = parsed
  } catch {
    // Si Gemini falla, retorna 0
    kcal = 0
  }

  // Guardar en DB
  try {
    const supabase = await createClient()
    await supabase
      .from('ingredients')
      .update({ estimated_kcal: kcal })
      .eq('id', ingredientId)
  } catch {
    // No bloquear si falla el update
  }

  return NextResponse.json({ kcal })
}
