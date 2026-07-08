import { DescontoRows } from '@/components/desconto-rows'
import { DetailTable } from '@/components/detail-table'
import { TaxRow } from '@/components/tax-row'
import { MONTHS } from '@/lib/calendar'
import type { DescontoOccurrence, PersonalMonthGroup, RemoveRequest } from '@/types'

interface PersonalDetailProps {
  group: PersonalMonthGroup
  editingKey?: string
  editingCalIndex?: number
  onEdit: (occurrence: DescontoOccurrence) => void
  onRequestRemove: (request: RemoveRequest) => void
}

// Tabela do mês da pessoa física: o líquido da PJ entra como entrada (verde, só
// leitura — vem da empresa) e cada desconto manual sai em vermelho. O líquido da
// PF fica no card de resumo acima.
export function PersonalDetail({
  group,
  editingKey,
  editingCalIndex,
  onEdit,
  onRequestRemove,
}: PersonalDetailProps) {
  const monthLabel = (ci: number) => `${MONTHS[ci % 12]} ${Math.floor(ci / 12)}`
  return (
    <DetailTable>
      <TaxRow
        label="Líquido da PJ"
        reais={group.incomeCents / 100}
        direction="in"
      />
      {group.extraItems.map((occ) => {
        const { entry } = occ
        const base = entry.description || 'Desconto'
        // Cobrança mensal: mostra a parcela (3/12) ou "mensal" quando sem fim.
        let label = base
        if (entry.recurrence) {
          const n = occ.calIndex - (entry.year * 12 + entry.month) + 1
          label =
            entry.recurrence.months != null
              ? `${base} (${n}/${entry.recurrence.months})`
              : `${base} (mensal)`
        }
        return (
          <DescontoRows
            key={entry.key}
            entry={entry}
            label={label}
            cents={occ.cents}
            items={occ.items}
            editing={entry.key === editingKey && occ.calIndex === editingCalIndex}
            removeThisLabel={occ.isSeries ? 'Excluir este mês' : 'Excluir'}
            onEdit={() => onEdit(occ)}
            onRemoveThis={() =>
              onRequestRemove({
                key: entry.key,
                label: occ.isSeries ? `${base} · ${monthLabel(occ.calIndex)}` : base,
                cents: occ.cents,
                ...(occ.isSeries ? { calIndex: occ.calIndex } : {}),
              })
            }
            onRemoveSeries={
              occ.isSeries
                ? () =>
                    onRequestRemove({
                      key: entry.key,
                      label: `${base} — série inteira`,
                      cents: entry.cents,
                    })
                : undefined
            }
          />
        )
      })}
    </DetailTable>
  )
}
