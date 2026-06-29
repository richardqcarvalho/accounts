// Tipos de domínio compartilhados.

export type Market = 'internal' | 'external'
export type EntryKind = 'revenue' | 'tax'

// Direção do dinheiro: entrada (verde, +) ou desconto/saída (vermelho, −).
export type Direction = 'in' | 'out'

interface BaseEntry {
  key: string
  cents: number
  month: number // 0-11
  year: number
}

// Faturamento (entrada), com mercado interno/externo.
export interface RevenueEntry extends BaseEntry {
  kind: 'revenue'
  market: Market
}

// Desconto avulso lançado manualmente (imposto extra, etc.).
export interface TaxEntry extends BaseEntry {
  kind: 'tax'
  description: string
}

export type Entry = RevenueEntry | TaxEntry

// Impostos e despesas calculados para um mês (valores em reais).
export interface MonthTaxes {
  proLabore: number
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

// Um mês com seus lançamentos e os valores calculados.
export interface MonthGroup {
  month: number
  year: number
  cents: number
  internalCents: number
  externalCents: number
  revenues: RevenueEntry[]
  extraItems: TaxEntry[]
  extraCents: number
  taxes: MonthTaxes
}

export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'
