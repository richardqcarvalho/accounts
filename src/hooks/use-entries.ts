import { useEffect, useState } from 'react'
import { deleteEntry, getAllEntries, putEntry } from '@/lib/db'
import type { Entry } from '@/types'

const byPeriodDesc = (a: Entry, b: Entry) => b.year - a.year || b.month - a.month

// Estado dos lançamentos com persistência no IndexedDB. Mantém a lista sempre
// ordenada do período mais recente para o mais antigo.
export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([])

  useEffect(() => {
    getAllEntries().then((stored) => setEntries([...stored].sort(byPeriodDesc)))
  }, [])

  async function saveEntry(entry: Entry) {
    await putEntry(entry)
    setEntries((prev) =>
      [...prev.filter((e) => e.key !== entry.key), entry].sort(byPeriodDesc),
    )
  }

  async function removeEntry(key: string) {
    await deleteEntry(key)
    setEntries((prev) => prev.filter((e) => e.key !== key))
  }

  // Insere/atualiza os lançamentos por key (merge — não apaga os existentes).
  async function importEntries(list: Entry[]) {
    for (const entry of list) {
      await putEntry(entry)
    }
    const stored = await getAllEntries()
    setEntries([...stored].sort(byPeriodDesc))
  }

  return { entries, saveEntry, removeEntry, importEntries }
}
