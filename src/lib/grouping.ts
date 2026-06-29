import { monthlyTaxes, rbt12ForMonth } from '@/lib/taxes'
import type { Entry, MonthGroup, MonthTaxes } from '@/types'

// Grupo em construção: o `taxes` só é preenchido na segunda passada.
type GroupDraft = Omit<MonthGroup, 'taxes'> & { taxes?: MonthTaxes }

// Soma os valores do mapa nos índices de calendário [from, toExclusive).
function sumWindow(
  map: Map<number, number>,
  from: number,
  toExclusive: number,
): number {
  let sum = 0
  for (let k = from; k < toExclusive; k++) sum += map.get(k) ?? 0
  return sum
}

// Agrupa os lançamentos por mês/ano e anexa os valores calculados a cada grupo.
// Espera as entries já ordenadas por período (mais recente → mais antigo).
export function buildMonthlyGroups(entries: Entry[]): MonthGroup[] {
  const groups: GroupDraft[] = []
  for (const entry of entries) {
    const last = groups[groups.length - 1]
    let group: GroupDraft
    if (last && last.month === entry.month && last.year === entry.year) {
      group = last
    } else {
      group = {
        month: entry.month,
        year: entry.year,
        cents: 0,
        internalCents: 0,
        externalCents: 0,
        proLaboreCents: 0,
        revenues: [],
        proLaboreItems: [],
        extraItems: [], // descontos avulsos lançados
        extraCents: 0,
      }
      groups.push(group)
    }

    if (entry.kind === 'tax') {
      group.extraItems.push(entry)
      group.extraCents += entry.cents
    } else if (entry.kind === 'prolabore') {
      group.proLaboreItems.push(entry)
      group.proLaboreCents += entry.cents
    } else {
      const external = entry.market === 'external' ? entry.cents : 0
      group.revenues.push(entry)
      group.cents += entry.cents
      group.internalCents += entry.cents - external
      group.externalCents += external
    }
  }

  // Mapas por calendário (ano*12 + mês), à prova de lacunas: meses sem registro
  // contam 0. RBT12 por mercado (LC 123 art. 18 §15); total e folha alimentam o
  // Fator R e o alvo de pró-labore.
  const calIndexOf = (group: GroupDraft) => group.year * 12 + group.month
  const internalByCal = new Map<number, number>()
  const externalByCal = new Map<number, number>()
  const totalByCal = new Map<number, number>()
  const folhaByCal = new Map<number, number>()
  for (const group of groups) {
    const ci = calIndexOf(group)
    internalByCal.set(ci, group.internalCents / 100)
    externalByCal.set(ci, group.externalCents / 100)
    totalByCal.set(ci, group.cents / 100)
    folhaByCal.set(ci, group.proLaboreCents / 100)
  }

  for (const group of groups) {
    const ci = calIndexOf(group)
    const internal = group.internalCents / 100
    const external = group.externalCents / 100
    group.taxes = monthlyTaxes({
      internal,
      external,
      rbt12Internal: rbt12ForMonth(ci, internal, internalByCal),
      rbt12External: rbt12ForMonth(ci, external, externalByCal),
      proLaborePaid: group.proLaboreCents / 100,
      // Fator R: 12 meses anteriores (mesma janela do RBT12).
      folha12Prev: sumWindow(folhaByCal, ci - 12, ci),
      rbt12TotalPrev: sumWindow(totalByCal, ci - 12, ci),
      // Alvo: janela de 12 meses terminando neste mês.
      revenueWindow: sumWindow(totalByCal, ci - 11, ci + 1),
      folhaWindowOthers: sumWindow(folhaByCal, ci - 11, ci),
      extra: group.extraCents / 100,
    })
  }

  return groups as MonthGroup[]
}
