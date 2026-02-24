'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import type { WorkspaceMember, Workspace } from '@/lib/types'

interface Member extends WorkspaceMember {
  email?: string
}

interface Props {
  workspace: Workspace
  members: Member[]
  currentUserId: string
}

export function MembersPanel({ workspace, members, currentUserId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [inviteEmail, setInviteEmail] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const isOwner = workspace.owner_id === currentUserId

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const res = await fetch('/api/workspace/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail, workspaceId: workspace.id }),
    })

    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Error al invitar')
    } else {
      setMessage(`${inviteEmail} agregado al workspace.`)
      setInviteEmail('')
      router.refresh()
    }
    setLoading(false)
  }

  async function handleLeave() {
    if (!confirm('¿Seguro que quieres abandonar este workspace?')) return
    const { error } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', workspace.id)
      .eq('user_id', currentUserId)

    if (error) {
      setError(error.message)
    } else {
      router.push('/planner')
      router.refresh()
    }
  }

  async function handleCreateWorkspace() {
    const name = prompt('Nombre del nuevo workspace:')
    if (!name?.trim()) return

    const { data: ws, error: wsError } = await supabase
      .from('workspaces')
      .insert({ name: name.trim(), owner_id: currentUserId })
      .select()
      .single()

    if (wsError) { setError(wsError.message); return }

    await supabase.from('workspace_members').insert({
      workspace_id: ws.id,
      user_id: currentUserId,
      role: 'owner',
    })

    setMessage(`Workspace "${name}" creado.`)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Miembros actuales */}
      <div>
        <h2 className="font-semibold mb-3">Miembros ({members.length})</h2>
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between bg-card border rounded-lg px-4 py-2.5">
              <span className="text-sm">{m.email ?? m.user_id}</span>
              <Badge variant={m.role === 'owner' ? 'default' : 'secondary'}>
                {m.role === 'owner' ? 'Propietario' : 'Miembro'}
              </Badge>
            </li>
          ))}
        </ul>
      </div>

      {/* Invitar miembro */}
      {isOwner && (
        <div>
          <h2 className="font-semibold mb-3">Invitar persona</h2>
          <form onSubmit={handleInvite} className="flex gap-2">
            <Input
              type="email"
              placeholder="email@ejemplo.com"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              required
            />
            <Button type="submit" disabled={loading}>
              {loading ? '...' : 'Invitar'}
            </Button>
          </form>
        </div>
      )}

      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}
      {message && <p className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-md">{message}</p>}

      {/* Acciones */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={handleCreateWorkspace}>
          + Nuevo workspace
        </Button>
        {!isOwner && (
          <Button variant="destructive" onClick={handleLeave}>
            Abandonar workspace
          </Button>
        )}
      </div>
    </div>
  )
}
