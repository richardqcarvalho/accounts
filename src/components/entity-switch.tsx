import { cn } from '@/lib/utils'
import type { Entity } from '@/types'

const OPTIONS: { value: Entity; label: string }[] = [
  { value: 'pf', label: 'Pessoa Física' },
  { value: 'pj', label: 'Pessoa Jurídica' },
]

interface EntitySwitchProps {
  value: Entity
  onChange: (entity: Entity) => void
}

// Alterna entre a visão da empresa (PJ) e a do sócio (PF).
export function EntitySwitch({ value, onChange }: EntitySwitchProps) {
  return (
    <div className="inline-flex rounded-lg border bg-muted/50 p-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === opt.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
