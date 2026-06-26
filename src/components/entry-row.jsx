import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TableCell, TableRow } from '@/components/ui/table'
import { formatBRL } from '@/lib/format'

// Linha editável de um lançamento (faturamento ou imposto extra). `small`
// aplica o recuo/tamanho usado na seção de impostos.
export function EntryRow({ label, entry, editing, onEdit, onRemove, small }) {
  return (
    <TableRow className={editing ? 'bg-yellow-50' : undefined}>
      <TableCell
        className={`text-muted-foreground ${small ? 'pl-8 text-sm' : 'pl-6'}`}
        colSpan={2}
      >
        {label}
      </TableCell>
      <TableCell className={`text-right ${small ? 'text-sm' : ''}`}>
        {formatBRL(entry.cents)}
      </TableCell>
      <TableCell className="text-right">
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
