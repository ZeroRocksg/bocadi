'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ProteinType } from '@/lib/types'

interface Props {
  workspaceId: string
  proteinTypes: ProteinType[]
}

export function ProteinTypeManager({ workspaceId, proteinTypes }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase
      .from('protein_types')
      .insert({ name: name.trim(), color, workspace_id: workspaceId })

    if (error) {
      setError(error.message)
    } else {
      setName('')
      setColor('#6366f1')
      router.refresh()
    }
    setLoading(false)
  }

  async function handleDelete(pt: ProteinType) {
    setError('')
    // Verificar si tiene platos asociados
    const { count } = await supabase
      .from('dishes')
      .select('*', { count: 'exact', head: true })
      .eq('protein_type_id', pt.id)

    if (count && count > 0) {
      setError(`No se puede eliminar "${pt.name}" porque tiene ${count} plato(s) asociado(s).`)
      return
    }

    const { error } = await supabase.from('protein_types').delete().eq('id', pt.id)
    if (error) {
      setError(error.message)
    } else {
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* Lista de tipos */}
      <div>
        <h2 className="font-semibold mb-3">Tipos de proteína</h2>
        <ul className="space-y-2">
          {proteinTypes.map((pt) => (
            <li key={pt.id} className="flex items-center justify-between bg-white border rounded-lg px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span
                  className="w-5 h-5 rounded-full border border-zinc-200 flex-shrink-0"
                  style={{ backgroundColor: pt.color }}
                />
                <span className="text-sm font-medium">{pt.name}</span>
                <span className="text-xs text-zinc-400">{pt.color}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleDelete(pt)}
              >
                Eliminar
              </Button>
            </li>
          ))}
          {proteinTypes.length === 0 && (
            <p className="text-sm text-zinc-400 text-center py-4">No hay tipos de proteína aún.</p>
          )}
        </ul>
      </div>

      {/* Agregar nuevo */}
      <div>
        <h2 className="font-semibold mb-3">Agregar tipo</h2>
        <form onSubmit={handleAdd} className="flex gap-3 items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="pt-name">Nombre</Label>
            <Input
              id="pt-name"
              placeholder="Ej: Mariscos"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pt-color">Color</Label>
            <input
              id="pt-color"
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="h-9 w-14 rounded-md border border-zinc-200 cursor-pointer"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? '...' : 'Agregar'}
          </Button>
        </form>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>}
    </div>
  )
}
