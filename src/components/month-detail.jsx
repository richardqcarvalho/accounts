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
import { formatPercent } from '@/lib/format'

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

// Tabela do mês selecionado: lançamentos manuais (editáveis) separados do
// detalhamento de impostos calculados. Total e Líquido ficam nos cards de cima.
export function MonthDetail({ group, editingKey, onEdit, onRemove }) {
  const { taxes } = group

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
        <TableBody>
          <SectionRow label="Lançamentos" />
          {group.revenues.map((entry) => (
            <EntryRow
              key={entry.key}
              label={
                entry.market === 'external'
                  ? 'Faturamento externo'
                  : 'Faturamento interno'
              }
              entry={entry}
              editing={entry.key === editingKey}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          ))}
          {group.extraTaxes.map((entry) => (
            <EntryRow
              key={entry.key}
              label={entry.description || 'Imposto extra'}
              entry={entry}
              editing={entry.key === editingKey}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          ))}

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
          <TaxRow label="DARF" reais={taxes.darf} />
          <TaxRow label="DAS" reais={taxes.das} />
          <TaxRow label="Contabilizei" reais={taxes.accounting} />
        </TableBody>
      </Table>
    </Card>
  )
}
