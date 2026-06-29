import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TableCell, TableRow } from '@/components/ui/table'
import { formatBRL } from '@/lib/format'

// Cor e sinal do valor conforme a direção do dinheiro.
const TONE = {
  in: 'text-green-600 dark:text-green-400',
  out: 'text-red-600 dark:text-red-400',
}
const SIGN = { in: '+', out: '−' }

// Linha editável de um lançamento (entrada ou desconto). `direction` ('in'/'out')
// colore e prefixa o valor. As ações (editar / excluir) ficam escondidas atrás de
// um menu de reticências.
export function EntryRow({ label, entry, editing, direction, onEdit, onRemove }) {
  return (
    <TableRow
      className={`h-12 ${editing ? 'bg-yellow-50 dark:bg-yellow-500/10' : ''}`}
    >
      <TableCell className="text-muted-foreground">{label}</TableCell>
      <TableCell className={`tabular-nums ${direction ? TONE[direction] : ''}`}>
        {direction ? SIGN[direction] : ''}
        {formatBRL(entry.cents)}
      </TableCell>
      <TableCell className="w-0 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 text-muted-foreground"
              aria-label="Ações"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(entry)}>
              <Pencil className="size-4" />
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => onRemove(entry.key)}
            >
              <Trash2 className="size-4" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}
