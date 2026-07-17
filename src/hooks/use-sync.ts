// Hook que orquestra a sincronização (criar, carregar, salvar) do Gist.
//
// A senha fica viva apenas na sessão (variável em memória, nunca persiste).
// A cada mudança em `entries` o hook agenda uma sincronização debounced de
// ~2 s: tempo de escrever várias coisas em série sem martelar o GitHub API.

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createGist,
  loadGist,
  saveGist,
  type LoadedGist,
} from '@/lib/sync'
import {
  clearSyncMeta,
  loadSyncMeta,
  saveSyncMeta,
  type SyncMeta,
} from '@/lib/sync-storage'
import type { Entry } from '@/types'

export type SyncStatus =
  | 'idle'
  | 'connecting'
  | 'creating'
  | 'saving'
  | 'loading'
  | 'ok'
  | 'error'

export interface UseSyncReturn {
  meta: SyncMeta | null
  status: SyncStatus
  lastError: string | null
  hasPassword: boolean
  create: (password: string, initialEntries?: Entry[]) => Promise<{ id: string; url: string }>
  load: (gistId: string, password: string) => Promise<LoadedGist>
  scheduleSave: (entries: Entry[]) => void
  flushSave: (entries: Entry[]) => Promise<void>
  peekFingerprint: (gistId: string) => Promise<string | null>
  disconnect: () => void
}

const DEBOUNCE_MS = 2000
const FILENAME = 'accounts.json'

export function useSync(initialId?: string): UseSyncReturn {
  const [meta, setMeta] = useState<SyncMeta | null>(() => {
    const stored = loadSyncMeta()
    if (stored) return stored
    if (initialId) {
      const m: SyncMeta = { gistId: initialId, url: `https://gist.github.com/${initialId}`, fingerprint: null }
      saveSyncMeta(m)
      return m
    }
    return null
  })
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [lastError, setLastError] = useState<string | null>(null)
  const passwordRef = useRef<string | null>(null)
  const pendingEntries = useRef<Entry[] | null>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cancelledRef = useRef(0)

  // Quando meta muda, persiste/clear.
  useEffect(() => {
    if (meta) saveSyncMeta(meta)
    else clearSyncMeta()
  }, [meta?.gistId])

  // Debounced save: agenda. Um ticket (cancelledRef) cancela saves antigos.
  const scheduleSave = useCallback((entries: Entry[]) => {
    if (!meta?.gistId || !passwordRef.current) return
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    pendingEntries.current = entries
    const ticket = ++cancelledRef.current
    debounceTimer.current = setTimeout(() => {
      if (ticket !== cancelledRef.current) return
      const list = pendingEntries.current
      const pwd = passwordRef.current
      if (!list || !pwd || !meta.gistId) return
      setStatus('saving')
      setLastError(null)
      saveGist(meta.gistId, pwd, list)
        .then(() => {
          setMeta((m) => (m ? { ...m, fingerprint: null } : m))
          setStatus('ok')
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : String(err)
          setLastError(msg)
          setStatus('error')
        })
    }, DEBOUNCE_MS)
  }, [meta?.gistId])

  const flushSave = useCallback(async (entries: Entry[]) => {
    if (!meta?.gistId || !passwordRef.current) return
    setStatus('saving')
    setLastError(null)
    try {
      await saveGist(meta.gistId, passwordRef.current, entries)
      setMeta((m) => (m ? { ...m, fingerprint: null } : m))
      setStatus('ok')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setLastError(msg)
      setStatus('error')
      throw err
    }
  }, [meta?.gistId])

  const create = useCallback(async (password: string, initialEntries: Entry[] = []) => {
    setStatus('creating')
    setLastError(null)
    try {
      const { id, url } = await createGist(password, initialEntries)
      passwordRef.current = password
      setMeta({ gistId: id, url, fingerprint: null })
      setStatus('ok')
      return { id, url }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setLastError(msg)
      setStatus('error')
      throw err
    }
  }, [])

  const load = useCallback(async (gistId: string, password: string): Promise<LoadedGist> => {
    setStatus('loading')
    setLastError(null)
    try {
      const loaded = await loadGist(gistId, password)
      passwordRef.current = password
      setMeta({ gistId, url: `https://gist.github.com/${gistId}`, fingerprint: loaded.fingerprint })
      setStatus('ok')
      return loaded
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setLastError(msg)
      setStatus('error')
      throw err
    }
  }, [])

  const peekFingerprint = useCallback(async (gistId: string): Promise<string | null> => {
    try {
      const res = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      })
      if (!res.ok) return null
      const body: { files?: Record<string, { content?: string }> } = await res.json()
      const raw = body.files?.[FILENAME]?.content
      if (!raw) return null
      const outer: { payload?: { ct?: string } } = JSON.parse(raw)
      if (!outer?.payload?.ct) return null
      const { fingerprint } = await import('@/lib/crypto')
      return fingerprint(outer.payload as never)
    } catch {
      return null
    }
  }, [])

  const disconnect = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    passwordRef.current = null
    pendingEntries.current = null
    ++cancelledRef.current
    setMeta(null)
    setStatus('idle')
  }, [])

  return {
    meta,
    status,
    lastError,
    hasPassword: passwordRef.current !== null,
    create,
    load,
    scheduleSave,
    flushSave,
    peekFingerprint,
    disconnect,
  }
}
