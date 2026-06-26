import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { BackupButtons } from '@/components/backup-buttons'
import { EntriesTable } from '@/components/entries-table'
import { EntryForm } from '@/components/entry-form'
import { ThemeToggle } from '@/components/theme-toggle'
import { Toaster } from '@/components/ui/sonner'
import { useEntries } from '@/hooks/use-entries'
import { useTheme } from '@/hooks/use-theme'
import { buildMonthlyGroups } from '@/lib/grouping'

function App() {
  const { entries, saveEntry, removeEntry, importEntries } = useEntries()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)

  const groups = useMemo(() => buildMonthlyGroups(entries), [entries])

  function openNew() {
    setEditing(null)
    setOpen(true)
  }

  function openEdit(entry) {
    setEditing(entry)
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setEditing(null)
  }

  function handleSubmit(entry) {
    saveEntry(entry)
    // Edição fecha o modal; adição mantém aberto para lançar vários seguidos.
    if (editing) closeModal()
  }

  function handleRemove(key) {
    removeEntry(key)
    if (key === editing?.key) closeModal()
  }

  return (
    <div className="min-h-screen bg-muted/40 text-foreground">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Lançamentos</h1>
          <div className="flex flex-wrap gap-2">
            <ThemeToggle theme={theme} setTheme={setTheme} />
            <BackupButtons entries={entries} onImport={importEntries} />
            <Button onClick={openNew}>
              <Plus className="size-4" />
              Novo lançamento
            </Button>
          </div>
        </div>

        <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeModal())}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editing ? 'Editar lançamento' : 'Novo lançamento'}
              </DialogTitle>
              <DialogDescription>
                {editing
                  ? 'Altere os dados do lançamento.'
                  : 'Registre um faturamento ou imposto extra.'}
              </DialogDescription>
            </DialogHeader>
            <EntryForm
              editing={editing}
              onSubmit={handleSubmit}
              onCancel={closeModal}
            />
          </DialogContent>
        </Dialog>

        <EntriesTable
          groups={groups}
          editingKey={editing?.key}
          onEdit={openEdit}
          onRemove={handleRemove}
        />
      </main>

      <Toaster theme={resolvedTheme} richColors position="top-center" />
    </div>
  )
}

export default App
