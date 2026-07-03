import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { EntitySwitch } from '@/components/entity-switch'
import { EntryForm } from '@/components/entry-form'
import { FatorRCard } from '@/components/fator-r-card'
import { MonthDetail } from '@/components/month-detail'
import { MonthSummary } from '@/components/month-summary'
import type { SummaryItem } from '@/components/month-summary'
import { MonthTabs } from '@/components/month-tabs'
import { PersonalDetail } from '@/components/personal-detail'
import { ThemeToggle } from '@/components/theme-toggle'
import { useEntries } from '@/hooks/use-entries'
import { useTheme } from '@/hooks/use-theme'
import { buildMonthlyGroups } from '@/lib/grouping'
import { buildPersonalGroups } from '@/lib/personal'
import { formatBRL, formatReais } from '@/lib/format'
import type { Entity, Entry, RemoveRequest } from '@/types'

const keyOf = (x: { year: number; month: number }) => `${x.year}-${x.month}`

function App() {
  const { entries, saveEntry, removeEntry, importEntries } = useEntries()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [entity, setEntity] = useState<Entity>('pf')
  const [editing, setEditing] = useState<Entry | null>(null)
  const [open, setOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<RemoveRequest | null>(null)

  const pjGroups = useMemo(
    () => buildMonthlyGroups(entries.filter((e) => e.entity === 'pj')),
    [entries],
  )
  const pfGroups = useMemo(
    () => buildPersonalGroups(entries.filter((e) => e.entity === 'pf'), pjGroups),
    [entries, pjGroups],
  )

  const isPersonal = entity === 'pf'
  const months = isPersonal ? pfGroups : pjGroups
  // Seleções tipadas por visão para o TS estreitar corretamente cada bloco.
  const pick = <T extends { month: number; year: number }>(list: T[]) =>
    list.find((g) => keyOf(g) === selectedKey) ?? list[0] ?? null
  const pjSelected = pick(pjGroups)
  const pfSelected = pick(pfGroups)
  const selected = isPersonal ? pfSelected : pjSelected

  // Resumo do topo (faturamento/entrada, descontos, líquido) conforme a visão.
  const summary: SummaryItem[] =
    isPersonal && pfSelected
      ? [
          { label: 'Entrada', value: formatBRL(pfSelected.incomeCents) },
          { label: 'Descontos', value: formatBRL(pfSelected.extraCents) },
          {
            label: 'Líquido',
            value: formatBRL(pfSelected.netCents),
            tone: pfSelected.netCents < 0 ? 'negative' : 'positive',
          },
        ]
      : !isPersonal && pjSelected
        ? [
            { label: 'Faturamento', value: formatBRL(pjSelected.cents) },
            { label: 'Descontos', value: formatReais(pjSelected.taxes.total) },
            {
              label: 'Líquido',
              value: formatReais(pjSelected.taxes.net),
              tone: pjSelected.taxes.net < 0 ? 'negative' : 'positive',
            },
          ]
        : []

  function openNew() {
    setEditing(null)
    setOpen(true)
  }

  function openEdit(entry: Entry) {
    setEditing(entry)
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setEditing(null)
  }

  function handleSubmit(entry: Entry) {
    saveEntry(entry)
    setSelectedKey(keyOf(entry)) // foca no mês do lançamento
    closeModal()
  }

  function confirmRemove() {
    if (pendingDelete) {
      removeEntry(pendingDelete.key)
      if (pendingDelete.key === editing?.key) closeModal()
    }
    setPendingDelete(null)
  }

  return (
    <div className="min-h-screen bg-muted/40 text-foreground">
      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
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
          <EntitySwitch value={entity} onChange={setEntity} />
        </div>

        {selected ? (
          <div className="space-y-6">
            <MonthTabs
              groups={months}
              selectedKey={keyOf(selected)}
              onSelect={setSelectedKey}
            />
            <MonthSummary items={summary} />
            {isPersonal
              ? pfSelected && (
                  <PersonalDetail
                    group={pfSelected}
                    editingKey={editing?.key}
                    onEdit={openEdit}
                    onRequestRemove={setPendingDelete}
                  />
                )
              : pjSelected && (
                  <>
                    <FatorRCard
                      group={pjSelected}
                      onEdit={openEdit}
                      onRequestRemove={setPendingDelete}
                    />
                    <MonthDetail
                      group={pjSelected}
                      editingKey={editing?.key}
                      onEdit={openEdit}
                      onRequestRemove={setPendingDelete}
                    />
                  </>
                )}
          </div>
        ) : (
          <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
            {isPersonal
              ? 'Nenhum líquido da PJ ainda. Registre faturamentos na Pessoa Jurídica para começar.'
              : 'Nenhum lançamento ainda. Clique em "Novo lançamento" para começar.'}
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
                  : isPersonal
                    ? 'Registre um desconto sobre o líquido da PJ.'
                    : 'Registre um faturamento ou imposto extra.'}
              </DialogDescription>
            </DialogHeader>
            <EntryForm
              entity={entity}
              editing={editing}
              defaultMonth={selected?.month}
              defaultYear={selected?.year}
              onSubmit={handleSubmit}
              onCancel={closeModal}
            />
          </DialogContent>
        </Dialog>

        <AlertDialog
          open={pendingDelete !== null}
          onOpenChange={(o) => !o && setPendingDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingDelete
                  ? `“${pendingDelete.label}” no valor de ${formatBRL(pendingDelete.cents)} será removido. Essa ação não pode ser desfeita.`
                  : null}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={confirmRemove}>
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>

      <Toaster theme={resolvedTheme} richColors position="top-center" />
    </div>
  )
}

export default App
