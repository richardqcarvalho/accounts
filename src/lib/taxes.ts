import { ANEXO_III, CONTABILIDADE_MENSAL, INSS, IRRF } from '@/lib/tax-tables'
import type { Faixa } from '@/lib/tax-tables'
import type { MonthTaxes } from '@/types'

// Todos os valores aqui são em reais (não em centavos).

// INSS sobre o pró-labore: 11% limitado ao teto.
export function calcINSS(proLabore: number): number {
  return Math.min(proLabore, INSS.teto) * INSS.rate
}

// IRRF mensal sobre o pró-labore. Base = pró-labore − INSS (sem dependentes).
export function calcIRRF(proLabore: number): number {
  const base = Math.max(0, proLabore - calcINSS(proLabore))
  const bracket =
    IRRF.brackets.find((b) => base <= b.upTo) ??
    IRRF.brackets[IRRF.brackets.length - 1]
  let tax = Math.max(0, base * bracket.rate - bracket.deduct)

  if (proLabore <= IRRF.exemptUpTo) {
    tax = 0
  } else if (proLabore <= IRRF.redutor.upTo) {
    const reduction = Math.max(0, IRRF.redutor.base - IRRF.redutor.factor * proLabore)
    tax = Math.max(0, tax - reduction)
  }

  return tax
}

// RBT12 (receita bruta acumulada dos 12 meses anteriores) de UM mercado, à prova
// de lacunas: soma as receitas daquele mercado nos 12 meses de CALENDÁRIO
// imediatamente anteriores (meses sem registro contam como 0). `calIndex` é o
// índice de calendário do mês (ano*12 + mês) e `revenueByCalIndex` mapeia cada
// índice à receita do mercado. Por força do art. 18, §15 da LC 123/2006, interno
// e exportação têm RBT12 próprios. É a SOMA pura (não média). Quando não há
// receita no mercado nesses 12 meses (início de atividade, ou recomeço após
// longa lacuna), usa a receita do mês × 12 — o que também evita divisão por zero
// no cálculo da alíquota efetiva.
export function rbt12ForMonth(
  calIndex: number,
  currentRevenue: number,
  revenueByCalIndex: Map<number, number>,
): number {
  let sum = 0
  for (let k = calIndex - 12; k < calIndex; k++) {
    sum += revenueByCalIndex.get(k) ?? 0
  }
  return sum === 0 ? currentRevenue * 12 : sum
}

// O DAS do Simples é truncado nos centavos (a fração é descartada), diferente
// do IRRF, que é arredondado. Truncar reproduz o valor da Receita/PGDAS-D.
function truncCents(reais: number): number {
  return Math.floor(reais * 100) / 100
}

function faixaFor(rbt12: number): Faixa {
  return (
    ANEXO_III.faixas.find((f) => rbt12 <= f.rbt12UpTo) ??
    ANEXO_III.faixas[ANEXO_III.faixas.length - 1]
  )
}

function effectiveRate(rbt12: number, faixa: Faixa): number {
  return (rbt12 * faixa.nominal - faixa.deduct) / rbt12
}

interface SimplesInput {
  internal: number
  external: number
  rbt12Internal: number
  rbt12External: number
}

// DAS do Simples (Anexo III) do mês. Interno e externo são calculados
// SEPARADAMENTE (LC 123/2006, art. 18, §15): cada mercado usa o seu próprio
// RBT12 para definir faixa/alíquota; ao final os dois DAS se somam. Na
// exportação (externo) a alíquota ainda desconsidera ISS/COFINS/PIS.
export function calcSimples({
  internal,
  external,
  rbt12Internal,
  rbt12External,
}: SimplesInput) {
  let internalRate = 0
  let dasInternal = 0
  if (internal > 0) {
    internalRate = effectiveRate(rbt12Internal, faixaFor(rbt12Internal))
    dasInternal = truncCents(internalRate * internal)
  }

  let externalRate = 0
  let dasExternal = 0
  if (external > 0) {
    const faixa = faixaFor(rbt12External)
    const excludedShare = ANEXO_III.exportExcludedTaxes.reduce(
      (acc, tax) => acc + faixa.dist[tax],
      0,
    )
    externalRate = effectiveRate(rbt12External, faixa) * (1 - excludedShare)
    dasExternal = truncCents(externalRate * external)
  }

  return { internalRate, externalRate, dasInternal, dasExternal }
}

interface MonthlyTaxesInput extends SimplesInput {
  extra?: number
}

// Conjunto de impostos e despesas do mês a partir do faturamento
// interno/externo, dos RBT12 de cada mercado e dos descontos avulsos lançados no
// mês (`extra`). Tudo que reduz o faturamento entra no total; o líquido é o que
// sobra.
export function monthlyTaxes({
  internal,
  external,
  rbt12Internal,
  rbt12External,
  extra = 0,
}: MonthlyTaxesInput): MonthTaxes {
  const revenue = internal + external
  const proLabore = revenue * ANEXO_III.proLaboreRate
  const inss = calcINSS(proLabore)
  const irrf = calcIRRF(proLabore)
  const darf = inss + irrf // DARF unificada (INSS + IRRF)

  const simples = calcSimples({ internal, external, rbt12Internal, rbt12External })
  const das = simples.dasInternal + simples.dasExternal
  const accounting = CONTABILIDADE_MENSAL

  // Tudo que é descontado do faturamento: impostos calculados (DARF + DAS),
  // contabilidade fixa e os descontos avulsos lançados.
  const total = darf + das + accounting + extra
  const net = revenue - total // líquido: o que sobra do faturamento

  return {
    proLabore,
    inss,
    irrf,
    darf,
    internalRate: simples.internalRate,
    externalRate: simples.externalRate,
    dasInternal: simples.dasInternal,
    dasExternal: simples.dasExternal,
    das,
    accounting,
    total,
    net,
  }
}
