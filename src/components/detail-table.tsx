import type { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

// Card com a tabela padrão (cabeçalho Item/Valor + coluna de ações). As linhas
// vêm como children. Reutilizada pelo detalhamento da PJ e da PF.
export function DetailTable({ children }: { children: ReactNode }) {
  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted hover:bg-muted">
            <TableHead className="font-semibold text-foreground">Item</TableHead>
            <TableHead className="font-semibold text-foreground">Valor</TableHead>
            <TableHead className="w-0 text-right font-semibold text-foreground">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </Table>
    </Card>
  )
}
