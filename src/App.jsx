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
import { Toaster } from '@/components/ui/sonner'
import { BackupButtons } from '@/components/backup-buttons'
import { EntryForm } from '@/components/entry-form'
import { MonthDetail } from '@/components/month-detail'
import { MonthSummary } from '@/components/month-summary'
import { MonthTabs } from '@/components/month-tabs'
import { ThemeToggle } from '@/components/theme-toggle'
import { useEntries } from '@/hooks/use-entries'
import { useTheme } from '@/hooks/use-theme'
import { buildMonthlyGroups } from '@/lib/grouping'

const keyOf = (x) => `${x.year}-${x.month}`

function App() {
  const { entries, saveEntry, removeEntry, importEntries } = useEntries()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [editing, setEditing] = useState(null)
  const [open, setOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState(null)

  const groups = useMemo(() => buildMonthlyGroups(entries), [entries])
  const selected = groups.find((g) => keyOf(g) === selectedKey) ?? groups[0] ?? null

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
    setSelectedKey(keyOf(entry)) // foca no mês do lançamento
    closeModal()
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

        {selected ? (
          <div className="space-y-6">
            <MonthTabs
              groups={groups}
              selectedKey={keyOf(selected)}
              onSelect={setSelectedKey}
            />
            <MonthSummary group={selected} />
            <MonthDetail
              group={selected}
              editingKey={editing?.key}
              onEdit={openEdit}
              onRemove={handleRemove}
            />
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
            Nenhum lançamento ainda. Clique em "Novo lançamento" para começar.
          </div>
        )}

        <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : closeModal())}>
          <DialogContent showCloseButton={false}>
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
      </main>

      <Toaster theme={resolvedTheme} richColors position="top-center" />
    </div>
  )
}

export default App
