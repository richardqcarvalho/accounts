import { TableCell, TableRow } from '@/components/ui/table'
import { formatReais } from '@/lib/format'

// Recuo do rótulo: usado nos subitens (detalhamento de um total).
const INDENT = { 1: 'pl-6' }
// Cor e sinal do valor conforme a direção do dinheiro.
const TONE = {
  in: 'text-green-600 dark:text-green-400',
  out: 'text-red-600 dark:text-red-400',
}
const SIGN = { in: '+', out: '−' }

// Linha de valor calculado (somente leitura). `direction` ('in'/'out') colore e
// prefixa o valor; sem ela o valor fica neutro (base de cálculo ou subitem).
// `indent` recua o rótulo (subitens).
export function TaxRow({ label, reais, direction, indent }) {
  return (
    <TableRow className="text-sm text-muted-foreground">
      <TableCell className={indent ? INDENT[indent] : undefined}>
        {label}
      </TableCell>
      <TableCell className={`tabular-nums ${direction ? TONE[direction] : ''}`}>
        {direction ? SIGN[direction] : ''}
        {formatReais(reais)}
      </TableCell>
      <TableCell className="w-0" />
    </TableRow>
  )
}
