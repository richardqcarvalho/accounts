import { Card, CardContent } from '@/components/ui/card'
import { formatBRL, formatReais } from '@/lib/format'
import { cn } from '@/lib/utils'

// Cards de resumo do mês: faturamento, total de impostos e líquido.
export function MonthSummary({ group }) {
  const items = [
    { label: 'Faturamento', value: formatBRL(group.cents) },
    { label: 'Impostos', value: formatReais(group.taxes.taxesTotal) },
    { label: 'Outras despesas', value: formatReais(group.taxes.otherExpenses) },
    { label: 'Líquido', value: formatReais(group.taxes.net), accent: true },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((item) => (
        <Card key={item.label}>
          <CardContent>
            <p className="text-sm text-muted-foreground">{item.label}</p>
            <p
              className={cn(
                'mt-1 text-2xl font-semibold tabular-nums',
                item.accent && 'text-green-600 dark:text-green-400',
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
