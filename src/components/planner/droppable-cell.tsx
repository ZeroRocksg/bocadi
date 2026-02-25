'use client'

import { useDroppable } from '@dnd-kit/core'
import type { Dish, WeekPlanEntry } from '@/lib/types'

type EntryWithDish = WeekPlanEntry & { dish: Dish }

interface Props {
  id: string
  entries: EntryWithDish[]
  onRemove: (entryId: string) => void
}

export function DroppableCell({ id, entries, onRemove }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={`min-h-[72px] rounded-md border-2 p-1 space-y-1 transition-colors ${
        isOver
          ? 'border-primary bg-primary/10'
          : 'border-border bg-muted hover:border-muted-foreground'
      }`}
    >
      {entries.map(entry => (
        <div
          key={entry.id}
          className="flex items-center gap-1 pl-2 pr-1 py-1 rounded text-xs font-medium text-white leading-tight"
          style={{ backgroundColor: entry.dish?.protein_type?.color ?? '#6b7280' }}
        >
          <span className="truncate flex-1">{entry.dish?.name}</span>
          <button
            onClick={e => { e.stopPropagation(); onRemove(entry.id) }}
            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded hover:bg-black/20 transition-colors font-bold"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}
