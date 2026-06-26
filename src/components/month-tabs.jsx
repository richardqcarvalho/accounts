import { useEffect, useRef, useState } from 'react'
import { MONTHS } from '@/lib/calendar'
import { cn } from '@/lib/utils'

// Máscara que aplica fade nas bordas onde ainda há conteúdo rolável,
// indicando que há mais meses fora da área visível.
function maskFor({ left, right }) {
  const start = '2rem'
  const end = 'calc(100% - 2rem)'
  if (left && right)
    return `linear-gradient(to right, transparent, #000 ${start}, #000 ${end}, transparent)`
  if (right) return `linear-gradient(to right, #000 ${end}, transparent)`
  if (left) return `linear-gradient(to right, transparent, #000 ${start})`
  return undefined
}

// Barra de abas (pills) com os meses que têm lançamentos, mais recente primeiro.
export function MonthTabs({ groups, selectedKey, onSelect }) {
  const scrollRef = useRef(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const update = () =>
      setEdges({
        left: el.scrollLeft > 0,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
      })
    update()
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      el.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [groups])

  const mask = maskFor(edges)

  return (
    <div className="border-b">
      <div
        ref={scrollRef}
        className="flex gap-1 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ maskImage: mask, WebkitMaskImage: mask }}
      >
        {groups.map((group) => {
          const key = `${group.year}-${group.month}`
          const active = key === selectedKey
          return (
            <button
              key={key}
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
