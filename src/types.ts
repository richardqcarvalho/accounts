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

// Um valor que compõe um desconto detalhado (ex.: INSS e IRRF dentro do DARF).
// `months` é a quantidade de meses opcional daquele valor.
export interface TaxComponent {
  label: string
  cents: number
  months?: number
}

// Ajuste de um mês específico de uma série (edição "somente este mês"): substitui
// o total e os subvalores projetados naquele mês. `calIndex` = ano*12 + mês.
export interface MonthOverride {
  calIndex: number
  cents: number
  items?: TaxComponent[]
}

// Desconto avulso lançado manualmente (imposto extra, etc.). Na PF pode ser uma
// cobrança mensal (recurrence), que se repete nos meses seguintes. Quando
// detalhado, `items` traz os valores que compõem o total (`cents` = soma deles).
// `overrides` guarda ajustes de meses específicos; `skips` são meses removidos
// individualmente (calIndex).
export interface TaxEntry extends BaseEntry {
  kind: 'tax'
  description: string
  recurrence?: Recurrence
  items?: TaxComponent[]
  overrides?: MonthOverride[]
  skips?: number[]
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

// Uma ocorrência de um desconto num mês. `entry` é o lançamento original (para
// editar/excluir a série toda); `cents`/`items` são o total e os subvalores
// daquele mês (com `months` já convertido para os meses restantes). `isSeries`
// indica que o desconto aparece em vários meses (recorrente ou com parcelas).
export interface DescontoOccurrence {
  entry: TaxEntry
  calIndex: number // ano*12 + mês desta ocorrência
  cents: number
  items: TaxComponent[] // subvalores do mês (vazio quando não detalhado)
  isSeries: boolean
}

// Um mês da pessoa física: a entrada é o líquido da PJ no mesmo mês e os
// descontos são lançamentos manuais. Tudo em centavos.
export interface PersonalMonthGroup {
  month: number
  year: number
  incomeCents: number // líquido da PJ no mês
  extraItems: DescontoOccurrence[] // descontos manuais (ocorrência do mês)
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

// Pedido de exclusão aguardando confirmação. Com `calIndex`, remove apenas
// aquele mês de uma série (skip); sem ele, apaga o lançamento inteiro.
export interface RemoveRequest {
  key: string
  label: string
  cents: number
  calIndex?: number
}

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'
