import { monthlyTaxes, rbt12ForMonth } from '@/lib/taxes'

// Agrupa os lançamentos por mês/ano e anexa os impostos calculados a cada grupo.
// Espera as entries já ordenadas por período (mais recente → mais antigo).
export function buildMonthlyGroups(entries) {
  const groups = []
  for (const entry of entries) {
    const last = groups[groups.length - 1]
    let group
    if (last && last.month === entry.month && last.year === entry.year) {
      group = last
    } else {
      group = {
        month: entry.month,
        year: entry.year,
        cents: 0,
        internalCents: 0,
        externalCents: 0,
        revenues: [],
        extraTaxItems: [], // descontos marcados como imposto
        extraFeeItems: [], // descontos marcados como taxa
        extraExpenseItems: [], // descontos marcados como outras despesas
        extraTaxCents: 0,
        extraFeeCents: 0,
        extraExpenseCents: 0,
      }
      groups.push(group)
    }

    if (entry.kind === 'tax') {
      // Descontos sem categoria (lançamentos antigos) contam como imposto.
      if (entry.category === 'expense') {
        group.extraExpenseItems.push(entry)
        group.extraExpenseCents += entry.cents
      } else if (entry.category === 'fee') {
        group.extraFeeItems.push(entry)
        group.extraFeeCents += entry.cents
      } else {
        group.extraTaxItems.push(entry)
        group.extraTaxCents += entry.cents
      }
    } else {
      const external = entry.market === 'external' ? entry.cents : 0
      group.revenues.push(entry)
      group.cents += entry.cents
      group.internalCents += entry.cents - external
      group.externalCents += external
    }
  }

  // RBT12 por mercado (LC 123 art. 18 §15), calculado por calendário
  // (ano*12 + mês) para ficar à prova de lacunas: meses sem registro contam 0.
  const calIndexOf = (group) => group.year * 12 + group.month
  const internalByCal = new Map()
  const externalByCal = new Map()
  for (const group of groups) {
    internalByCal.set(calIndexOf(group), group.internalCents / 100)
    externalByCal.set(calIndexOf(group), group.externalCents / 100)
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
      extraTax: group.extraTaxCents / 100,
      extraFee: group.extraFeeCents / 100,
      extraExpense: group.extraExpenseCents / 100,
    })
  }

  return groups
}
