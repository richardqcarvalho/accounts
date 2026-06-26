import { TableCell, TableRow } from '@/components/ui/table'
import { EntryRow } from '@/components/entry-row'
import { TaxRow } from '@/components/tax-row'
import { MONTHS } from '@/lib/calendar'
import { formatBRL, formatPercent } from '@/lib/format'

// Um mês: cabeçalho com o faturamento, os lançamentos e o detalhamento dos
// impostos (calculados + extras) terminando em Total e Líquido.
export function MonthGroup({ group, editingKey, onEdit, onRemove }) {
  const { taxes } = group

  return (
    <>
      <TableRow className="bg-muted/50 font-semibold hover:bg-muted/50">
        <TableCell>{MONTHS[group.month]}</TableCell>
        <TableCell>{group.year}</TableCell>
        <TableCell className="text-right">{formatBRL(group.cents)}</TableCell>
        <TableCell />
      </TableRow>

      {group.revenues.map((entry) => (
        <EntryRow
          key={entry.key}
          label={entry.market === 'external' ? 'Externo' : ''}
          entry={entry}
          editing={entry.key === editingKey}
          onEdit={onEdit}
          onRemove={onRemove}
        />
      ))}

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

      {group.extraTaxes.map((entry) => (
        <EntryRow
          key={entry.key}
          label={entry.description || 'Imposto extra'}
          entry={entry}
          editing={entry.key === editingKey}
          onEdit={onEdit}
          onRemove={onRemove}
          small
        />
      ))}

      <TaxRow label="Total" reais={taxes.total} strong />
      <TaxRow label="Líquido" reais={taxes.net} accent />
    </>
  )
}
