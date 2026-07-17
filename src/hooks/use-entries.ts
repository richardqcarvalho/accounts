import { useEffect, useState } from 'react'
import { deleteEntry, getAllEntries, putEntry, resetEntries } from '@/lib/db'
import type { Entry } from '@/types'

const byPeriodDesc = (a: Entry, b: Entry) => b.year - a.year || b.month - a.month

export interface UseEntriesOptions {
  // Invocado após cada mutação (salvar/remover/importar/resetar) com a nova
  // lista ordenada. Usado pra enfileirar sync com a nuvem, por exemplo.
  onChange?: (entries: Entry[]) => void
}

// Estado dos lançamentos com persistência no IndexedDB. Mantém a lista sempre
// ordenada do período mais recente para o mais antigo.
export function useEntries(options: UseEntriesOptions = {}) {
  const [entries, setEntries] = useState<Entry[]>([])
  const { onChange } = options

  useEffect(() => {
    getAllEntries().then((stored) => {
      const sorted = [...stored].sort(byPeriodDesc)
      setEntries(sorted)
      onChange?.(sorted)
    })
  }, [])

  async function saveEntry(entry: Entry) {
    await putEntry(entry)
    setEntries((prev) => {
      const next = [...prev.filter((e) => e.key !== entry.key), entry].sort(
        byPeriodDesc,
      )
      onChange?.(next)
      return next
    })
  }

  async function removeEntry(key: string) {
    await deleteEntry(key)
    setEntries((prev) => {
      const next = prev.filter((e) => e.key !== key)
      onChange?.(next)
      return next
    })
  }

  // Insere/atualiza os lançamentos por key (merge — não apaga os existentes).
  async function importEntries(list: Entry[]) {
    for (const entry of list) {
      await putEntry(entry)
    }
    const stored = await getAllEntries()
    const next = [...stored].sort(byPeriodDesc)
    setEntries(next)
    onChange?.(next)
  }

  // Substitui tudo: apaga o state local e carrega as entries dadas. Usado ao
  // abrir um backup ou recarregar da nuvem.
  async function resetTo(list: Entry[]) {
    await resetEntries(list)
    const next = [...list].sort(byPeriodDesc)
    setEntries(next)
    onChange?.(next)
  }

  return { entries, saveEntry, removeEntry, importEntries, resetTo }
}
