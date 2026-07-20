// Indicador de erro de sincronização no header. Fica invisível em estado
// normal — só aparece quando há falha, pra o usuário perceber sem precisar
// abrir o menu de perfil. Sucesso/andamento ficam no ProfileMenu.

import { CloudOff } from 'lucide-react'
import type { SyncStatus } from '@/hooks/use-sync'

interface SyncIndicatorProps {
  status: SyncStatus
}

export function SyncIndicator({ status }: SyncIndicatorProps) {
  if (status !== 'error') return null
  return (
    <span
      className="flex items-center gap-1 text-xs text-red-500"
      title="Erro ao sincronizar — as alterações ficam salvas localmente"
    >
      <CloudOff className="size-4" />
    </span>
  )
}
