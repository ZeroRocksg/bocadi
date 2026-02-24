import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import type { Dish } from '@/lib/types'

interface Props {
  dish: Dish
  onClick: () => void
}

export function DishCard({ dish, onClick }: Props) {
  const totalCost = dish.ingredients?.reduce((sum, i) => sum + (i.estimated_cost || 0), 0) ?? 0
  const proteinColor = dish.protein_type?.color

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
      onClick={onClick}
    >
      {/* Borde superior de color de proteína */}
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
      </CardContent>
    </Card>
  )
}
