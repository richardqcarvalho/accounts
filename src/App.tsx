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
import { currentMonth, currentYear } from '@/lib/calendar'
import { formatBRL, formatReais } from '@/lib/format'
import type {
  DescontoOccurrence,
  Entity,
  Entry,
  MonthOverride,
  Recurrence,
  RemoveRequest,
} from '@/types'

const keyOf = (x: { year: number; month: number }) => `${x.year}-${x.month}`

function App() {
  const { entries, saveEntry, removeEntry, importEntries } = useEntries()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [entity, setEntity] = useState<Entity>('pf')
  const [editing, setEditing] = useState<Entry | null>(null)
  // Ocorrência (mês) sendo editada numa série da PF; null = edição normal.
  const [editingOccurrence, setEditingOccurrence] =
    useState<DescontoOccurrence | null>(null)
  const [open, setOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<RemoveRequest | null>(null)
  // Salvamento aguardando escolha de escopo (mês vs série toda).
  const [pendingSave, setPendingSave] = useState<{
    entry: Entry
    occurrence: DescontoOccurrence
  } | null>(null)

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
  // Seleção: o mês escolhido; sem escolha, começa no mês atual (ou no mais
  // recente, se o atual não estiver na lista). Tipada por visão p/ o TS estreitar.
  const currentKey = `${currentYear}-${currentMonth}`
  const pick = <T extends { month: number; year: number }>(list: T[]) =>
    list.find((g) => keyOf(g) === selectedKey) ??
    list.find((g) => keyOf(g) === currentKey) ??
    list[0] ??
    null
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
    setEditingOccurrence(null)
    setOpen(true)
  }

  function openEdit(entry: Entry) {
    setEditing(entry)
    setEditingOccurrence(null)
    setOpen(true)
  }

  // Edição de um mês específico de uma série (PF): pré-preenche aquele mês.
  function openEditOccurrence(occurrence: DescontoOccurrence) {
    setEditing(occurrence.entry)
    setEditingOccurrence(occurrence)
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setEditing(null)
    setEditingOccurrence(null)
  }

  function handleSubmit(entry: Entry) {
    // Editando um mês de uma série → pergunta o escopo (só o mês ou a série).
    if (editingOccurrence?.isSeries) {
      setPendingSave({ entry, occurrence: editingOccurrence })
      return
    }
    saveEntry(entry)
    setSelectedKey(keyOf(entry)) // foca no mês do lançamento
    closeModal()
  }

  // Aplica o salvamento após escolher o escopo no modal.
  function saveScope(scope: 'month' | 'forward' | 'series') {
    const base = editing
    if (!pendingSave || !base || base.kind !== 'tax') {
      setPendingSave(null)
      return
    }
    const form = pendingSave.entry
    const description = form.kind === 'tax' ? form.description : base.description
    const formItems = form.kind === 'tax' ? form.items : undefined
    const ci = pendingSave.occurrence.calIndex
    const offset = ci - (base.year * 12 + base.month)
    // "Deste mês em diante" a partir da origem é o mesmo que a série toda.
    const effective = scope === 'forward' && offset === 0 ? 'series' : scope

    if (effective === 'month') {
      // Ajuste só deste mês: total e subvalores (com os meses restantes já como
      // estão exibidos) guardados como override.
      const override: MonthOverride = {
        calIndex: ci,
        cents: form.cents,
        ...(formItems && formItems.length > 0 ? { items: formItems } : {}),
      }
      saveEntry({
        ...base,
        overrides: [
          ...(base.overrides ?? []).filter((o) => o.calIndex !== ci),
          override,
        ],
      })
    } else if (effective === 'forward') {
      // Divide a série em ci: o trecho antigo termina em ci-1 e um novo começa
      // em ci com os valores editados (continuando a projeção dali pra frente).
      const count = offset // meses de origem até ci-1
      const truncatedItems = base.items?.map((it) =>
        it.months != null ? { ...it, months: Math.min(it.months, count) } : it,
      )
      saveEntry({
        ...base,
        ...(base.recurrence ? { recurrence: { months: count } } : {}),
        ...(truncatedItems ? { items: truncatedItems } : {}),
        overrides: base.overrides?.filter((o) => o.calIndex < ci),
        skips: base.skips?.filter((s) => s < ci),
      })
      let recurrence: Recurrence | undefined
      if (base.recurrence) {
        recurrence =
          base.recurrence.months == null
            ? { months: null }
            : { months: base.recurrence.months - offset }
      }
      const forwardSkips = base.skips?.filter((s) => s >= ci)
      saveEntry({
        key: crypto.randomUUID(),
        entity: base.entity,
        kind: 'tax',
        month: ci % 12,
        year: Math.floor(ci / 12),
        cents: form.cents,
        description,
        ...(recurrence ? { recurrence } : {}),
        ...(formItems && formItems.length > 0 ? { items: formItems } : {}),
        ...(forwardSkips && forwardSkips.length > 0 ? { skips: forwardSkips } : {}),
      })
    } else {
      // Série toda: mescla por rótulo, preservando itens que ainda não aparecem
      // neste mês (já expiraram antes dele). Os meses restantes editados voltam a
      // ser contados desde a origem (restantes + offset).
      let items: typeof base.items
      if (formItems && formItems.length > 0) {
        const remaining = new Map(formItems.map((i) => [i.label, i]))
        items = (base.items ?? []).map((bi) => {
          const fi = remaining.get(bi.label)
          if (!fi) return bi // não visível neste mês: mantém como está
          remaining.delete(bi.label)
          return {
            label: bi.label,
            cents: fi.cents,
            ...(fi.months != null
              ? { months: fi.months + offset }
              : bi.months != null
                ? { months: bi.months }
                : {}),
          }
        })
        for (const fi of remaining.values()) {
          items.push({
            label: fi.label,
            cents: fi.cents,
            ...(fi.months != null ? { months: fi.months + offset } : {}),
          })
        }
      }
      saveEntry({
        ...base,
        description,
        cents:
          items && items.length > 0
            ? items.reduce((s, i) => s + i.cents, 0)
            : form.cents,
        ...(items && items.length > 0 ? { items } : {}),
      })
    }
    setSelectedKey(`${Math.floor(ci / 12)}-${ci % 12}`)
    setPendingSave(null)
    closeModal()
  }

  function confirmRemove() {
    if (pendingDelete) {
      if (pendingDelete.calIndex != null) {
        // Excluir apenas este mês da série: marca o mês como pulado.
        const entry = entries.find((e) => e.key === pendingDelete.key)
        const ci = pendingDelete.calIndex
        if (entry && entry.kind === 'tax') {
          saveEntry({
            ...entry,
            skips: [...(entry.skips ?? []).filter((c) => c !== ci), ci],
          })
        }
      } else {
        removeEntry(pendingDelete.key)
        if (pendingDelete.key === editing?.key) closeModal()
      }
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
                    editingCalIndex={editingOccurrence?.calIndex}
                    onEdit={openEditOccurrence}
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
              key={`${editing?.key ?? 'new'}:${editingOccurrence?.calIndex ?? ''}`}
              entity={entity}
              editing={editing}
              defaultMonth={selected?.month}
              defaultYear={selected?.year}
              occurrence={editingOccurrence ?? undefined}
              lockPeriod={editingOccurrence?.isSeries ?? false}
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

        <AlertDialog
          open={pendingSave !== null}
          onOpenChange={(o) => !o && setPendingSave(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Salvar alteração</AlertDialogTitle>
              <AlertDialogDescription>
                Este é um lançamento recorrente. Onde aplicar a alteração?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="grid gap-2">
              <Button variant="outline" onClick={() => saveScope('month')}>
                Somente este mês
              </Button>
              <Button variant="outline" onClick={() => saveScope('forward')}>
                Deste mês em diante
              </Button>
              <Button variant="outline" onClick={() => saveScope('series')}>
                A série toda
              </Button>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>

      <Toaster theme={resolvedTheme} richColors position="top-center" />
    </div>
  )
}

export default App
