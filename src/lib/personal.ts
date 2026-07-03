import type { Entry, MonthGroup, PersonalMonthGroup, TaxEntry } from '@/types'

const calIndexOf = (month: number, year: number) => year * 12 + month
const monthYearOf = (ci: number) => ({ month: ci % 12, year: Math.floor(ci / 12) })

// Monta os meses da pessoa física. A entrada de cada mês é o líquido da PJ
// (vindo dos grupos já calculados da empresa) e os descontos são os lançamentos
// manuais de PF. Um desconto marcado como cobrança mensal se repete a partir do
// seu mês: por uma quantidade fixa de meses, ou indefinidamente (acompanhando os
// meses que existem). Ordena do mais recente para o mais antigo.
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
  // da PJ, o início de cada desconto e o fim de cada cobrança com prazo. Assim a
  // recorrência indefinida acompanha os meses que existem e cresce sozinha quando
  // novos meses da PJ são lançados.
  let maxCal = -Infinity
  for (const g of pjGroups) maxCal = Math.max(maxCal, calIndexOf(g.month, g.year))
  for (const d of descontos) {
    const start = calIndexOf(d.month, d.year)
    maxCal = Math.max(maxCal, start)
    if (d.recurrence && d.recurrence.months != null) {
      maxCal = Math.max(maxCal, start + d.recurrence.months - 1)
    }
  }

  // Índices de calendário cobertos por um desconto, a partir do mês inicial.
  const coverage = (d: TaxEntry): number[] => {
    const start = calIndexOf(d.month, d.year)
    if (!d.recurrence) return [start]
    const end =
      d.recurrence.months != null
        ? start + d.recurrence.months - 1
        : Math.max(start, maxCal)
    const out: number[] = []
    for (let ci = start; ci <= end; ci++) out.push(ci)
    return out
  }

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
  // Cada desconto (e suas repetições) soma no respectivo mês.
  for (const d of descontos) {
    for (const ci of coverage(d)) {
      const group = ensure(ci)
      group.extraItems.push(d)
      group.extraCents += d.cents
    }
  }

  for (const group of groups.values()) {
    group.netCents = group.incomeCents - group.extraCents
  }

  return [...groups.values()].sort(
    (a, b) => b.year - a.year || b.month - a.month,
  )
}
