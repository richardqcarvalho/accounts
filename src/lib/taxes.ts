import {
  ANEXO_III,
  ANEXO_V,
  CONTABILIDADE_MENSAL,
  FATOR_R_THRESHOLD,
  INSS,
  IRRF,
} from '@/lib/tax-tables'
import type { Faixa, SimplesTable } from '@/lib/tax-tables'
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

function faixaFor(rbt12: number, table: SimplesTable): Faixa {
  return (
    table.faixas.find((f) => rbt12 <= f.rbt12UpTo) ??
    table.faixas[table.faixas.length - 1]
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
  table: SimplesTable
}

// DAS do Simples do mês, usando a tabela do anexo definido pelo Fator R. Interno
// e externo são calculados SEPARADAMENTE (LC 123/2006, art. 18, §15): cada
// mercado usa o seu próprio RBT12 para definir faixa/alíquota; ao final os dois
// DAS se somam. Na exportação (externo) a alíquota desconsidera ISS/COFINS/PIS.
export function calcSimples({
  internal,
  external,
  rbt12Internal,
  rbt12External,
  table,
}: SimplesInput) {
  let internalRate = 0
  let dasInternal = 0
  if (internal > 0) {
    internalRate = effectiveRate(rbt12Internal, faixaFor(rbt12Internal, table))
    dasInternal = truncCents(internalRate * internal)
  }

  let externalRate = 0
  let dasExternal = 0
  if (external > 0) {
    const faixa = faixaFor(rbt12External, table)
    const excludedShare = table.exportExcludedTaxes.reduce(
      (acc, tax) => acc + faixa.dist[tax],
      0,
    )
    externalRate = effectiveRate(rbt12External, faixa) * (1 - excludedShare)
    dasExternal = truncCents(externalRate * external)
  }

  return { internalRate, externalRate, dasInternal, dasExternal }
}

interface MonthlyTaxesInput {
  internal: number
  external: number
  rbt12Internal: number
  rbt12External: number
  proLaborePaid: number // pró-labore pago no mês
  folha12Prev: number // pró-labore pago nos 12 meses anteriores (Fator R)
  rbt12TotalPrev: number // receita total dos 12 meses anteriores (Fator R)
  revenueWindow: number // receita total dos 12 meses terminando no mês (alvo)
  folhaWindowOthers: number // pró-labore dos 11 meses anteriores ao mês (alvo)
  extra?: number // descontos avulsos
}

// Conjunto de impostos e despesas do mês.
//
// O Fator R (folha ÷ receita dos 12 meses anteriores) define o anexo: ≥ 28% →
// Anexo III; abaixo → Anexo V. O INSS/IRRF saem sobre o pró-labore efetivamente
// pago. `proLaboreTarget` é quanto pagar no mês para a folha dos 12 meses
// (terminando neste mês) atingir 28% da receita — mantendo o Fator R no limite.
export function monthlyTaxes({
  internal,
  external,
  rbt12Internal,
  rbt12External,
  proLaborePaid,
  folha12Prev,
  rbt12TotalPrev,
  revenueWindow,
  folhaWindowOthers,
  extra = 0,
}: MonthlyTaxesInput): MonthTaxes {
  const revenue = internal + external

  // Fator R: usa os 12 meses anteriores; sem histórico (início de atividade)
  // cai para a razão do próprio mês; sem base nenhuma, assume o limite.
  const fatorR =
    rbt12TotalPrev > 0
      ? folha12Prev / rbt12TotalPrev
      : revenue > 0
        ? proLaborePaid / revenue
        : FATOR_R_THRESHOLD
  const anexo = fatorR >= FATOR_R_THRESHOLD ? 'III' : 'V'
  const table = anexo === 'III' ? ANEXO_III : ANEXO_V

  const proLaboreTarget = Math.max(
    0,
    FATOR_R_THRESHOLD * revenueWindow - folhaWindowOthers,
  )

  // DARF: usa o pró-labore pago; se não houver, estima sobre 28% do faturamento
  // (o mínimo do Fator R) e sinaliza que é sugerido.
  const proLaboreBase =
    proLaborePaid > 0 ? proLaborePaid : revenue * FATOR_R_THRESHOLD
  const proLaboreEstimated = proLaborePaid <= 0 && proLaboreBase > 0
  const inss = calcINSS(proLaboreBase)
  const irrf = calcIRRF(proLaboreBase)
  const darf = inss + irrf // DARF unificada (INSS + IRRF)

  const simples = calcSimples({
    internal,
    external,
    rbt12Internal,
    rbt12External,
    table,
  })
  const das = simples.dasInternal + simples.dasExternal
  const accounting = CONTABILIDADE_MENSAL

  // Tudo que é descontado do faturamento: impostos calculados (DARF + DAS),
  // contabilidade fixa e os descontos avulsos. O pró-labore é retirada do sócio,
  // não entra como despesa do líquido.
  const total = darf + das + accounting + extra
  const net = revenue - total

  return {
    proLaborePaid,
    proLaboreBase,
    proLaboreEstimated,
    proLaboreTarget,
    fatorR,
    anexo,
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
