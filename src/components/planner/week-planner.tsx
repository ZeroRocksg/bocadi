'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { DraggableDish } from './draggable-dish'
import { DroppableCell } from './droppable-cell'
import type { Dish, ProteinType, WeekPlanEntry } from '@/lib/types'

const DAYS = [
  { key: 'monday',    label: 'Lun' },
  { key: 'tuesday',   label: 'Mar' },
  { key: 'wednesday', label: 'Mié' },
  { key: 'thursday',  label: 'Jue' },
  { key: 'friday',    label: 'Vie' },
  { key: 'saturday',  label: 'Sáb' },
  { key: 'sunday',    label: 'Dom' },
]

const SLOTS = [
  { key: 'breakfast', label: 'Desayuno' },
  { key: 'lunch',     label: 'Almuerzo' },
  { key: 'dinner',    label: 'Cena' },
]

function getMonday(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function addWeeks(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n * 7)
  return d
}

type EntryWithDish = WeekPlanEntry & { dish: Dish }

interface Props {
  workspaceId: string
  dishes: Dish[]
}

export function WeekPlanner({ workspaceId, dishes }: Props) {
  const supabase = createClient()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [entries, setEntries] = useState<EntryWithDish[]>([])
  const [loading, setLoading] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('week_plan_entries')
      .select('*, dish:dishes(*, protein_type:protein_types(*), ingredients(*))')
      .eq('workspace_id', workspaceId)
      .eq('week_start', formatDate(weekStart))
    setEntries((data as EntryWithDish[]) ?? [])
    setLoading(false)
  }, [workspaceId, weekStart]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchEntries() }, [fetchEntries])

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const dishId = (active.id as string).replace('drag-', '')
    const [day, slot] = (over.id as string).split(':')
    const dish = dishes.find(d => d.id === dishId)
    if (!dish) return

    // Optimistic update
    const tempId = `temp-${Date.now()}`
    const tempEntry: EntryWithDish = {
      id: tempId,
      workspace_id: workspaceId,
      dish_id: dishId,
      week_start: formatDate(weekStart),
      day_of_week: day as WeekPlanEntry['day_of_week'],
      meal_slot: slot as WeekPlanEntry['meal_slot'],
      created_at: new Date().toISOString(),
      dish,
    }
    setEntries(prev => [...prev, tempEntry])

    const { data, error } = await supabase
      .from('week_plan_entries')
      .insert({
        workspace_id: workspaceId,
        dish_id: dishId,
        week_start: formatDate(weekStart),
        day_of_week: day,
        meal_slot: slot,
      })
      .select('*, dish:dishes(*, protein_type:protein_types(*), ingredients(*))')
      .single()

    if (error) {
      setEntries(prev => prev.filter(e => e.id !== tempId))
    } else {
      setEntries(prev => prev.map(e => e.id === tempId ? (data as EntryWithDish) : e))
    }
  }

  async function handleRemoveEntry(entryId: string) {
    setEntries(prev => prev.filter(e => e.id !== entryId))
    await supabase.from('week_plan_entries').delete().eq('id', entryId)
  }

  // Costo semanal
  const weekCost = entries.reduce((sum, e) => {
    return sum + (e.dish?.ingredients?.reduce((s, i) => s + (i.estimated_cost || 0), 0) ?? 0)
  }, 0)

  // Balance de proteínas
  const proteinMap: Record<string, { color: string; name: string; count: number }> = {}
  entries.forEach(e => {
    const pt = e.dish?.protein_type
    if (pt) {
      if (!proteinMap[pt.id]) proteinMap[pt.id] = { color: pt.color, name: pt.name, count: 0 }
      proteinMap[pt.id].count++
    }
  })
  const proteinList = Object.values(proteinMap)
  const totalProteins = proteinList.reduce((s, v) => s + v.count, 0)

  // Plato activo en el drag
  const activeDish = activeId
    ? dishes.find(d => `drag-${d.id}` === activeId)
    : null

  // Label de semana
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const weekLabel = `${weekStart.getDate()}/${weekStart.getMonth() + 1} – ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}/${weekEnd.getFullYear()}`

  return (
    <DndContext
      sensors={sensors}
      onDragStart={e => setActiveId(e.active.id as string)}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:gap-4 lg:h-[calc(100vh-7rem)]">

        {/* ── Sidebar de platos ── */}
        <aside className="flex-shrink-0 flex flex-col gap-2 lg:w-44 lg:overflow-hidden">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Platos
          </p>
          <div className="flex flex-row gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:flex-1 lg:overflow-y-auto lg:space-y-1.5 lg:pr-1 lg:pb-0 lg:gap-0">
            {dishes.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center pt-6">
                Agrega platos en el Catálogo primero.
              </p>
            ) : (
              dishes.map(dish => (
                <DraggableDish key={dish.id} dish={dish} />
              ))
            )}
          </div>
        </aside>

        {/* ── Planificador ── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header de semana */}
          <div className="flex items-center justify-between mb-3 flex-shrink-0 flex-wrap gap-y-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setWeekStart(prev => addWeeks(prev, -1))}>←</Button>
              <span className="text-sm font-medium w-36 text-center">{weekLabel}</span>
              <Button variant="outline" size="sm" onClick={() => setWeekStart(prev => addWeeks(prev, 1))}>→</Button>
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => setWeekStart(getMonday(new Date()))}>
                Hoy
              </Button>
            </div>
            <p className="text-sm">
              Costo semanal:{' '}
              <span className="font-semibold">S/. {weekCost.toFixed(2)}</span>
            </p>
          </div>

          {/* Grilla */}
          <div className="overflow-auto lg:flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Cargando...
              </div>
            ) : (
              <div
                className="grid gap-1"
                style={{ gridTemplateColumns: '72px repeat(7, 1fr)', minWidth: 680 }}
              >
                {/* Cabecera de días */}
                <div />
                {DAYS.map(day => (
                  <div key={day.key} className="text-center text-xs font-semibold text-muted-foreground py-1 uppercase">
                    {day.label}
                  </div>
                ))}

                {/* Filas por slot */}
                {SLOTS.map(slot => (
                  <Fragment key={slot.key}>
                    <div className="flex items-start pt-2 text-xs font-medium text-muted-foreground">
                      {slot.label}
                    </div>
                    {DAYS.map(day => (
                      <DroppableCell
                        key={`${day.key}:${slot.key}`}
                        id={`${day.key}:${slot.key}`}
                        entries={entries.filter(
                          e => e.day_of_week === day.key && e.meal_slot === slot.key
                        )}
                        onRemove={handleRemoveEntry}
                      />
                    ))}
                  </Fragment>
                ))}
              </div>
            )}
          </div>

          {/* Barra de balance nutricional */}
          {proteinList.length > 0 && (
            <div className="mt-3 flex-shrink-0 space-y-1.5">
              <p className="text-xs text-muted-foreground">Balance semanal de proteínas</p>
              <div className="flex h-3.5 rounded-full overflow-hidden">
                {proteinList.map(p => (
                  <div
                    key={p.name}
                    style={{ width: `${(p.count / totalProteins) * 100}%`, backgroundColor: p.color }}
                    title={`${p.name}: ${Math.round((p.count / totalProteins) * 100)}%`}
                  />
                ))}
              </div>
              <div className="flex gap-3 flex-wrap">
                {proteinList.map(p => (
                  <span key={p.name} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                    {p.name} {Math.round((p.count / totalProteins) * 100)}%
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={null}>
        {activeDish && (
          <div
            className="px-2.5 py-1.5 rounded-md text-xs font-medium text-white shadow-lg cursor-grabbing pointer-events-none"
            style={{ backgroundColor: activeDish.protein_type?.color ?? '#6366f1' }}
          >
            {activeDish.name}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
