'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DishCard } from './dish-card'
import { DishForm } from './dish-form'
import type { Dish, ProteinType } from '@/lib/types'

interface Props {
  workspaceId: string
  dishes: Dish[]
  proteinTypes: ProteinType[]
}

export function DishCatalog({ workspaceId, dishes, proteinTypes }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [createOpen, setCreateOpen] = useState(false)
  const [detailDish, setDetailDish] = useState<Dish | null>(null)
  const [editDish, setEditDish] = useState<Dish | null>(null)

  function handleSave() {
    setCreateOpen(false)
    setEditDish(null)
    router.refresh()
  }

  async function handleDelete(dish: Dish) {
    if (!confirm(`¿Eliminar "${dish.name}"? Esta acción no se puede deshacer.`)) return
    await supabase.from('dishes').delete().eq('id', dish.id)
    setDetailDish(null)
    router.refresh()
  }

  const totalCostDetail = detailDish?.ingredients?.reduce(
    (sum, i) => sum + (i.estimated_cost || 0), 0
  ) ?? 0
  const totalKcalDetail = detailDish?.ingredients?.reduce(
    (sum, i) => sum + (i.estimated_kcal || 0), 0
  ) ?? 0

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Catálogo de platos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{dishes.length} plato{dishes.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Agregar plato</Button>
      </div>

      {/* Grid */}
      {dishes.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg">No hay platos aún.</p>
          <p className="text-sm mt-1">Agrega tu primer plato con el botón de arriba.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {dishes.map(dish => (
            <DishCard key={dish.id} dish={dish} onClick={() => setDetailDish(dish)} />
          ))}
        </div>
      )}

      {/* Modal: Crear plato */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen} modal={false}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nuevo plato</DialogTitle>
          </DialogHeader>
          <DishForm
            workspaceId={workspaceId}
            proteinTypes={proteinTypes}
            onSave={handleSave}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Modal: Editar plato */}
      <Dialog open={!!editDish} onOpenChange={open => !open && setEditDish(null)} modal={false}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar plato</DialogTitle>
          </DialogHeader>
          {editDish && (
            <DishForm
              workspaceId={workspaceId}
              proteinTypes={proteinTypes}
              dish={editDish}
              onSave={handleSave}
              onCancel={() => setEditDish(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Detalle del plato */}
      <Dialog open={!!detailDish} onOpenChange={open => !open && setDetailDish(null)}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg">
          {detailDish && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 flex-wrap">
                  <DialogTitle className="text-xl">{detailDish.name}</DialogTitle>
                  {detailDish.protein_type && (
                    <Badge
                      className="text-white"
                      style={{ backgroundColor: detailDish.protein_type.color }}
                    >
                      {detailDish.protein_type.name}
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              <div className="space-y-4 pt-1">
                {detailDish.description && (
                  <p className="text-muted-foreground">{detailDish.description}</p>
                )}

                {detailDish.ingredients && detailDish.ingredients.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-sm text-muted-foreground uppercase tracking-wide">
                      Ingredientes
                    </h4>
                    <ul className="divide-y border rounded-lg">
                      {detailDish.ingredients.map(ing => (
                        <li key={ing.id} className="flex items-center justify-between px-3 py-2 text-sm flex-wrap gap-1">
                          <span>
                            {ing.name}
                            {ing.quantity && (
                              <span className="text-muted-foreground ml-1">
                                — {ing.quantity} {ing.unit}
                              </span>
                            )}
                          </span>
                          <div className="flex items-center gap-3 text-muted-foreground">
                            {ing.estimated_kcal > 0 && (
                              <span className="text-xs">~{ing.estimated_kcal} kcal</span>
                            )}
                            <span>S/. {(ing.estimated_cost || 0).toFixed(2)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Totales */}
                <div className="space-y-1 pt-1 border-t">
                  <div className="flex justify-between items-center text-sm font-semibold">
                    <span>Costo total</span>
                    <span>S/. {totalCostDetail.toFixed(2)}</span>
                  </div>
                  {totalKcalDetail > 0 && (
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>Calorías totales</span>
                      <span>~{totalKcalDetail} kcal</span>
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex gap-2 justify-end pt-2">
                  <Button variant="destructive" size="sm" onClick={() => handleDelete(detailDish)}>
                    Eliminar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setEditDish(detailDish); setDetailDish(null) }}
                  >
                    Editar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
