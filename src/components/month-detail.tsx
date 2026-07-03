import { DetailTable } from '@/components/detail-table'
import { EntryRow } from '@/components/entry-row'
import { TaxRow } from '@/components/tax-row'
import { formatPercent } from '@/lib/format'
import type { Direction, Entry, MonthGroup, RemoveRequest } from '@/types'

interface MonthDetailProps {
  group: MonthGroup
  editingKey?: string
  onEdit: (entry: Entry) => void
  onRequestRemove: (request: RemoveRequest) => void
}

// Tabela do mês: lançamentos manuais (entradas em verde, descontos em vermelho)
// seguidos dos valores calculados. O pró-labore não aparece aqui — fica no card
// de Fator R. Total e Líquido ficam nos cards de cima.
export function MonthDetail({
  group,
  editingKey,
  onEdit,
  onRequestRemove,
}: MonthDetailProps) {
  const { taxes } = group

  const renderEntry = (entry: Entry, label: string, direction?: Direction) => (
    <EntryRow
      key={entry.key}
      label={label}
      entry={entry}
      direction={direction}
      editing={entry.key === editingKey}
      onEdit={onEdit}
      onRemove={() =>
        onRequestRemove({ key: entry.key, label, cents: entry.cents })
      }
    />
  )

  return (
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
  )
}
