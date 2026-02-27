'use client'

import { useState, Fragment } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Dish, ProteinType, IngredientFormData } from '@/lib/types'

interface Props {
  workspaceId: string
  proteinTypes: ProteinType[]
  dish?: Dish
  onSave: () => void
  onCancel: () => void
}

const emptyIngredient = (): IngredientFormData => ({
  name: '',
  quantity: null,
  unit: 'gr',
  estimated_cost: 0,
  estimated_kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
})

export function DishForm({ workspaceId, proteinTypes, dish, onSave, onCancel }: Props) {
  const supabase = createClient()
  const [name, setName] = useState(dish?.name ?? '')
  const [description, setDescription] = useState(dish?.description ?? '')
  const [proteinTypeId, setProteinTypeId] = useState(dish?.protein_type_id ?? '')
  const [ingredients, setIngredients] = useState<IngredientFormData[]>(
    dish?.ingredients?.length
      ? dish.ingredients.map(i => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          unit: i.unit ?? '',
          estimated_cost: i.estimated_cost,
          estimated_kcal: i.estimated_kcal ?? 0,
          protein_g: i.protein_g ?? 0,
          carbs_g: i.carbs_g ?? 0,
          fat_g: i.fat_g ?? 0,
        }))
      : [emptyIngredient()]
  )
  const [loading, setLoading] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const [recalculating, setRecalculating] = useState<Set<number>>(new Set())
  const [error, setError] = useState('')

  const totalCost = ingredients.reduce((sum, i) => sum + (Number(i.estimated_cost) || 0), 0)
  const totalKcal = ingredients.reduce((sum, i) => sum + (Number(i.estimated_kcal) || 0), 0)
  const totalProtein = ingredients.reduce((sum, i) => sum + (Number(i.protein_g) || 0), 0)
  const totalCarbs = ingredients.reduce((sum, i) => sum + (Number(i.carbs_g) || 0), 0)
  const totalFat = ingredients.reduce((sum, i) => sum + (Number(i.fat_g) || 0), 0)

  function updateIngredient(index: number, field: keyof IngredientFormData, value: string | number | null) {
    setIngredients(prev =>
      prev.map((ing, i) => (i === index ? { ...ing, [field]: value } : ing))
    )
  }

  function addIngredient() {
    setIngredients(prev => [...prev, emptyIngredient()])
  }

  function removeIngredient(index: number) {
    setIngredients(prev => prev.filter((_, i) => i !== index))
  }

  async function callEstimateAPI(savedIngredients: { id: string; name: string; quantity: number | null; unit: string | null; estimated_kcal?: number }[], forceRecalc = false) {
    const toEstimate = forceRecalc
      ? savedIngredients
      : savedIngredients.filter(i => !i.estimated_kcal)
    if (!toEstimate.length) return []

    const resp = await fetch('/api/estimate-kcal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toEstimate.map(ing => ({
        id: ing.id,
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        forceRecalc,
      }))),
    })
    const data = await resp.json()
    return data.results ?? []
  }

  async function handleRecalculate(index: number) {
    const ing = ingredients[index]
    console.log('[recalculate] ing:', ing)
    if (!ing.id || !ing.name) return

    setRecalculating(prev => new Set(prev).add(index))
    try {
      const results = await callEstimateAPI(
        [{ id: ing.id!, name: ing.name, quantity: ing.quantity, unit: ing.unit, estimated_kcal: ing.estimated_kcal }],
        true
      )
      if (results[0]) {
        const r = results[0]
        setIngredients(prev => prev.map((item, i) =>
          i === index
            ? { ...item, estimated_kcal: r.kcal, protein_g: r.protein_g, carbs_g: r.carbs_g, fat_g: r.fat_g }
            : item
        ))
      }
    } catch (err) {
      console.error('[dish-form] recalculate error:', err)
    }
    setRecalculating(prev => { const s = new Set(prev); s.delete(index); return s })
  }

  async function estimateKcalForIngredients(savedIngredients: { id: string; name: string; quantity: number | null; unit: string | null; estimated_kcal?: number }[]) {
    if (!savedIngredients.length) return
    setEstimating(true)
    try {
      await callEstimateAPI(savedIngredients)
    } catch (err) {
      console.error('[dish-form] estimate-kcal failed:', err)
    }
    setEstimating(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const validIngredients = ingredients.filter(i => i.name.trim())

    if (dish) {
      const { error: dishError } = await supabase
        .from('dishes')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          protein_type_id: proteinTypeId || null,
        })
        .eq('id', dish.id)

      if (dishError) { setError(dishError.message); setLoading(false); return }

      await supabase.from('ingredients').delete().eq('dish_id', dish.id)
      if (validIngredients.length) {
        const { data: inserted } = await supabase
          .from('ingredients')
          .insert(validIngredients.map(i => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit || null,
            estimated_cost: i.estimated_cost,
            estimated_kcal: i.estimated_kcal || 0,
            protein_g: i.protein_g || 0,
            carbs_g: i.carbs_g || 0,
            fat_g: i.fat_g || 0,
            dish_id: dish.id,
          })))
          .select('id, name, quantity, unit, estimated_kcal')

        setLoading(false)
        if (inserted?.length) await estimateKcalForIngredients(inserted)
      } else {
        setLoading(false)
      }
    } else {
      const { data: newDish, error: dishError } = await supabase
        .from('dishes')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          protein_type_id: proteinTypeId || null,
          workspace_id: workspaceId,
        })
        .select()
        .single()

      if (dishError || !newDish) { setError(dishError?.message ?? 'Error'); setLoading(false); return }

      if (validIngredients.length) {
        const { data: inserted } = await supabase
          .from('ingredients')
          .insert(validIngredients.map(i => ({
            name: i.name,
            quantity: i.quantity,
            unit: i.unit || null,
            estimated_cost: i.estimated_cost,
            estimated_kcal: i.estimated_kcal || 0,
            protein_g: i.protein_g || 0,
            carbs_g: i.carbs_g || 0,
            fat_g: i.fat_g || 0,
            dish_id: newDish.id,
          })))
          .select('id, name, quantity, unit, estimated_kcal')

        setLoading(false)
        if (inserted?.length) await estimateKcalForIngredients(inserted)
      } else {
        setLoading(false)
      }
    }

    onSave()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Nombre */}
      <div className="space-y-1">
        <Label htmlFor="dish-name">Nombre del plato *</Label>
        <Input
          id="dish-name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Ej: Pollo al curry"
          required
        />
      </div>

      {/* Descripción */}
      <div className="space-y-1">
        <Label htmlFor="dish-desc">Descripción (opcional)</Label>
        <Input
          id="dish-desc"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Breve descripción del plato"
        />
      </div>

      {/* Tipo de proteína */}
      <div className="space-y-1">
        <Label>Tipo de proteína</Label>
        <Select value={proteinTypeId} onValueChange={setProteinTypeId}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar tipo..." />
          </SelectTrigger>
          <SelectContent>
            {proteinTypes.map(pt => (
              <SelectItem key={pt.id} value={pt.id}>
                <span className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: pt.color }} />
                  {pt.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ingredientes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <Label>Ingredientes</Label>
          <div className="text-right text-xs text-muted-foreground space-x-2">
            <span className="font-medium text-foreground">S/. {totalCost.toFixed(2)}</span>
            {totalKcal > 0 && <span>🔥 {Math.round(totalKcal)} kcal</span>}
            {totalProtein > 0 && <span>💪 {totalProtein.toFixed(1)}g</span>}
            {totalCarbs > 0 && <span>🌾 {totalCarbs.toFixed(1)}g</span>}
            {totalFat > 0 && <span>🥑 {totalFat.toFixed(1)}g</span>}
          </div>
        </div>

        <div className="space-y-2">
          {/* Cabecera desktop */}
          <div className="hidden sm:grid grid-cols-[1fr_70px_70px_80px_70px_36px_32px] gap-1.5 text-xs text-muted-foreground px-1">
            <span>Nombre</span>
            <span>Cantidad</span>
            <span>Unidad</span>
            <span>Costo S/.</span>
            <span>kcal ✨</span>
            <span>↺</span>
            <span />
          </div>

          {ingredients.map((ing, idx) => (
            <Fragment key={idx}>
              {/* Mobile */}
              <div className="sm:hidden border rounded-lg p-2 space-y-1.5">
                <div className="flex gap-1.5 items-center">
                  <Input
                    placeholder="Ej: Arroz"
                    value={ing.name}
                    onChange={e => updateIngredient(idx, 'name', e.target.value)}
                    className="h-8 text-sm flex-1"
                  />
                  {ing.id && (
                    <button
                      type="button"
                      onClick={() => handleRecalculate(idx)}
                      disabled={recalculating.has(idx)}
                      title="Recalcular nutrición"
                      className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors text-base disabled:opacity-50"
                    >
                      {recalculating.has(idx) ? '…' : '↺'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => removeIngredient(idx)}
                    className="h-8 w-8 flex-shrink-0 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    ×
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    type="number"
                    placeholder="Cantidad"
                    value={ing.quantity ?? ''}
                    onChange={e => updateIngredient(idx, 'quantity', e.target.value ? Number(e.target.value) : null)}
                    className="h-8 text-sm"
                    min={0}
                  />
                  <Input
                    placeholder="Unidad"
                    value={ing.unit}
                    onChange={e => updateIngredient(idx, 'unit', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Input
                    type="number"
                    placeholder="S/."
                    value={ing.estimated_cost || ''}
                    onChange={e => updateIngredient(idx, 'estimated_cost', Number(e.target.value) || 0)}
                    className="h-8 text-sm"
                    min={0}
                    step={0.01}
                  />
                  <Input
                    type="number"
                    placeholder="kcal"
                    value={ing.estimated_kcal || ''}
                    onChange={e => updateIngredient(idx, 'estimated_kcal', Number(e.target.value) || 0)}
                    className="h-8 text-sm"
                    min={0}
                  />
                </div>
                {(ing.protein_g || ing.carbs_g || ing.fat_g) ? (
                  <p className="text-xs text-muted-foreground px-1">
                    💪 {(ing.protein_g ?? 0).toFixed(1)}g · 🌾 {(ing.carbs_g ?? 0).toFixed(1)}g · 🥑 {(ing.fat_g ?? 0).toFixed(1)}g
                  </p>
                ) : null}
              </div>

              {/* Desktop */}
              <div className="hidden sm:grid grid-cols-[1fr_70px_70px_80px_70px_36px_32px] gap-1.5 items-center">
                <Input
                  placeholder="Ej: Arroz"
                  value={ing.name}
                  onChange={e => updateIngredient(idx, 'name', e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  type="number"
                  placeholder="0"
                  value={ing.quantity ?? ''}
                  onChange={e => updateIngredient(idx, 'quantity', e.target.value ? Number(e.target.value) : null)}
                  className="h-8 text-sm"
                  min={0}
                />
                <Input
                  placeholder="gr"
                  value={ing.unit}
                  onChange={e => updateIngredient(idx, 'unit', e.target.value)}
                  className="h-8 text-sm"
                />
                <Input
                  type="number"
                  placeholder="0.00"
                  value={ing.estimated_cost || ''}
                  onChange={e => updateIngredient(idx, 'estimated_cost', Number(e.target.value) || 0)}
                  className="h-8 text-sm"
                  min={0}
                  step={0.01}
                />
                <Input
                  type="number"
                  placeholder="kcal"
                  value={ing.estimated_kcal || ''}
                  onChange={e => updateIngredient(idx, 'estimated_kcal', Number(e.target.value) || 0)}
                  className="h-8 text-sm"
                  min={0}
                />
                <button
                  type="button"
                  onClick={() => handleRecalculate(idx)}
                  disabled={!ing.id || recalculating.has(idx)}
                  title="Recalcular nutrición"
                  className="h-8 w-9 flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors text-base disabled:opacity-30"
                >
                  {recalculating.has(idx) ? '…' : '↺'}
                </button>
                <button
                  type="button"
                  onClick={() => removeIngredient(idx)}
                  className="h-8 w-8 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  ×
                </button>
              </div>
            </Fragment>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
          + Ingrediente
        </Button>
      </div>

      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}

      {estimating && (
        <p className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
          ✨ Estimando nutrición con IA...
        </p>
      )}

      {/* Acciones */}
      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading || estimating}>
          {loading ? 'Guardando...' : dish ? 'Guardar cambios' : 'Crear plato'}
        </Button>
      </div>
    </form>
  )
}
