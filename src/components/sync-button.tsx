// Botão de status da sync. Abre um modal com fluxo: sem gist → criar/conectar;
// com gist → desbloquear a sessão ou disconnect.

import { useState } from 'react'
import {
  Cloud,
  CloudOff,
  Loader2,
  RefreshCw,
  Shield,
  Trash2,
} from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { UseSyncReturn } from '@/hooks/use-sync'
import type { Entry } from '@/types'

interface SyncButtonProps {
  sync: UseSyncReturn
  // Current local entries — enviados na criação do Gist pra evitar roundtrip.
  localEntries: Entry[]
  // Callback pra carregar entries da nuvem no state local (replacement).
  onLoadFromCloud?: (entries: Entry[]) => void
}

type Step = 'menu' | 'create' | 'connect' | 'unlock'

export function SyncButton({
  sync,
  localEntries,
  onLoadFromCloud,
}: SyncButtonProps) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<Step>('menu')
  const [gistId, setGistId] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const hasMeta = !!sync.meta
  const isSaving = sync.status === 'saving'
  const isError = sync.status === 'error'
  const isLoading = sync.status === 'loading' || sync.status === 'creating'

  function openDialog() {
    setGistId(sync.meta?.gistId ?? '')
    setPassword('')
    setConfirmPassword('')
    setStep(hasMeta ? 'unlock' : 'menu')
    setOpen(true)
  }

  async function handleCreate() {
    if (password !== confirmPassword) {
      toast.error('As senhas não conferem')
      return
    }
    if (password.length < 8) {
      toast.error('Use uma senha com ao menos 8 caracteres')
      return
    }
    try {
      // Cria Gist já com as entries locais (evita 2ª write).
      const { url } = await sync.create(password, localEntries)
      toast.success('Gist criado com backup local', {
        description: `URL: ${url}`,
        duration: 8000,
      })
      // Copia URL pro clipboard, se possível.
      navigator.clipboard?.writeText(url)?.catch(() => {})
      setOpen(false)
    } catch {
      // erro já registrado no hook e mostrado via lastError no UI
    }
  }

  async function handleConnect() {
    if (!gistId.trim()) {
      toast.error('Insira o ID do Gist')
      return
    }
    const cleanId = gistId.includes('gist.github.com')
      ? gistId.split('/').pop() ?? gistId
      : gistId.trim()
    try {
      const loaded = await sync.load(cleanId, password)
      if (onLoadFromCloud) onLoadFromCloud(loaded.entries)
      toast.success(`Gist carregado — ${loaded.entries.length} lançamento(s)`)
      setOpen(false)
    } catch {
      // erro exibido via toast
    }
  }

  async function handleUnlockExisting() {
    if (!sync.meta) return
    try {
      const loaded = await sync.load(sync.meta.gistId, password)
      if (onLoadFromCloud) onLoadFromCloud(loaded.entries)
      toast.success('Sessão desbloqueada — entries recarregadas')
      setOpen(false)
    } catch {
      // erro no toast
    }
  }

  const Icon = hasMeta
    ? isLoading
      ? Loader2
      : isError
        ? CloudOff
        : isSaving
          ? RefreshCw
          : Cloud
    : CloudOff

  const statusClasses = hasMeta
    ? isLoading
      ? 'text-yellow-500'
      : isError
        ? 'text-red-500'
        : isSaving
          ? 'text-orange-400'
          : 'text-green-500'
    : 'text-muted-foreground'

  return (
    <>
      <Button
        variant="outline"
        onClick={openDialog}
        className={statusClasses}
      >
        <Icon className={`size-4 ${isLoading || isSaving ? 'animate-spin' : ''}`} />
        {hasMeta ? 'Nuvem' : 'Offline'}
      </Button>

      <Dialog open={open} onOpenChange={(v) => (v ? openDialog() : setOpen(false))}>
        <DialogContent>
          {step === 'menu' && (
            <>
              <DialogHeader>
                <DialogTitle>Sincronização pela nuvem</DialogTitle>
                <DialogDescription>
                  Seus lançamentos ficam cifrados num Gist do GitHub e podem ser
                  abertos em qualquer máquina com a mesma senha.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2">
                <Button variant="outline" onClick={() => setStep('create')}>
                  Criar um novo Gist cifrado
                </Button>
                <Button variant="outline" onClick={() => setStep('connect')}>
                  Conectar a um Gist existente
                </Button>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}

          {step === 'create' && (
            <>
              <DialogHeader>
                <DialogTitle>Criar Gist cifrado</DialogTitle>
                <DialogDescription>
                  Será criado um Gist público contendo{' '}
                  <strong>apenas a cifra</strong>. Anote a URL e senha —
                  nenhuma delas pode ser recuperada.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="text-xs text-muted-foreground">
                  <Shield className="mr-1 inline size-3" />
                  PBKDF2-SHA256 (600.000 iterações) + AES-GCM-256. A senha fica
                  apenas na memória desta sessão.
                </div>
                <div className="text-xs text-muted-foreground">
                  Seus {localEntries.length} lançamento(s) local(is) serão
                  enviados na criação, sem roundtrip extra.
                </div>
                <div className="grid gap-1">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label>Confirme a senha</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {sync.lastError && sync.status === 'error' && (
                  <div className="text-sm text-destructive">{sync.lastError}</div>
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setStep('menu')}>
                  Voltar
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={sync.status === 'creating'}
                >
                  {sync.status === 'creating' ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Criar e conectar
                </Button>
              </DialogFooter>
            </>
          )}

          {step === 'connect' && (
            <>
              <DialogHeader>
                <DialogTitle>Conectar Gist existente</DialogTitle>
                <DialogDescription>
                  Insira o ID do Gist (ou URL completa) e sua senha. O app vai
                  <strong> substituir os dados locais</strong> pelos da nuvem.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <Label>ID do Gist</Label>
                  <Input
                    value={gistId}
                    onChange={(e) => setGistId(e.target.value)}
                    placeholder="abcdef123456..."
                  />
                </div>
                <div className="grid gap-1">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                {sync.lastError &&
                  (sync.status === 'loading' || sync.status === 'error') && (
                    <div className="text-sm text-destructive">{sync.lastError}</div>
                  )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setStep('menu')}>
                  Voltar
                </Button>
                <Button
                  onClick={handleConnect}
                  disabled={sync.status === 'loading'}
                >
                  {sync.status === 'loading' ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : null}
                  Carregar da nuvem
                </Button>
              </DialogFooter>
            </>
          )}

          {step === 'unlock' && sync.meta && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {sync.hasPassword ? 'Gist conectado' : 'Desbloquear Gist'}
                </DialogTitle>
                <DialogDescription>
                  <a
                    href={sync.meta.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-3 hover:text-foreground"
                  >
                    Abrir no GitHub
                  </a>
                  {' · '}
                  {sync.hasPassword ? (
                    <>
                      {sync.lastError ? (
                        <>
                          <span className="text-red-500">erro</span> — {sync.lastError}
                        </>
                      ) : sync.status === 'ok' ? (
                        <span className="text-green-500">ok</span>
                      ) : (
                        <span>{sync.status}</span>
                      )}
                    </>
                  ) : (
                    'precisa de senha para liberar esta sessão'
                  )}
                </DialogDescription>
              </DialogHeader>
              {!sync.hasPassword && (
                <div className="grid gap-1">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="destructive"
                  onClick={() => {
                    sync.disconnect()
                    toast.success('Gist desconectado')
                    setStep('menu')
                  }}
                >
                  <Trash2 className="mr-2 size-4" />
                  Desconectar
                </Button>
                {!sync.hasPassword && (
                  <Button
                    onClick={handleUnlockExisting}
                    disabled={sync.status === 'loading'}
                  >
                    {sync.status === 'loading' ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : null}
                    Desbloquear
                  </Button>
                )}
                {sync.hasPassword && onLoadFromCloud && (
                  <Button
                    variant="outline"
                    onClick={handleUnlockExisting}
                    disabled={sync.status === 'loading'}
                  >
                    {sync.status === 'loading' ? (
                      <Loader2 className="mr-2 size-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 size-4" />
                    )}
                    Recarregar da nuvem
                  </Button>
                )}
                {sync.hasPassword && (
                  <Button onClick={() => setOpen(false)}>Fechar</Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
