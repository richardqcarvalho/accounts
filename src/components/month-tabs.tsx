import { useEffect, useRef, useState } from 'react'
import { MONTHS } from '@/lib/calendar'
import { cn } from '@/lib/utils'

interface Edges {
  left: boolean
  right: boolean
}

// Máscara que aplica fade nas bordas onde ainda há conteúdo rolável,
// indicando que há mais meses fora da área visível.
function maskFor({ left, right }: Edges): string | undefined {
  const start = '2rem'
  const end = 'calc(100% - 2rem)'
  if (left && right)
    return `linear-gradient(to right, transparent, #000 ${start}, #000 ${end}, transparent)`
  if (right) return `linear-gradient(to right, #000 ${end}, transparent)`
  if (left) return `linear-gradient(to right, transparent, #000 ${start})`
  return undefined
}

interface MonthTabsProps {
  groups: { month: number; year: number }[]
  selectedKey: string
  onSelect: (key: string) => void
}

// Barra de abas (pills) com os meses que têm lançamentos, mais recente primeiro.
export function MonthTabs({ groups, selectedKey, onSelect }: MonthTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)
  const [edges, setEdges] = useState<Edges>({ left: false, right: false })

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () =>
      setEdges({
        left: el.scrollLeft > 0,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
      })
    // Roda a barra na horizontal com a rolagem vertical do mouse (sem shift),
    // deixando a página rolar quando já está numa das pontas.
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY === 0) return
      const max = el.scrollWidth - el.clientWidth
      if (max <= 0) return
      const atStart = el.scrollLeft <= 0
      const atEnd = el.scrollLeft >= max - 1
      if ((e.deltaY < 0 && atStart) || (e.deltaY > 0 && atEnd)) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    el.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      el.removeEventListener('wheel', onWheel)
      window.removeEventListener('resize', update)
    }
  }, [groups])

  // Garante que a aba selecionada (inclusive quando já vem pré-selecionada) fique
  // visível. `scroll-px-8` alinha fora do fade das bordas.
  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [selectedKey, groups])

  const mask = maskFor(edges)

  return (
    <div className="border-b">
      <div
        ref={scrollRef}
        className="flex scroll-px-8 gap-1 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        {groups.map((group) => {
          const key = `${group.year}-${group.month}`
          const active = key === selectedKey
          return (
            <button
              key={key}
              ref={active ? activeRef : undefined}
              type="button"
              onClick={() => onSelect(key)}
              className={cn(
                'whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
              )}
            >
              {MONTHS[group.month]} {group.year}
            </button>
          )
        })}
      </div>
    </div>
  )
}
