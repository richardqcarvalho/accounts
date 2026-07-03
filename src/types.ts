// Tipos de domínio compartilhados.

export type Market = 'internal' | 'external'
export type EntryKind = 'revenue' | 'tax' | 'prolabore'

// A quem o lançamento pertence: pessoa jurídica (empresa) ou pessoa física
// (sócio). O líquido da PJ vira a entrada da PF.
export type Entity = 'pj' | 'pf'

// Direção do dinheiro: entrada (verde, +) ou desconto/saída (vermelho, −).
export type Direction = 'in' | 'out'

// Anexo do Simples Nacional aplicado no mês (definido pelo Fator R).
export type Anexo = 'III' | 'V'

interface BaseEntry {
  key: string
  cents: number
  month: number // 0-11
  year: number
  entity: Entity
}

// Faturamento (entrada), com mercado interno/externo.
export interface RevenueEntry extends BaseEntry {
  kind: 'revenue'
  market: Market
}

// Cobrança mensal recorrente de um desconto (só PF). `months` é por quantos
// meses ela se repete a partir do mês inicial, contando-o; null = sem fim
// (todo mês em que houver movimento a partir do início).
export interface Recurrence {
  months: number | null
}

// Desconto avulso lançado manualmente (imposto extra, etc.). Na PF pode ser uma
// cobrança mensal (recurrence), que se repete nos meses seguintes.
export interface TaxEntry extends BaseEntry {
  kind: 'tax'
  description: string
  recurrence?: Recurrence
}

// Pró-labore efetivamente pago no mês (base do INSS/IRRF e do Fator R).
export interface ProLaboreEntry extends BaseEntry {
  kind: 'prolabore'
}

export type Entry = RevenueEntry | TaxEntry | ProLaboreEntry

// Impostos e despesas calculados para um mês (valores em reais).
export interface MonthTaxes {
  proLaborePaid: number // pró-labore pago no mês
  proLaboreBase: number // base do INSS/IRRF: o pago, ou 28% do faturamento se não houver
  proLaboreEstimated: boolean // true quando a base do DARF foi estimada (sem pró-labore pago)
  proLaboreTarget: number // pró-labore sugerido para manter o Fator R em 28%
  fatorR: number // folha 12 meses ÷ receita 12 meses
  anexo: Anexo
  inss: number
  irrf: number
  darf: number
  internalRate: number
  externalRate: number
  dasInternal: number
  dasExternal: number
  das: number
  accounting: number
  total: number
  net: number
}

// Um mês da pessoa física: a entrada é o líquido da PJ no mesmo mês e os
// descontos são lançamentos manuais. Tudo em centavos.
export interface PersonalMonthGroup {
  month: number
  year: number
  incomeCents: number // líquido da PJ no mês
  extraItems: TaxEntry[] // descontos manuais
  extraCents: number
  netCents: number // incomeCents − extraCents
}

// Um mês com seus lançamentos e os valores calculados.
export interface MonthGroup {
  month: number
  year: number
  cents: number
  internalCents: number
  externalCents: number
  proLaboreCents: number
  revenues: RevenueEntry[]
  proLaboreItems: ProLaboreEntry[]
  extraItems: TaxEntry[]
  extraCents: number
  taxes: MonthTaxes
}

// Pedido de exclusão aguardando confirmação.
export interface RemoveRequest {
  key: string
  label: string
  cents: number
}

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'
