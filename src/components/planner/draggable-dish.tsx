'use client'

import { useDraggable } from '@dnd-kit/core'
import type { Dish } from '@/lib/types'

interface Props {
  dish: Dish
}

export function DraggableDish({ dish }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `drag-${dish.id}`,
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      className="flex items-center gap-2 px-2 py-1.5 rounded-md border bg-white cursor-grab active:cursor-grabbing hover:shadow-sm transition-all text-sm select-none"
    >
      {dish.protein_type ? (
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: dish.protein_type.color }}
        />
      ) : (
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-zinc-300" />
      )}
      <span className="truncate">{dish.name}</span>
    </div>
  )
}
