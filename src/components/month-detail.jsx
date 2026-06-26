import { useState } from 'react'
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
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { EntryRow } from '@/components/entry-row'
import { TaxRow } from '@/components/tax-row'
import { formatBRL, formatPercent } from '@/lib/format'

// Cabeçalho de seção da tabela. `nested` indica uma subseção (recuada e mais
// leve, sem barra de fundo).
function SectionRow({ label, nested }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={3}
        className={
          nested
            ? 'py-1.5 pl-6 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70'
            : 'bg-muted/30 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground'
        }
      >
        {label}
      </TableCell>
    </TableRow>
  )
}

// Card com a tabela padrão (cabeçalho Item/Valor + coluna de ações). As linhas
// vêm como children.
function DetailTable({ children }) {
  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted hover:bg-muted">
            <TableHead className="font-semibold text-foreground">Item</TableHead>
            <TableHead className="text-right font-semibold text-foreground">
              Valor
            </TableHead>
            <TableHead className="w-0" aria-label="Ações" />
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </Card>
  )
}

// Tabela do mês selecionado, em uma única visão: seção de Faturamentos e seção
// de Descontos (subdividida em Impostos, Taxas e Outras despesas). As linhas
// calculadas são read-only; os lançamentos manuais são editáveis. Total e
// Líquido ficam nos cards de cima.
export function MonthDetail({ group, editingKey, onEdit, onRemove }) {
  const { taxes } = group
  // Lançamento aguardando confirmação de exclusão (null = modal fechado).
  const [pending, setPending] = useState(null)

  function confirmRemove() {
    if (pending) onRemove(pending.key)
    setPending(null)
  }

  // Linha editável de lançamento; a exclusão passa pela confirmação.
  const renderEntry = (entry, label) => (
    <EntryRow
      key={entry.key}
      label={label}
      entry={entry}
      editing={entry.key === editingKey}
      onEdit={onEdit}
      onRemove={() => setPending({ key: entry.key, label, cents: entry.cents })}
    />
  )

  return (
    <>
      <DetailTable>
        <SectionRow label="Faturamentos" />
        {group.revenues.map((entry) =>
          renderEntry(
            entry,
            entry.market === 'external'
              ? 'Faturamento externo'
              : 'Faturamento interno',
          ),
        )}

        <SectionRow label="Descontos" />

        <SectionRow label="Impostos" nested />
        <TaxRow label="Pró-labore (28%)" reais={taxes.proLabore} />
        <TaxRow label="INSS" reais={taxes.inss} />
        <TaxRow label="IRRF" reais={taxes.irrf} />
        {group.internalCents > 0 && (
          <TaxRow
            label={`Simples interno (${formatPercent(taxes.internalRate)})`}
            reais={taxes.dasInternal}
          />
        )}
        {group.externalCents > 0 && (
          <TaxRow
            label={`Simples externo (${formatPercent(taxes.externalRate)})`}
            reais={taxes.dasExternal}
          />
        )}
        <TaxRow label="DARF unificado" reais={taxes.darf} />
        <TaxRow label="DAS Simples" reais={taxes.das} />
        {group.extraTaxItems.map((entry) =>
          renderEntry(entry, entry.description || 'Desconto'),
        )}

        {group.extraFeeItems.length > 0 && <SectionRow label="Taxas" nested />}
        {group.extraFeeItems.map((entry) =>
          renderEntry(entry, entry.description || 'Desconto'),
        )}

        <SectionRow label="Outras despesas" nested />
        <TaxRow label="Contabilizei" reais={taxes.accounting} />
        {group.extraExpenseItems.map((entry) =>
          renderEntry(entry, entry.description || 'Desconto'),
        )}
      </DetailTable>

      <AlertDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? `“${pending.label}” no valor de ${formatBRL(pending.cents)} será removido. Essa ação não pode ser desfeita.`
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
    </>
  )
}
