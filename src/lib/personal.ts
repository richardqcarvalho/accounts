import type {
  DescontoOccurrence,
  Entry,
  MonthGroup,
  PersonalMonthGroup,
  TaxComponent,
  TaxEntry,
} from '@/types'

const calIndexOf = (month: number, year: number) => year * 12 + month
const monthYearOf = (ci: number) => ({ month: ci % 12, year: Math.floor(ci / 12) })

// Monta os meses da pessoa física. A entrada de cada mês é o líquido da PJ e os
// descontos são os lançamentos manuais de PF. Um desconto marcado como cobrança
// mensal se repete a partir do seu mês (por uma quantidade fixa de meses, ou
// indefinidamente). Quando detalhado, cada subvalor vale só pela sua própria
// quantidade de meses: some depois disso, e o total do mês é a soma dos que
// continuam ativos. Ordena do mais recente para o mais antigo.
export function buildPersonalGroups(
  pfEntries: Entry[],
  pjGroups: MonthGroup[],
): PersonalMonthGroup[] {
  // Líquido da PJ por índice de calendário (ano*12 + mês), em centavos.
  const netByCal = new Map<number, number>()
  for (const g of pjGroups) {
    netByCal.set(calIndexOf(g.month, g.year), Math.round(g.taxes.net * 100))
  }

  const descontos = pfEntries.filter((e): e is TaxEntry => e.kind === 'tax')

  // Até onde uma cobrança sem fim se estende: o mês mais distante entre o líquido
  // da PJ, o início de cada desconto, o fim de cada cobrança com prazo e o fim de
  // cada subvalor com quantidade de meses. Assim a recorrência indefinida
  // acompanha os meses que existem e cresce sozinha com novos meses.
  let maxCal = -Infinity
  for (const g of pjGroups) maxCal = Math.max(maxCal, calIndexOf(g.month, g.year))
  for (const d of descontos) {
    const start = calIndexOf(d.month, d.year)
    maxCal = Math.max(maxCal, start)
    if (d.recurrence?.months != null) {
      maxCal = Math.max(maxCal, start + d.recurrence.months - 1)
    }
    for (const item of d.items ?? []) {
      if (item.months != null) maxCal = Math.max(maxCal, start + item.months - 1)
    }
  }

  // Último mês coberto pela recorrência do próprio lançamento.
  const recurrenceEnd = (d: TaxEntry): number => {
    const start = calIndexOf(d.month, d.year)
    if (!d.recurrence) return start
    return d.recurrence.months != null
      ? start + d.recurrence.months - 1
      : Math.max(start, maxCal)
  }
  // Último mês em que um subvalor continua ativo: pela sua quantidade de meses ou,
  // sem ela, seguindo a recorrência do lançamento.
  const itemEnd = (d: TaxEntry, item: TaxComponent): number =>
    item.months != null
      ? calIndexOf(d.month, d.year) + item.months - 1
      : recurrenceEnd(d)
  // Último mês em que o desconto aparece (o mais distante entre os subvalores).
  const descontoEnd = (d: TaxEntry): number =>
    d.items && d.items.length > 0
      ? Math.max(...d.items.map((item) => itemEnd(d, item)))
      : recurrenceEnd(d)
  // Série = aparece em vários meses (recorrente ou com subvalores por prazo).
  const isSeries = (d: TaxEntry): boolean =>
    d.recurrence != null || (d.items?.some((item) => item.months != null) ?? false)

  const groups = new Map<number, PersonalMonthGroup>()
  const ensure = (ci: number) => {
    let group = groups.get(ci)
    if (!group) {
      const { month, year } = monthYearOf(ci)
      group = {
        month,
        year,
        incomeCents: netByCal.get(ci) ?? 0,
        extraItems: [],
        extraCents: 0,
        netCents: 0,
      }
      groups.set(ci, group)
    }
    return group
  }

  // Todo mês com líquido da PJ aparece, mesmo sem descontos ainda.
  for (const g of pjGroups) ensure(calIndexOf(g.month, g.year))
  // Cada desconto entra nos meses do seu período. Meses em `skips` somem; meses
  // com override usam os valores ajustados; senão projeta, mantendo só os
  // subvalores ainda ativos (com os meses restantes já calculados p/ exibição).
  for (const d of descontos) {
    const start = calIndexOf(d.month, d.year)
    const series = isSeries(d)
    for (let ci = start; ci <= descontoEnd(d); ci++) {
      if (d.skips?.includes(ci)) continue
      let cents: number
      let items: TaxComponent[]
      const override = d.overrides?.find((o) => o.calIndex === ci)
      if (override) {
        cents = override.cents
        items = override.items ?? []
      } else if (d.items && d.items.length > 0) {
        const active = d.items.filter((item) => ci <= itemEnd(d, item))
        if (active.length === 0) continue
        const offset = ci - start
        items = active.map((item) => ({
          label: item.label,
          cents: item.cents,
          ...(item.months != null ? { months: item.months - offset } : {}),
        }))
        cents = active.reduce((sum, item) => sum + item.cents, 0)
      } else {
        cents = d.cents
        items = []
      }
      const occurrence: DescontoOccurrence = {
        entry: d,
        calIndex: ci,
        cents,
        items,
        isSeries: series,
      }
      const group = ensure(ci)
      group.extraItems.push(occurrence)
      group.extraCents += cents
    }
  }

  for (const group of groups.values()) {
    group.netCents = group.incomeCents - group.extraCents
  }

  return [...groups.values()].sort(
    (a, b) => b.year - a.year || b.month - a.month,
  )
}
