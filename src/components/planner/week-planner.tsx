'use client'

import { useState, useEffect, useCallback, Fragment } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { DraggableDish } from './draggable-dish'
import { DroppableCell } from './droppable-cell'
import type { Dish, MealSlot, WeekPlanEntry } from '@/lib/types'

const DAYS = [
  { key: 'monday',    label: 'Lun' },
  { key: 'tuesday',   label: 'Mar' },
  { key: 'wednesday', label: 'Mié' },
  { key: 'thursday',  label: 'Jue' },
  { key: 'friday',    label: 'Vie' },
  { key: 'saturday',  label: 'Sáb' },
  { key: 'sunday',    label: 'Dom' },
]

// Slots de respaldo si la tabla meal_slots aún no existe
const FALLBACK_SLOTS: MealSlot[] = [
  { id: 'breakfast', workspace_id: '', name: 'Desayuno', sort_order: 1, is_default: true, created_at: '' },
  { id: 'lunch',     workspace_id: '', name: 'Almuerzo', sort_order: 2, is_default: true, created_at: '' },
  { id: 'dinner',    workspace_id: '', name: 'Cena',     sort_order: 3, is_default: true, created_at: '' },
]

const KCAL_LIMIT = 2000

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

// Tooltip personalizado para el gráfico de calorías
function KcalTooltip({ active, payload, label }: { active?: boolean; payload?: { dataKey: string; value: number; name: string; fill: string; payload: Record<string, number | string> }[]; label?: string }) {
  if (!active || !payload?.length) return null
  const data = payload[0]?.payload as Record<string, number>
  const total = (data.__total__ as number) || 0
  const excess = (data.__excess__ as number) || 0
  const realEntries = payload.filter(p => p.dataKey !== '__excess__' && p.dataKey !== '__empty__' && p.value > 0)

  return (
    <div className="bg-card border rounded-md p-2.5 text-xs shadow-md space-y-1 min-w-28">
      <p className="font-semibold text-foreground">{label}</p>
      {realEntries.map(p => (
        <p key={p.dataKey} style={{ color: p.fill }}>
          {p.name}: {Math.round(p.value * (total / Math.min(total, KCAL_LIMIT) || 1))} kcal
        </p>
      ))}
      {excess > 0 && <p className="text-[#E53E3E] font-medium">+{Math.round(excess)} exceso</p>}
      <p className="font-semibold border-t pt-1 text-foreground">Total: {Math.round(total)} kcal</p>
    </div>
  )
}

export function WeekPlanner({ workspaceId, dishes }: Props) {
  const supabase = createClient()
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  )

  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()))
  const [entries, setEntries] = useState<EntryWithDish[]>([])
  const [loading, setLoading] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  // Meal slots
  const [allSlots, setAllSlots] = useState<MealSlot[]>(FALLBACK_SLOTS)
  const [hiddenSlotIds, setHiddenSlotIds] = useState<Set<string>>(new Set())
  const [addingSlot, setAddingSlot] = useState(false)
  const [newSlotName, setNewSlotName] = useState('')
  const [usingFallback, setUsingFallback] = useState(true)

  const visibleSlots = allSlots.filter(s => !hiddenSlotIds.has(s.id))

  const fetchSlots = useCallback(async () => {
    const { data: dbSlots, error } = await supabase
      .from('meal_slots')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('sort_order')

    if (error || !dbSlots || dbSlots.length === 0) {
      setAllSlots(FALLBACK_SLOTS)
      setHiddenSlotIds(new Set())
      setUsingFallback(true)
      return
    }

    setUsingFallback(false)
    setAllSlots(dbSlots)

    const { data: hiddenRows } = await supabase
      .from('meal_slot_hidden_weeks')
      .select('meal_slot_id')
      .eq('workspace_id', workspaceId)
      .eq('week_start', formatDate(weekStart))

    setHiddenSlotIds(new Set(hiddenRows?.map(r => r.meal_slot_id) ?? []))
  }, [workspaceId, weekStart]) // eslint-disable-line react-hooks/exhaustive-deps

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

  useEffect(() => { fetchSlots() }, [fetchSlots])
  useEffect(() => { fetchEntries() }, [fetchEntries])

  async function handleAddSlot() {
    if (!newSlotName.trim()) return
    await supabase.from('meal_slots').insert({
      workspace_id: workspaceId,
      name: newSlotName.trim(),
      sort_order: 99,
      is_default: false,
    })
    setNewSlotName('')
    setAddingSlot(false)
    fetchSlots()
  }

  async function handleHideSlot(slotId: string) {
    await supabase.from('meal_slot_hidden_weeks').insert({
      meal_slot_id: slotId,
      workspace_id: workspaceId,
      week_start: formatDate(weekStart),
    })
    fetchSlots()
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const dishId = (active.id as string).replace('drag-', '')
    const [day, slotId] = (over.id as string).split(':')
    const dish = dishes.find(d => d.id === dishId)
    if (!dish) return

    const tempId = `temp-${Date.now()}`
    const slot = allSlots.find(s => s.id === slotId)
    const tempEntry: EntryWithDish = {
      id: tempId,
      workspace_id: workspaceId,
      dish_id: dishId,
      week_start: formatDate(weekStart),
      day_of_week: day as WeekPlanEntry['day_of_week'],
      meal_slot: 'breakfast',
      meal_slot_id: slotId,
      created_at: new Date().toISOString(),
      dish,
    }
    setEntries(prev => [...prev, tempEntry])

    const insertData: Record<string, string> = {
      workspace_id: workspaceId,
      dish_id: dishId,
      week_start: formatDate(weekStart),
      day_of_week: day,
    }

    if (usingFallback) {
      // Tabla meal_slots no existe aún, usar campo texto legacy
      const legacyMap: Record<string, string> = { breakfast: 'breakfast', lunch: 'lunch', dinner: 'dinner' }
      insertData.meal_slot = legacyMap[slotId] ?? slotId
    } else {
      insertData.meal_slot_id = slotId
    }

    // Suprimir warning de unused variable
    void slot

    const { data, error } = await supabase
      .from('week_plan_entries')
      .insert(insertData)
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

  // ── Métricas ──
  const weekCost = entries.reduce((sum, e) => {
    return sum + (e.dish?.ingredients?.reduce((s, i) => s + (i.estimated_cost || 0), 0) ?? 0)
  }, 0)

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

  // ── Gráfico de calorías ──
  const proteinTypesForChart = [
    ...new Map(
      entries.filter(e => e.dish?.protein_type).map(e => [e.dish!.protein_type!.id, e.dish!.protein_type!])
    ).values(),
  ]

  const totalWeekKcal = entries.reduce((sum, e) => {
    return sum + (e.dish?.ingredients?.reduce((s, i) => s + (i.estimated_kcal || 0), 0) ?? 0)
  }, 0)

  const chartData = DAYS.map(day => {
    const dayEntries = entries.filter(e => e.day_of_week === day.key)
    const rawByPt: Record<string, number> = {}
    let total = 0

    dayEntries.forEach(entry => {
      const kcal = entry.dish?.ingredients?.reduce((s, i) => s + (i.estimated_kcal || 0), 0) || 0
      const ptId = entry.dish?.protein_type?.id || '__none__'
      rawByPt[ptId] = (rawByPt[ptId] || 0) + kcal
      total += kcal
    })

    const capped = Math.min(total, KCAL_LIMIT)
    const scale = total > 0 ? capped / total : 1
    const result: Record<string, number | string> = { day: day.label }

    Object.entries(rawByPt).forEach(([ptId, kcal]) => {
      result[ptId] = Math.round(kcal * scale)
    })
    result.__excess__ = Math.max(0, total - KCAL_LIMIT)
    result.__total__ = total
    result.__empty__ = total === 0 ? 80 : 0

    return result
  })

  const showKcalChart = totalWeekKcal > 0

  const activeDish = activeId ? dishes.find(d => `drag-${d.id}` === activeId) : null

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
              dishes.map(dish => <DraggableDish key={dish.id} dish={dish} />)
            )}
          </div>
        </aside>

        {/* ── Planificador ── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Header semana */}
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
              Costo: <span className="font-semibold">S/. {weekCost.toFixed(2)}</span>
            </p>
          </div>

          {/* Grilla */}
          <div className="overflow-auto lg:flex-1">
            {loading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                Cargando...
              </div>
            ) : (
              <div>
                <div
                  className="grid gap-1"
                  style={{ gridTemplateColumns: '80px repeat(7, 1fr)', minWidth: 680 }}
                >
                  {/* Cabecera días */}
                  <div />
                  {DAYS.map(day => (
                    <div key={day.key} className="text-center text-xs font-semibold text-muted-foreground py-1 uppercase">
                      {day.label}
                    </div>
                  ))}

                  {/* Filas dinámicas por slot */}
                  {visibleSlots.map(slot => (
                    <Fragment key={slot.id}>
                      <div className="flex items-start pt-2 min-w-0">
                        <span className="text-xs font-medium text-muted-foreground truncate flex-1">{slot.name}</span>
                        {!slot.is_default && !usingFallback && (
                          <button
                            onClick={() => handleHideSlot(slot.id)}
                            className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-0.5"
                            title={`Ocultar "${slot.name}" esta semana`}
                          >
                            ×
                          </button>
                        )}
                      </div>
                      {DAYS.map(day => (
                        <DroppableCell
                          key={`${day.key}:${slot.id}`}
                          id={`${day.key}:${slot.id}`}
                          entries={entries.filter(e =>
                            e.day_of_week === day.key &&
                            (e.meal_slot_id === slot.id || (!e.meal_slot_id && e.meal_slot === (slot.id as WeekPlanEntry['meal_slot'])))
                          )}
                          onRemove={handleRemoveEntry}
                        />
                      ))}
                    </Fragment>
                  ))}
                </div>

                {/* Botón agregar slot */}
                {!usingFallback && (
                  <div className="mt-2" style={{ paddingLeft: 80 }}>
                    {addingSlot ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={newSlotName}
                          onChange={e => setNewSlotName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddSlot()
                            if (e.key === 'Escape') { setAddingSlot(false); setNewSlotName('') }
                          }}
                          placeholder="Ej: Refrigerio"
                          className="text-sm border rounded px-2 py-1 bg-input text-foreground w-36"
                        />
                        <button
                          onClick={handleAddSlot}
                          className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                        >
                          OK
                        </button>
                        <button
                          onClick={() => { setAddingSlot(false); setNewSlotName('') }}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingSlot(true)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                      >
                        + Agregar tiempo de comida
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Gráfico de calorías ── */}
          {showKcalChart && (
            <div className="mt-3 flex-shrink-0 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Consumo calórico semanal</p>
                <p className="text-xs font-semibold">Total: {Math.round(totalWeekKcal).toLocaleString()} kcal</p>
              </div>
              <div className="overflow-x-auto">
                <div style={{ minWidth: 500 }}>
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip content={<KcalTooltip />} />
                      <ReferenceLine y={KCAL_LIMIT} stroke="#6B7280" strokeDasharray="4 2" label={{ value: '2000', fontSize: 10, fill: '#6B7280' }} />

                      {proteinTypesForChart.map(pt => (
                        <Bar key={pt.id} dataKey={pt.id} stackId="a" fill={pt.color} name={pt.name} />
                      ))}
                      <Bar dataKey="__none__" stackId="a" fill="#9CA3AF" name="Sin proteína" />
                      <Bar dataKey="__excess__" stackId="a" fill="#E53E3E" name="Exceso" />
                      <Bar dataKey="__empty__" stackId="a" fill="#E5E5E5" name="" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Barra de balance proteínas */}
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
