'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { WeekPlanEntry, Dish } from '@/lib/types'

type EntryWithDish = WeekPlanEntry & { dish: Dish }

interface Props {
  entries: EntryWithDish[]
  weekStart: Date
  workspaceId: string
  workspaceName: string
  userEmail: string
}

export function PdfReportDialog({ entries, weekStart, workspaceId, workspaceName, userEmail }: Props) {
  const [open, setOpen] = useState(false)
  const [generating, setGenerating] = useState(false)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  async function handleGenerate() {
    setGenerating(true)
    try {
      // Importar dinámicamente para evitar problemas de SSR con jsPDF
      const [{ generateNutritionReport }, { createClient }] = await Promise.all([
        import('@/lib/pdf-report'),
        import('@/lib/supabase/client'),
      ])

      const supabase = createClient()
      const { data: profile } = await supabase
        .from('nutritionist_profile')
        .select('name, license_number, logo_url')
        .eq('workspace_id', workspaceId)
        .maybeSingle()

      await generateNutritionReport({
        entries: entries as Parameters<typeof generateNutritionReport>[0]['entries'],
        weekStart,
        weekEnd,
        workspaceName,
        userEmail,
        nutritionist: profile ?? null,
      })
      setOpen(false)
    } catch (err) {
      console.error('[pdf-report] Error generando PDF:', err)
    }
    setGenerating(false)
  }

  const weekLabel = `${weekStart.getDate()}/${weekStart.getMonth() + 1} – ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}/${weekEnd.getFullYear()}`

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-xs"
        disabled={entries.length === 0}
        title={entries.length === 0 ? 'Agrega platos al planificador primero' : 'Generar reporte PDF'}
      >
        📄 Reporte PDF
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generar Reporte PDF</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="bg-muted rounded-lg p-3 text-sm space-y-1">
              <p className="font-medium">Semana a incluir:</p>
              <p className="text-muted-foreground">{weekLabel}</p>
              <p className="text-muted-foreground">{entries.length} entrada{entries.length !== 1 ? 's' : ''} en el planificador</p>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">El PDF incluirá:</p>
              <ul className="space-y-0.5 ml-3">
                <li>• Portada con datos del paciente y nutricionista</li>
                <li>• Resumen ejecutivo con semáforo nutricional</li>
                <li>• Detalle diario de comidas con macros</li>
                <li>• Tabla de micronutrientes (fibra, sodio, vitaminas…)</li>
                <li>• Balance proteico por tipo</li>
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              El perfil del nutricionista se configura en{' '}
              <a href="/workspace/settings" className="underline text-primary" target="_blank">Configuración</a>.
            </p>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? 'Generando...' : 'Generar y Descargar PDF'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
