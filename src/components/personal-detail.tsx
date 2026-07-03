import { DetailTable } from '@/components/detail-table'
import { EntryRow } from '@/components/entry-row'
import { TaxRow } from '@/components/tax-row'
import type { Entry, PersonalMonthGroup, RemoveRequest } from '@/types'

interface PersonalDetailProps {
  group: PersonalMonthGroup
  editingKey?: string
  onEdit: (entry: Entry) => void
  onRequestRemove: (request: RemoveRequest) => void
}

// Tabela do mês da pessoa física: o líquido da PJ entra como entrada (verde, só
// leitura — vem da empresa) e cada desconto manual sai em vermelho. O líquido da
// PF fica no card de resumo acima.
export function PersonalDetail({
  group,
  editingKey,
  onEdit,
  onRequestRemove,
}: PersonalDetailProps) {
  const groupCal = group.year * 12 + group.month
  return (
    <DetailTable>
      <TaxRow
        label="Líquido da PJ"
        reais={group.incomeCents / 100}
        direction="in"
      />
      {group.extraItems.map((entry) => {
        const base = entry.description || 'Desconto'
        // Cobrança mensal: mostra a parcela (3/12) ou "mensal" quando sem fim.
        let label = base
        if (entry.recurrence) {
          const n = groupCal - (entry.year * 12 + entry.month) + 1
          label =
            entry.recurrence.months != null
              ? `${base} (${n}/${entry.recurrence.months})`
              : `${base} (mensal)`
        }
        return (
          <EntryRow
            key={entry.key}
            label={label}
            entry={entry}
            direction="out"
            editing={entry.key === editingKey}
            onEdit={onEdit}
            onRemove={() =>
              onRequestRemove({
                key: entry.key,
                label: entry.recurrence ? `${base} (cobrança mensal)` : base,
                cents: entry.cents,
              })
            }
          />
        )
      })}
    </DetailTable>
  )
}
