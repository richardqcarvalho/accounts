// Menu de perfil no header. Centraliza tudo relacionado à conta e à nuvem:
// dados do usuário (avatar, nome, @handle, email), switch de tema, status de
// sincronização com ação manual, e sign out.

import {
  Check,
  Cloud,
  CloudOff,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  RefreshCw,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { UseAuthReturn } from '@/hooks/use-auth'
import type { SyncStatus } from '@/hooks/use-sync'
import type { Theme } from '@/types'

const THEME_OPTIONS: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
]

interface ProfileMenuProps {
  auth: UseAuthReturn
  theme: Theme
  setTheme: (theme: Theme) => void
  syncStatus: SyncStatus
  onSyncNow: () => void
  onSignOut: () => void
}

export function ProfileMenu({
  auth,
  theme,
  setTheme,
  syncStatus,
  onSyncNow,
  onSignOut,
}: ProfileMenuProps) {
  const meta = auth.user?.user_metadata ?? {}
  const fullName = (meta.name as string | undefined)?.trim()
  const handle = meta.user_name as string | undefined
  const email = auth.user?.email
  const avatarUrl = meta.avatar_url as string | undefined

  // Nome principal exibido: nome completo → @handle → email → fallback.
  const primary = fullName || handle || email || 'Minha conta'
  const initial = primary.charAt(0).toUpperCase()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label="Perfil">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={primary}
              className="size-6 rounded-full object-cover"
            />
          ) : (
            <span className="text-sm font-medium">{initial}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* Cabeçalho com dados do usuário */}
        <div className="flex items-center gap-3 px-1.5 py-1.5">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={primary}
              className="size-9 rounded-full object-cover"
            />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-medium">
              {initial}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{primary}</div>
            {handle && fullName && (
              <div className="truncate text-xs text-muted-foreground">
                @{handle}
              </div>
            )}
            {email && (
              <div className="truncate text-xs text-muted-foreground">
                {email}
              </div>
            )}
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Status de sincronização + ação manual */}
        <SyncRow status={syncStatus} onSyncNow={onSyncNow} />

        <DropdownMenuSeparator />

        {/* Tema */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Sun className="size-4 dark:hidden" />
            <Moon className="hidden size-4 dark:block" />
            Tema
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {THEME_OPTIONS.map(({ value, label, icon: Icon }) => (
              <DropdownMenuItem key={value} onClick={() => setTheme(value)}>
                <Icon className="size-4" />
                {label}
                {theme === value && <Check className="ml-auto size-4" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={onSignOut}>
          <LogOut className="size-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Linha de status de sync no menu. Mostra o estado atual e permite
// disparar um pull manual (exceto enquanto já sincroniza).
function SyncRow({
  status,
  onSyncNow,
}: {
  status: SyncStatus
  onSyncNow: () => void
}) {
  const { icon: Icon, label, className, spin } = describe(status)
  return (
    <DropdownMenuItem
      // Não fecha o menu ao clicar; deixa o usuário ver a transição de estado.
      onSelect={(e) => {
        e.preventDefault()
        if (status !== 'syncing') onSyncNow()
      }}
      disabled={status === 'syncing'}
    >
      <Icon className={`size-4 ${spin ? 'animate-spin' : ''} ${className}`} />
      <span className={className}>{label}</span>
      {status !== 'syncing' && (
        <RefreshCw className="ml-auto size-3.5 text-muted-foreground" />
      )}
    </DropdownMenuItem>
  )
}

function describe(status: SyncStatus): {
  icon: LucideIcon
  label: string
  className: string
  spin: boolean
} {
  switch (status) {
    case 'syncing':
      return { icon: Loader2, label: 'Sincronizando…', className: '', spin: true }
    case 'error':
      return {
        icon: CloudOff,
        label: 'Erro — salvo localmente',
        className: 'text-red-500',
        spin: false,
      }
    default:
      return { icon: Cloud, label: 'Sincronizado', className: '', spin: false }
  }
}
