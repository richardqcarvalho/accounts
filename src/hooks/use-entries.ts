import { useEffect, useState } from 'react'
import { deleteEntry, getAllEntries, putEntry, resetEntries } from '@/lib/db'
import type { Entry } from '@/types'

const byPeriodDesc = (a: Entry, b: Entry) => b.year - a.year || b.month - a.month

export interface UseEntriesOptions {
  // Chamado quando uma entry é criada/editada — pra sincronizar com a nuvem.
  onUpsert?: (entry: Entry) => void
  // Chamado quando uma entry é removida.
  onDelete?: (key: string) => void
}

// Estado dos lançamentos com persistência no IndexedDB. Mantém a lista sempre
// ordenada do período mais recente para o mais antigo.
export function useEntries(options: UseEntriesOptions = {}) {
  const [entries, setEntries] = useState<Entry[]>([])
  const { onUpsert, onDelete } = options

  useEffect(() => {
    getAllEntries().then((stored) => {
      setEntries([...stored].sort(byPeriodDesc))
    })
  }, [])

  async function saveEntry(entry: Entry) {
    await putEntry(entry)
    setEntries((prev) =>
      [...prev.filter((e) => e.key !== entry.key), entry].sort(byPeriodDesc),
    )
    onUpsert?.(entry)
  }

  async function removeEntry(key: string) {
    await deleteEntry(key)
    setEntries((prev) => prev.filter((e) => e.key !== key))
    onDelete?.(key)
  }

  // Substitui tudo: apaga o state local e carrega as entries dadas. Usado ao
  // puxar da nuvem. Não dispara sync (a origem é a nuvem).
  async function resetTo(list: Entry[]) {
    await resetEntries(list)
    setEntries([...list].sort(byPeriodDesc))
  }

  return { entries, saveEntry, removeEntry, resetTo }
}
