'use client'

import { useState } from 'react'
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
  unit: '',
  estimated_cost: 0,
})

export function DishForm({ workspaceId, proteinTypes, dish, onSave, onCancel }: Props) {
  const supabase = createClient()
  const [name, setName] = useState(dish?.name ?? '')
  const [description, setDescription] = useState(dish?.description ?? '')
  const [proteinTypeId, setProteinTypeId] = useState(dish?.protein_type_id ?? '')
  const [ingredients, setIngredients] = useState<IngredientFormData[]>(
    dish?.ingredients?.length
      ? dish.ingredients.map(i => ({
          name: i.name,
          quantity: i.quantity,
          unit: i.unit ?? '',
          estimated_cost: i.estimated_cost,
        }))
      : [emptyIngredient()]
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const totalCost = ingredients.reduce((sum, i) => sum + (Number(i.estimated_cost) || 0), 0)

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const validIngredients = ingredients.filter(i => i.name.trim())

    if (dish) {
      // Editar
      const { error: dishError } = await supabase
        .from('dishes')
        .update({
          name: name.trim(),
          description: description.trim() || null,
          protein_type_id: proteinTypeId || null,
        })
        .eq('id', dish.id)

      if (dishError) { setError(dishError.message); setLoading(false); return }

      // Reemplazar ingredientes
      await supabase.from('ingredients').delete().eq('dish_id', dish.id)
      if (validIngredients.length) {
        await supabase.from('ingredients').insert(
          validIngredients.map(i => ({ ...i, dish_id: dish.id }))
        )
      }
    } else {
      // Crear
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
        await supabase.from('ingredients').insert(
          validIngredients.map(i => ({ ...i, dish_id: newDish.id }))
        )
      }
    }

    setLoading(false)
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
                  <span
                    className="inline-block w-3 h-3 rounded-full"
                    style={{ backgroundColor: pt.color }}
                  />
                  {pt.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ingredientes */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Ingredientes</Label>
          <span className="text-sm font-medium text-zinc-700">
            Total: S/. {totalCost.toFixed(2)}
          </span>
        </div>

        <div className="space-y-2">
          {/* Cabecera */}
          <div className="grid grid-cols-[1fr_80px_80px_90px_32px] gap-1.5 text-xs text-zinc-400 px-1">
            <span>Nombre</span>
            <span>Cantidad</span>
            <span>Unidad</span>
            <span>Costo $</span>
            <span />
          </div>

          {ingredients.map((ing, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_80px_80px_90px_32px] gap-1.5 items-center">
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
              <button
                type="button"
                onClick={() => removeIngredient(idx)}
                className="h-8 w-8 flex items-center justify-center rounded text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
          + Ingrediente
        </Button>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}

      {/* Acciones */}
      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : dish ? 'Guardar cambios' : 'Crear plato'}
        </Button>
      </div>
    </form>
  )
}
