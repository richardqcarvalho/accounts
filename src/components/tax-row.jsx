import { TableCell, TableRow } from '@/components/ui/table'
import { formatBRL } from '@/lib/format'

// Linha de imposto calculado (somente leitura). `strong` destaca o total e
// `accent` o líquido.
export function TaxRow({ label, reais, strong, accent }) {
  const tone = accent
    ? 'font-semibold text-green-600 dark:text-green-400'
    : strong
      ? 'font-medium text-foreground'
      : 'text-muted-foreground'

  return (
    <TableRow className={`text-sm ${tone}`}>
      <TableCell className="pl-8" colSpan={2}>
        {label}
      </TableCell>
      <TableCell className="text-right">
        {formatBRL(Math.round(reais * 100))}
      </TableCell>
      <TableCell />
    </TableRow>
  )
}
