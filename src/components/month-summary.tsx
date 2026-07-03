import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface SummaryItem {
  label: string
  value: string
  // Destaca o valor pelo sinal (usado no líquido): verde quando sobra, vermelho
  // quando o mês fecha no negativo.
  tone?: 'positive' | 'negative'
}

// Cards de resumo do mês. Os itens (faturamento/entrada, descontos, líquido)
// são montados por quem chama, conforme a visão (PJ ou PF).
export function MonthSummary({ items }: { items: SummaryItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent>
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p
              className={cn(
                'mt-1 text-2xl font-semibold tabular-nums',
                item.tone === 'positive' && 'text-green-600 dark:text-green-400',
                item.tone === 'negative' && 'text-red-600 dark:text-red-400',
              )}
            >
              {item.value}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
