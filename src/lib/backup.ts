import type { Entry, MonthOverride, TaxComponent } from '@/types'

// Normaliza uma lista de subvalores (itens de um desconto detalhado).
function parseComponents(raw: unknown): TaxComponent[] {
  return (Array.isArray(raw) ? raw : [])
    .map((c: { label?: unknown; cents?: unknown; months?: unknown }) => {
      const item: TaxComponent = {
        label: typeof c.label === 'string' ? c.label : '',
        cents: Number(c.cents),
      }
      const months = Number(c.months)
      if (Number.isInteger(months) && months > 0) item.months = months
      return item
    })
    .filter((it: TaxComponent) => Number.isFinite(it.cents) && it.cents > 0)
}

// Gera e baixa um arquivo JSON com todos os lançamentos.
export function downloadEntries(entries: Entry[]): void {
  const payload = {
    app: 'accounts',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `lancamentos-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

// Lê o conteúdo de um arquivo exportado e devolve os lançamentos já
// normalizados/validados. Aceita { entries: [...] } ou um array direto.
export function parseEntriesFile(text: string): Entry[] {
  const data: unknown = JSON.parse(text)
  const list = Array.isArray(data)
    ? data
    : (data as { entries?: unknown } | null)?.entries
  if (!Array.isArray(list)) {
    throw new Error('formato não reconhecido')
  }

  return list
    .map((e): Entry => {
      const base = {
        key: e.key ?? crypto.randomUUID(),
        cents: Number(e.cents),
        month: Number(e.month),
        year: Number(e.year),
        entity: e.entity === 'pf' ? ('pf' as const) : ('pj' as const),
      }
      if (e.kind === 'tax') {
        // Cobrança recorrente: um inteiro positivo de meses, ou sem fim (null).
        const rawMonths = Number(e.recurrence?.months)
        const recurrence = e.recurrence
          ? { months: Number.isInteger(rawMonths) && rawMonths > 0 ? rawMonths : null }
          : undefined
        // Desconto detalhado: itens válidos e total recalculado a partir deles.
        const items = parseComponents(e.items)
        // Ajustes por mês e meses pulados de uma série.
        const overrides: MonthOverride[] = (Array.isArray(e.overrides) ? e.overrides : [])
          .map((o: { calIndex?: unknown; cents?: unknown; items?: unknown }) => {
            const ovItems = parseComponents(o.items)
            return {
              calIndex: Number(o.calIndex),
              cents: ovItems.length > 0
                ? ovItems.reduce((s, it) => s + it.cents, 0)
                : Number(o.cents),
              ...(ovItems.length > 0 ? { items: ovItems } : {}),
            }
          })
          .filter(
            (o: MonthOverride) =>
              Number.isInteger(o.calIndex) && Number.isFinite(o.cents) && o.cents > 0,
          )
        const skips: number[] = (Array.isArray(e.skips) ? e.skips : [])
          .map((s: unknown) => Number(s))
          .filter((n: number) => Number.isInteger(n))
        return {
          ...base,
          cents: items.length > 0 ? items.reduce((s, it) => s + it.cents, 0) : base.cents,
          kind: 'tax',
          description: typeof e.description === 'string' ? e.description : '',
          ...(recurrence ? { recurrence } : {}),
          ...(items.length > 0 ? { items } : {}),
          ...(overrides.length > 0 ? { overrides } : {}),
          ...(skips.length > 0 ? { skips } : {}),
        }
      }
      if (e.kind === 'prolabore') {
        return { ...base, kind: 'prolabore' }
      }
      return {
        ...base,
        kind: 'revenue',
        market: e.market === 'external' ? 'external' : 'internal',
      }
    })
    .filter(
      (e) =>
        Number.isFinite(e.cents) &&
        e.cents > 0 &&
        Number.isInteger(e.month) &&
        e.month >= 0 &&
        e.month <= 11 &&
        Number.isInteger(e.year) &&
        e.year > 0,
    )
}
