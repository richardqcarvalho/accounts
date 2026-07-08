import { EntryRow } from '@/components/entry-row'
import { TaxRow } from '@/components/tax-row'
import type { TaxComponent, TaxEntry } from '@/types'

interface DescontoRowsProps {
  entry: TaxEntry // lançamento original (para key/edição)
  label: string // rótulo do total (com parcela/mensal, quando houver)
  cents: number // total exibido no mês
  items: TaxComponent[] // subvalores do mês (com meses restantes já calculados)
  editing: boolean
  removeThisLabel: string // "Excluir" ou "Excluir este mês"
  onEdit: () => void
  onRemoveThis: () => void
  onRemoveSeries?: () => void // presente quando é uma série
}

// Linha de um desconto manual. Quando detalhado, mostra o total (editável) e os
// valores que o compõem indentados abaixo — mesmo formato do DARF.
export function DescontoRows({
  entry,
  label,
  cents,
  items,
  editing,
  removeThisLabel,
  onEdit,
  onRemoveThis,
  onRemoveSeries,
}: DescontoRowsProps) {
  return (
    <>
      <EntryRow
        label={label}
        entry={entry}
        displayCents={cents}
        direction="out"
        editing={editing}
        removeLabel={removeThisLabel}
        onRemoveSeries={onRemoveSeries}
        onEdit={onEdit}
        onRemove={onRemoveThis}
      />
      {items.map((item, index) => {
        const name = item.label || 'Item'
        // Meses restantes (já calculados na projeção); contagem regressiva.
        const suffix = item.months
          ? ` · ${item.months} ${item.months === 1 ? 'mês' : 'meses'}`
          : ''
        return (
          <TaxRow
            key={`${entry.key}-${index}`}
            label={`${name}${suffix}`}
            reais={item.cents / 100}
            indent={1}
          />
        )
      })}
    </>
  )
}
