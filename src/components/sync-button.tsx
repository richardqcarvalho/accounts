// Botão de sync + conta (GitHub via Supabase). O usuário já chega logado
// (o gate de login vive no App). Aqui mostramos o nome + menu com pull
// (baixar da nuvem), push (enviar local) e logout. A sync automática de cada
// mutação roda em segundo plano (via useSync no App); os botões aqui são pra
// resolver divergências manualmente (ex.: primeira vez numa máquina nova).

import { useState } from 'react'
import { Cloud, Download, Loader2, LogOut, RefreshCw, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { UseAuthReturn } from '@/hooks/use-auth'
import type { UseSyncReturn } from '@/hooks/use-sync'
import type { Entry } from '@/types'

interface SyncButtonProps {
  auth: UseAuthReturn
  sync: UseSyncReturn
  localEntries: Entry[]
  onLoadFromCloud: (entries: Entry[]) => void
}

export function SyncButton({
  auth,
  sync,
  localEntries,
  onLoadFromCloud,
}: SyncButtonProps) {
  const [open, setOpen] = useState(false)

  const busy = sync.status === 'syncing'

  async function handlePull() {
    try {
      const remote = await sync.pull()
      onLoadFromCloud(remote)
      toast.success(`Baixado da nuvem — ${remote.length} lançamento(s)`)
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  async function handlePush() {
    try {
      await sync.push(localEntries)
      toast.success(`Enviado pra nuvem — ${localEntries.length} lançamento(s)`)
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleLogout() {
    try {
      await auth.signOut()
      toast.success('Sessão encerrada')
      setOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  const name =
    (auth.user?.user_metadata?.user_name as string | undefined) ??
    (auth.user?.user_metadata?.name as string | undefined) ??
    auth.user?.email ??
    'conectado'

  const statusColor =
    sync.status === 'error'
      ? 'text-red-500'
      : sync.status === 'syncing'
        ? 'text-blue-400'
        : 'text-green-500'

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className={statusColor}>
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Cloud className="size-4" />
        )}
        {name}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sincronização</DialogTitle>
            <DialogDescription>
              Logado como <strong>{name}</strong>. Seus lançamentos sincronizam
              automaticamente. Use os botões abaixo pra resolver divergências
              entre este dispositivo e a nuvem.
            </DialogDescription>
          </DialogHeader>

          {sync.lastError && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {sync.lastError}
            </div>
          )}

          <div className="grid gap-2">
            <Button onClick={handlePull} disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Baixar da nuvem (substitui local)
            </Button>
            <Button variant="outline" onClick={handlePush} disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Enviar local pra nuvem ({localEntries.length})
            </Button>
            <Button variant="secondary" onClick={handlePull} disabled={busy}>
              <RefreshCw className="size-4" />
              Recarregar da nuvem
            </Button>
          </div>

          <DialogFooter>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="size-4" />
              Sair
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
