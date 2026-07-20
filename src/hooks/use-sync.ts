// Hook de sincronização com o Supabase.
//
// Estratégia: o IndexedDB local continua sendo o cache rápido/offline. Quando
// há sessão, cada mutação também é enviada ao Supabase (upsert individual, com
// debounce). O usuário pode puxar (pull) o estado da nuvem ou empurrar (push)
// o estado local inteiro.
//
// Não faz merge automático sofisticado: pull substitui o local, push substitui
// o remoto. O usuário decide a direção quando os dois divergem (ex.: primeira
// vez logando numa máquina nova).

import { useCallback, useRef, useState } from 'react'
import {
  fetchRemoteEntries,
  replaceRemoteEntries,
  upsertRemoteEntry,
  deleteRemoteEntry,
} from '@/lib/remote-entries'
import type { Entry } from '@/types'

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error'

export interface UseSyncOptions {
  // ID do usuário logado (null quando deslogado). Sem ele, as operações
  // remotas viram no-ops — o app funciona só com o cache local.
  userId: string | null
}

export interface UseSyncReturn {
  status: SyncStatus
  lastError: string | null
  // Puxa todas as entries da nuvem (fonte da verdade = remoto).
  pull: () => Promise<Entry[]>
  // Empurra o estado local inteiro pra nuvem (fonte da verdade = local).
  push: (entries: Entry[]) => Promise<void>
  // Sincroniza uma única mutação (upsert) com debounce.
  syncUpsert: (entry: Entry) => void
  // Sincroniza uma remoção.
  syncDelete: (key: string) => void
}

const DEBOUNCE_MS = 800

export function useSync({ userId }: UseSyncOptions): UseSyncReturn {
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [lastError, setLastError] = useState<string | null>(null)
  // Fila de upserts pendentes por key (dedup: só o último valor importa).
  const pendingUpserts = useRef<Map<string, Entry>>(new Map())
  const pendingDeletes = useRef<Set<string>>(new Set())
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(async () => {
    if (!userId) return
    const upserts = [...pendingUpserts.current.values()]
    const deletes = [...pendingDeletes.current]
    pendingUpserts.current.clear()
    pendingDeletes.current.clear()
    if (upserts.length === 0 && deletes.length === 0) return

    setStatus('syncing')
    setLastError(null)
    try {
      for (const entry of upserts) await upsertRemoteEntry(userId, entry)
      for (const key of deletes) await deleteRemoteEntry(key)
      setStatus('ok')
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err))
      setStatus('error')
    }
  }, [userId])

  const schedule = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => void flush(), DEBOUNCE_MS)
  }, [flush])

  const syncUpsert = useCallback(
    (entry: Entry) => {
      if (!userId) return
      pendingDeletes.current.delete(entry.key)
      pendingUpserts.current.set(entry.key, entry)
      schedule()
    },
    [userId, schedule],
  )

  const syncDelete = useCallback(
    (key: string) => {
      if (!userId) return
      pendingUpserts.current.delete(key)
      pendingDeletes.current.add(key)
      schedule()
    },
    [userId, schedule],
  )

  const pull = useCallback(async (): Promise<Entry[]> => {
    if (!userId) throw new Error('Não autenticado')
    setStatus('syncing')
    setLastError(null)
    try {
      const entries = await fetchRemoteEntries()
      setStatus('ok')
      return entries
    } catch (err) {
      setLastError(err instanceof Error ? err.message : String(err))
      setStatus('error')
      throw err
    }
  }, [userId])

  const push = useCallback(
    async (entries: Entry[]) => {
      if (!userId) throw new Error('Não autenticado')
      setStatus('syncing')
      setLastError(null)
      try {
        await replaceRemoteEntries(userId, entries)
        setStatus('ok')
      } catch (err) {
        setLastError(err instanceof Error ? err.message : String(err))
        setStatus('error')
        throw err
      }
    },
    [userId],
  )

  return { status, lastError, pull, push, syncUpsert, syncDelete }
}
