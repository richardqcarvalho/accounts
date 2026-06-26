import { useMemo, useState } from 'react'
import { EntriesTable } from '@/components/entries-table'
import { EntryForm } from '@/components/entry-form'
import { useEntries } from '@/hooks/use-entries'
import { buildMonthlyGroups } from '@/lib/grouping'

function App() {
  const { entries, saveEntry, removeEntry } = useEntries()
  const [editing, setEditing] = useState(null)

  const groups = useMemo(() => buildMonthlyGroups(entries), [entries])

  function handleSubmit(entry) {
    saveEntry(entry)
    setEditing(null)
  }

  function handleRemove(key) {
    removeEntry(key)
    if (key === editing?.key) setEditing(null)
  }

  return (
    <div className="min-h-screen bg-muted/40 text-foreground">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold">Lançamentos</h1>

        <EntryForm
          editing={editing}
          onSubmit={handleSubmit}
          onCancel={() => setEditing(null)}
        />

        <EntriesTable
          groups={groups}
          editingKey={editing?.key}
          onEdit={setEditing}
          onRemove={handleRemove}
        />
      </main>
    </div>
  )
}

export default App
