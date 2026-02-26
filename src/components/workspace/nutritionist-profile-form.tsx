'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface NutritionistProfile {
  name: string | null
  license_number: string | null
  logo_url: string | null
}

interface Props {
  workspaceId: string
  initial: NutritionistProfile | null
}

export function NutritionistProfileForm({ workspaceId, initial }: Props) {
  const supabase = createClient()
  const [name, setName] = useState(initial?.name ?? '')
  const [license, setLicense] = useState(initial?.license_number ?? '')
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? '')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `nutritionist-logos/${workspaceId}.${ext}`
    const { error } = await supabase.storage.from('public').upload(path, file, { upsert: true })
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from('public').getPublicUrl(path)
      setLogoUrl(publicUrl)
    }
    setUploading(false)
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    await supabase.from('nutritionist_profile').upsert({
      workspace_id: workspaceId,
      name: name.trim() || null,
      license_number: license.trim() || null,
      logo_url: logoUrl || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="bg-card border rounded-lg p-4 space-y-4">
      <p className="text-sm text-muted-foreground">
        Estos datos aparecerán en el reporte PDF generado para el nutricionista. Todos los campos son opcionales.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="nut-name">Nombre del nutricionista</Label>
          <Input
            id="nut-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Ej: Dra. María Pérez"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="nut-license">N° de colegiatura / licencia</Label>
          <Input
            id="nut-license"
            value={license}
            onChange={e => setLicense(e.target.value)}
            placeholder="Ej: CNP-12345"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Logo del nutricionista</Label>
        <div className="flex items-center gap-3 flex-wrap">
          {logoUrl && (
            <img src={logoUrl} alt="Logo nutricionista" className="h-12 w-12 object-contain rounded border bg-white p-1" />
          )}
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border hover:bg-muted transition-colors">
              {uploading ? 'Subiendo...' : logoUrl ? 'Cambiar logo' : 'Subir logo'}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
          </label>
          {logoUrl && (
            <button
              onClick={() => setLogoUrl('')}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
            >
              Quitar
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button onClick={handleSave} disabled={saving || uploading}>
          {saving ? 'Guardando...' : 'Guardar perfil'}
        </Button>
        {saved && <span className="text-sm text-green-600">¡Guardado!</span>}
      </div>
    </div>
  )
}
