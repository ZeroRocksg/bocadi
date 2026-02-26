'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Dish } from '@/lib/types'

interface Props {
  dish: Dish
  onClick: () => void
}

export function DishCard({ dish, onClick }: Props) {
  const [expanded, setExpanded] = useState(false)

  const totalCost = dish.ingredients?.reduce((sum, i) => sum + (i.estimated_cost || 0), 0) ?? 0
  const totalKcal = dish.ingredients?.reduce((sum, i) => sum + (i.estimated_kcal || 0), 0) ?? 0
  const totalProtein = dish.ingredients?.reduce((sum, i) => sum + (i.protein_g || 0), 0) ?? 0
  const totalCarbs = dish.ingredients?.reduce((sum, i) => sum + (i.carbs_g || 0), 0) ?? 0
  const totalFat = dish.ingredients?.reduce((sum, i) => sum + (i.fat_g || 0), 0) ?? 0
  const totalFiber = dish.ingredients?.reduce((sum, i) => sum + (i.fiber_g || 0), 0) ?? 0
  const totalSodium = dish.ingredients?.reduce((sum, i) => sum + (i.sodium_mg || 0), 0) ?? 0
  const totalVitC = dish.ingredients?.reduce((sum, i) => sum + (i.vitamin_c_mg || 0), 0) ?? 0
  const totalVitD = dish.ingredients?.reduce((sum, i) => sum + (i.vitamin_d_ui || 0), 0) ?? 0
  const totalCalcium = dish.ingredients?.reduce((sum, i) => sum + (i.calcium_mg || 0), 0) ?? 0
  const totalIron = dish.ingredients?.reduce((sum, i) => sum + (i.iron_mg || 0), 0) ?? 0
  const totalPotassium = dish.ingredients?.reduce((sum, i) => sum + (i.potassium_mg || 0), 0) ?? 0

  const hasMacros = totalKcal > 0 || totalProtein > 0 || totalCarbs > 0 || totalFat > 0
  const hasMicros = totalFiber > 0 || totalSodium > 0 || totalVitC > 0 || totalVitD > 0 || totalCalcium > 0 || totalIron > 0 || totalPotassium > 0
  const proteinColor = dish.protein_type?.color

  function handleExpandClick(e: React.MouseEvent) {
    e.stopPropagation()
    setExpanded(prev => !prev)
  }

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
      onClick={onClick}
    >
      {proteinColor && (
        <div className="h-1.5 w-full" style={{ backgroundColor: proteinColor }} />
      )}

      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{dish.name}</h3>
          {dish.protein_type && (
            <Badge
              className="text-white flex-shrink-0 text-xs"
              style={{ backgroundColor: dish.protein_type.color }}
            >
              {dish.protein_type.name}
            </Badge>
          )}
        </div>

        {dish.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{dish.description}</p>
        )}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {dish.ingredients?.length ?? 0} ingrediente{(dish.ingredients?.length ?? 0) !== 1 ? 's' : ''}
          </span>
          <span className="font-medium">S/. {totalCost.toFixed(2)}</span>
        </div>

        {/* Fila compacta de macros */}
        {hasMacros && (
          <div
            className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground border-t pt-2 cursor-default"
            onClick={handleExpandClick}
          >
            <span>🔥 {Math.round(totalKcal)} kcal</span>
            <span>💪 {totalProtein.toFixed(1)}g prot</span>
            <span>🌾 {totalCarbs.toFixed(1)}g carbs</span>
            <span>🥑 {totalFat.toFixed(1)}g grasas</span>
            {(hasMicros) && (
              <span className="ml-auto text-primary">{expanded ? '▲' : '▼'}</span>
            )}
          </div>
        )}

        {/* Detalle expandido de micronutrientes */}
        {expanded && hasMicros && (
          <div
            className="border rounded-md p-2 bg-muted/40 cursor-default"
            onClick={e => e.stopPropagation()}
          >
            <table className="w-full text-xs">
              <tbody className="divide-y divide-border">
                {totalFiber > 0 && <tr><td className="py-0.5 text-muted-foreground">Fibra</td><td className="py-0.5 text-right font-medium">{totalFiber.toFixed(1)} g</td></tr>}
                {totalSodium > 0 && <tr><td className="py-0.5 text-muted-foreground">Sodio</td><td className="py-0.5 text-right font-medium">{Math.round(totalSodium)} mg</td></tr>}
                {totalVitC > 0 && <tr><td className="py-0.5 text-muted-foreground">Vitamina C</td><td className="py-0.5 text-right font-medium">{totalVitC.toFixed(1)} mg</td></tr>}
                {totalVitD > 0 && <tr><td className="py-0.5 text-muted-foreground">Vitamina D</td><td className="py-0.5 text-right font-medium">{Math.round(totalVitD)} UI</td></tr>}
                {totalCalcium > 0 && <tr><td className="py-0.5 text-muted-foreground">Calcio</td><td className="py-0.5 text-right font-medium">{Math.round(totalCalcium)} mg</td></tr>}
                {totalIron > 0 && <tr><td className="py-0.5 text-muted-foreground">Hierro</td><td className="py-0.5 text-right font-medium">{totalIron.toFixed(1)} mg</td></tr>}
                {totalPotassium > 0 && <tr><td className="py-0.5 text-muted-foreground">Potasio</td><td className="py-0.5 text-right font-medium">{Math.round(totalPotassium)} mg</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
