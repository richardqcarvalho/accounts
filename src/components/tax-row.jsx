import { TableCell, TableRow } from '@/components/ui/table'
import { formatReais } from '@/lib/format'

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
      <TableCell>{label}</TableCell>
      <TableCell className="text-right tabular-nums">
        {formatReais(reais)}
      </TableCell>
      <TableCell className="w-0" />
    </TableRow>
  )
}
