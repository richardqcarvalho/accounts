// Armazenamento local de metadados da sync. NÃO guarda a senha nem a chave —
// só o identificador do Gist (público, inútil sozinho).
// Usa localStorage por simplicidade; pode migrar pra IndexedDB depois.

const KEY = 'accounts:sync'

export interface SyncMeta {
  gistId: string
  url: string
  // Fingerprint do payload lido da última vez; ajuda o usuário a reconhecer
  // o Gist correto ao reabrir o app ou mudar de máquina.
  fingerprint: string | null
}

export function loadSyncMeta(): SyncMeta | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const m = JSON.parse(raw)
    if (typeof m.gistId !== 'string' || !m.gistId) return null
    return m as SyncMeta
  } catch {
    return null
  }
}

export function saveSyncMeta(meta: SyncMeta): void {
  localStorage.setItem(KEY, JSON.stringify(meta))
}

export function clearSyncMeta(): void {
  localStorage.removeItem(KEY)
}
