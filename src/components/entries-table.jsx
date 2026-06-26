import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MonthGroup } from '@/components/month-group'

export function EntriesTable({ groups, editingKey, onEdit, onRemove }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Mês</TableHead>
            <TableHead>Ano</TableHead>
            <TableHead className="text-right">Valor</TableHead>
            <TableHead aria-label="Ações" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center text-muted-foreground"
              >
                Nenhum lançamento ainda
              </TableCell>
            </TableRow>
          ) : (
            groups.map((group) => (
              <MonthGroup
                key={`${group.year}-${group.month}`}
                group={group}
                editingKey={editingKey}
                onEdit={onEdit}
                onRemove={onRemove}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
