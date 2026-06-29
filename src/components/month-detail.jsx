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

// Card com a tabela padrão (cabeçalho Item/Valor + coluna de ações). As linhas
// vêm como children.
function DetailTable({ children }) {
  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted hover:bg-muted">
            <TableHead className="font-semibold text-foreground">Item</TableHead>
            <TableHead className="font-semibold text-foreground">Valor</TableHead>
            <TableHead className="w-0 text-right font-semibold text-foreground">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </Card>
  )
}

// Tabela do mês selecionado, em uma única visão. Em cima, os lançamentos manuais
// (entradas em verde, descontos em vermelho); embaixo, os valores calculados
// automaticamente. Cor e sinal indicam entrada/desconto; subitens detalham um
// total. Total e Líquido ficam nos cards de cima.
export function MonthDetail({ group, editingKey, onEdit, onRemove }) {
  const { taxes } = group
  // Lançamento aguardando confirmação de exclusão (null = modal fechado).
  const [pending, setPending] = useState(null)

  function confirmRemove() {
    if (pending) onRemove(pending.key)
    setPending(null)
  }

  // Linha editável de lançamento; a exclusão passa pela confirmação. `direction`
  // ('in'/'out') colore o valor como entrada ou desconto.
  const renderEntry = (entry, label, direction) => (
    <EntryRow
      key={entry.key}
      label={label}
      entry={entry}
      direction={direction}
      editing={entry.key === editingKey}
      onEdit={onEdit}
      onRemove={() => setPending({ key: entry.key, label, cents: entry.cents })}
    />
  )

  return (
    <>
      <DetailTable>
        {group.revenues.map((entry) =>
          renderEntry(
            entry,
            entry.market === 'external'
              ? 'Faturamento externo'
              : 'Faturamento interno',
            'in',
          ),
        )}
        {group.extraItems.map((entry) =>
          renderEntry(entry, entry.description || 'Desconto', 'out'),
        )}

        <TaxRow label="Pró-labore (28%)" reais={taxes.proLabore} />
        <TaxRow label="DARF unificado" reais={taxes.darf} direction="out" />
        <TaxRow label="INSS" reais={taxes.inss} indent={1} />
        <TaxRow label="IRRF" reais={taxes.irrf} indent={1} />
        <TaxRow label="DAS Simples" reais={taxes.das} direction="out" />
        {group.internalCents > 0 && (
          <TaxRow
            label={`Simples interno (${formatPercent(taxes.internalRate)})`}
            reais={taxes.dasInternal}
            indent={1}
          />
        )}
        {group.externalCents > 0 && (
          <TaxRow
            label={`Simples externo (${formatPercent(taxes.externalRate)})`}
            reais={taxes.dasExternal}
            indent={1}
          />
        )}
        <TaxRow label="Contabilizei" reais={taxes.accounting} direction="out" />
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
