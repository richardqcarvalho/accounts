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
  connect: (
    gistId: string,
    fingerprint: string,
    url: string,
    password: string,
  ) => Promise<void>
  create: (password: string) => Promise<{ id: string; url: string }>
  tryLoad: (password: string) => Promise<LoadedGist>
  peekFingerprint: (gistId: string) => Promise<string | null>
  disconnect: () => void
  scheduleSave: (entries: Entry[]) => void
}

const DEBOUNCE_MS = 2000

export function useSync(): UseSyncReturn {
  const [meta, setMeta] = useState<SyncMeta | null>(() => loadSyncMeta())
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [lastError, setLastError] = useState<string | null>(null)
  // Mantém a senha apenas em memória; perde-se no reload (segurança).
  const passwordRef = useRef<string | null>(null)
  const pendingEntries = useRef<Entry[] | null>(null)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortedRef = useRef(0) // token pra cancelar saves pendentes

  // Ao montar, carrega do localStorage.
  useEffect(() => {
    setMeta(loadSyncMeta())
  }, [])

  // Quando `meta` muda (criar/conectar/desconectar), persiste.
  useEffect(() => {
    if (meta) saveSyncMeta(meta)
    else clearSyncMeta()
  }, [meta])

  // Debounced save: agenda uma escrita. Só 1 request por vez; chamadas
  // subsequentes resetam o timer, descartando a entrada anterior.
  const scheduleSave = useCallback(
    (entries: Entry[]) => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      pendingEntries.current = entries
      const tick = ++abortedRef.current
      debounceTimer.current = setTimeout(() => {
        if (tick !== abortedRef.current) return
        const list = pendingEntries.current
        if (!list || !passwordRef.current || !meta?.gistId) return
        setStatus('saving')
        setLastError(null)
        saveGist(meta.gistId, passwordRef.current, list)
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
    },
    [meta?.gistId],
  )

  // Cria um Gist vazio cifrado; o caller decide a senha.
  const create = useCallback(async (password: string) => {
    setStatus('creating')
    setLastError(null)
    try {
      const { id, url } = await createGist(password)
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

  // Conecta a um Gist existente (com id + fingerprint + url conhecidos) e
  // guarda a senha na memória da sessão.
  const connect = useCallback(
    async (
      gistId: string,
      fingerprint: string,
      url: string,
      password: string,
    ) => {
      setStatus('connecting')
      setLastError(null)
      try {
        passwordRef.current = password
        setMeta({ gistId, url, fingerprint })
        setStatus('ok')
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setLastError(msg)
        setStatus('error')
        throw err
      }
    },
    [],
  )

  // Tenta carregar (descriptografar) o Gist conectado.
  const tryLoad = useCallback(
    async (password: string): Promise<LoadedGist> => {
      if (!meta) throw new Error('nenhum Gist conectado')
      setStatus('loading')
      setLastError(null)
      try {
        const loaded = await loadGist(meta.gistId, password)
        passwordRef.current = password
        setMeta({ ...meta, fingerprint: loaded.fingerprint })
        setStatus('ok')
        return loaded
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setLastError(msg)
        setStatus('error')
        throw err
      }
    },
    [meta],
  )

  // Olha só o fingerprint (útil pra pré-verificar antes de pedir senha).
  const peekFingerprint = useCallback(
    async (gistId: string): Promise<string | null> => {
      try {
        const raw = await fetch(
          `https://api.github.com/gists/${gistId}`,
          {
            headers: {
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
            },
          },
        )
        if (!raw.ok) return null
        const body: {
          files?: Record<string, { content?: string }>
        } = await raw.json()
        const ct = body.files?.['accounts.json']?.content
        if (!ct) return null
        const { fingerprint } = await import('@/lib/crypto')
        return fingerprint(JSON.parse(ct).payload)
      } catch {
        return null
      }
    },
    [],
  )

  const disconnect = useCallback(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    passwordRef.current = null
    pendingEntries.current = null
    ++abortedRef.current
    setMeta(null)
    setStatus('idle')
  }, [])

  return {
    meta,
    status,
    lastError,
    hasPassword: passwordRef.current !== null,
    connect,
    create,
    tryLoad,
    peekFingerprint,
    disconnect,
    scheduleSave,
  }
}
