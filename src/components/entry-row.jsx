import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { formatBRL } from '@/lib/format'

// Linha editável de um lançamento (faturamento ou imposto extra).
export function EntryRow({ label, entry, editing, onEdit, onRemove }) {
  return (
    <TableRow className={editing ? 'bg-yellow-50 dark:bg-yellow-500/10' : undefined}>
      <TableCell className="text-muted-foreground">{label}</TableCell>
      <TableCell className="text-right tabular-nums">
        {formatBRL(entry.cents)}
      </TableCell>
      <TableCell className="w-0 text-right">
        <div className="flex justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground"
            onClick={() => onEdit(entry)}
            aria-label="Editar"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            onClick={() => onRemove(entry.key)}
            aria-label="Remover"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
