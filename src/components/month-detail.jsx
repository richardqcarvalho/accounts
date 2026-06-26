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

// Sub-cabeçalho que separa as seções da tabela.
function SectionRow({ label }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={3}
        className="bg-muted/30 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground"
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

// Tabela do mês selecionado: lançamentos manuais (editáveis) separados do
// detalhamento de impostos calculados. Total e Líquido ficam nos cards de cima.
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
      {/* Lançamentos: tudo que é digitado/editável. */}
      <DetailTable>
        <SectionRow label="Entradas" />
        {group.revenues.map((entry) =>
          renderEntry(
            entry,
            entry.market === 'external'
              ? 'Faturamento externo'
              : 'Faturamento interno',
          ),
        )}

        {group.extraTaxItems.length > 0 && (
          <SectionRow label="Descontos · impostos" />
        )}
        {group.extraTaxItems.map((entry) =>
          renderEntry(entry, entry.description || 'Desconto'),
        )}

        {group.extraExpenseItems.length > 0 && (
          <SectionRow label="Descontos · outras despesas" />
        )}
        {group.extraExpenseItems.map((entry) =>
          renderEntry(entry, entry.description || 'Desconto'),
        )}
      </DetailTable>

      {/* Números calculados (somente leitura). */}
      <DetailTable>
        <SectionRow label="Impostos" />
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

        <SectionRow label="Outras despesas" />
        <TaxRow label="Contabilizei" reais={taxes.accounting} />
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
