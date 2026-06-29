import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatPercent, formatReais } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Entry, MonthGroup, RemoveRequest } from '@/types'

interface FatorRCardProps {
  group: MonthGroup
  onEdit: (entry: Entry) => void
  onRequestRemove: (request: RemoveRequest) => void
}

// Mostra o Fator R do mês (com o anexo aplicado) e o pró-labore: o valor pago,
// quando há, ou os 28% estimados com o sugerido logo abaixo. As ações de editar
// e excluir o pró-labore ficam aqui.
export function FatorRCard({ group, onEdit, onRequestRemove }: FatorRCardProps) {
  const { taxes } = group
  const proLabore = group.proLaboreItems[0]
  const belowThreshold = taxes.anexo === 'V'

  return (
    <Card className={cn('gap-3', belowThreshold && 'border-destructive/50')}>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">Fator R</p>
              <span
                className={cn(
                  'rounded-md px-2 py-0.5 text-xs font-medium',
                  belowThreshold
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                Anexo {taxes.anexo}
              </span>
            </div>
            <p
              className={cn(
                'mt-1 text-2xl font-semibold tabular-nums',
                belowThreshold
                  ? 'text-destructive'
                  : 'text-green-600 dark:text-green-400',
              )}
            >
              {formatPercent(taxes.fatorR)}
            </p>
          </div>

          <div className="text-right">
            <div className="flex items-center justify-end gap-1">
              <p className="text-sm text-muted-foreground">Pró-labore</p>
              {proLabore && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-muted-foreground"
                      aria-label="Ações do pró-labore"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => onEdit(proLabore)}>
                      <Pencil className="size-4" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={() =>
                        onRequestRemove({
                          key: proLabore.key,
                          label: 'Pró-labore pago',
                          cents: proLabore.cents,
                        })
                      }
                    >
                      <Trash2 className="size-4" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatReais(proLabore ? taxes.proLaborePaid : taxes.proLaboreBase)}
            </p>
            {!proLabore && (
              <p className="text-sm text-muted-foreground">
                sugerido: {formatReais(taxes.proLaboreTarget)}
              </p>
            )}
          </div>
        </div>

        {belowThreshold && (
          <p className="text-sm text-destructive">
            Fator R abaixo de 28% — o mês é tributado pelo Anexo V (alíquotas
            maiores). Pague ao menos o pró-labore sugerido para voltar ao Anexo
            III.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
