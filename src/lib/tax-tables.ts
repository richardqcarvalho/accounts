// Tabelas de impostos brasileiras — valores vigentes em 2026.
// Mudam no máximo uma vez por ano; atualize este arquivo e ajuste TAX_YEAR.
// Fontes:
//   INSS teto 2026: gov.br/inss, contabilizei.com.br/contabilidade-online/tabela-inss
//   IRRF 2026:      gov.br/receitafederal/.../tabelas/2026 (isenção até R$ 5.000 + redutor)
//   Anexo III/V 2026: contabilizei.com.br, contaja.com.br/blog/anexo-5-simples-nacional
//   Fator R / exportação de serviços: LC 123/2006, art. 18.

export const TAX_YEAR = 2026

// Mensalidade do serviço de contabilidade (plano padrão da Contabilizei).
// Taxa fixa cobrada todo mês — ajuste conforme o seu plano.
export const CONTABILIDADE_MENSAL = 195

// Fator R ≥ 28% → Anexo III (alíquotas menores); abaixo disso → Anexo V.
export const FATOR_R_THRESHOLD = 0.28

// Contribuição do sócio sobre o pró-labore: alíquota fixa de 11%, limitada ao teto.
export interface InssTable {
  rate: number
  teto: number
}

export const INSS: InssTable = {
  rate: 0.11,
  teto: 8475.55, // máx. contribuição = 11% × 8.475,55 = R$ 932,31
}

// Tabela progressiva mensal do IRRF + isenção/redutor de 2026.
// O imposto normal é calculado sobre a base (pró-labore − INSS) e, em seguida,
// aplica-se a redução: renda ≤ 5.000 fica isenta; entre 5.000,01 e 7.350 há redutor.
export interface IrrfBracket {
  upTo: number
  rate: number
  deduct: number
}

export interface IrrfTable {
  brackets: IrrfBracket[]
  dependentDeduction: number
  exemptUpTo: number
  redutor: { upTo: number; base: number; factor: number }
}

export const IRRF: IrrfTable = {
  brackets: [
    { upTo: 2428.8, rate: 0, deduct: 0 },
    { upTo: 2826.65, rate: 0.075, deduct: 182.16 },
    { upTo: 3751.05, rate: 0.15, deduct: 394.16 },
    { upTo: 4664.68, rate: 0.225, deduct: 675.49 },
    { upTo: Infinity, rate: 0.275, deduct: 908.73 },
  ],
  dependentDeduction: 189.59, // por dependente/mês (não utilizado por enquanto)
  exemptUpTo: 5000,
  redutor: { upTo: 7350, base: 978.62, factor: 0.133145 },
}

// Simples Nacional — serviços (Anexo III ou V conforme o Fator R).
// Na exportação de serviços (mercado externo) o DAS desconsidera ISS, COFINS e
// PIS em ambos os anexos (LC 123/2006, art. 18, §14).
export interface TaxDistribution {
  cpp: number
  iss: number
  csll: number
  irpj: number
  cofins: number
  pis: number
}

export interface Faixa {
  rbt12UpTo: number
  nominal: number
  deduct: number
  dist: TaxDistribution
}

export interface SimplesTable {
  faixas: Faixa[]
  exportExcludedTaxes: (keyof TaxDistribution)[]
}

const EXPORT_EXCLUDED: (keyof TaxDistribution)[] = ['iss', 'cofins', 'pis']

// Anexo III — aplicado quando o Fator R ≥ 28%.
export const ANEXO_III: SimplesTable = {
  exportExcludedTaxes: EXPORT_EXCLUDED,
  faixas: [
    { rbt12UpTo: 180000, nominal: 0.06, deduct: 0, dist: { cpp: 0.434, iss: 0.335, csll: 0.035, irpj: 0.04, cofins: 0.1282, pis: 0.0278 } },
    { rbt12UpTo: 360000, nominal: 0.112, deduct: 9360, dist: { cpp: 0.434, iss: 0.32, csll: 0.035, irpj: 0.04, cofins: 0.1405, pis: 0.0305 } },
    { rbt12UpTo: 720000, nominal: 0.135, deduct: 17640, dist: { cpp: 0.434, iss: 0.325, csll: 0.035, irpj: 0.04, cofins: 0.1364, pis: 0.0296 } },
    { rbt12UpTo: 1800000, nominal: 0.16, deduct: 35640, dist: { cpp: 0.434, iss: 0.325, csll: 0.035, irpj: 0.04, cofins: 0.1364, pis: 0.0296 } },
    { rbt12UpTo: 3600000, nominal: 0.21, deduct: 125640, dist: { cpp: 0.434, iss: 0.335, csll: 0.035, irpj: 0.04, cofins: 0.1282, pis: 0.0278 } },
    { rbt12UpTo: 4800000, nominal: 0.33, deduct: 648000, dist: { cpp: 0.305, iss: 0, csll: 0.15, irpj: 0.35, cofins: 0.1603, pis: 0.0347 } },
  ],
}

// Anexo V — aplicado quando o Fator R < 28% (alíquotas maiores).
export const ANEXO_V: SimplesTable = {
  exportExcludedTaxes: EXPORT_EXCLUDED,
  faixas: [
    { rbt12UpTo: 180000, nominal: 0.155, deduct: 0, dist: { irpj: 0.25, csll: 0.15, cofins: 0.141, pis: 0.0305, cpp: 0.2885, iss: 0.14 } },
    { rbt12UpTo: 360000, nominal: 0.18, deduct: 4500, dist: { irpj: 0.23, csll: 0.15, cofins: 0.141, pis: 0.0305, cpp: 0.2785, iss: 0.17 } },
    { rbt12UpTo: 720000, nominal: 0.195, deduct: 9900, dist: { irpj: 0.24, csll: 0.15, cofins: 0.1492, pis: 0.0323, cpp: 0.2385, iss: 0.19 } },
    { rbt12UpTo: 1800000, nominal: 0.205, deduct: 17100, dist: { irpj: 0.21, csll: 0.15, cofins: 0.1574, pis: 0.0341, cpp: 0.2385, iss: 0.21 } },
    { rbt12UpTo: 3600000, nominal: 0.23, deduct: 62100, dist: { irpj: 0.23, csll: 0.125, cofins: 0.141, pis: 0.0305, cpp: 0.2385, iss: 0.235 } },
    { rbt12UpTo: 4800000, nominal: 0.305, deduct: 540000, dist: { irpj: 0.35, csll: 0.155, cofins: 0.1644, pis: 0.0356, cpp: 0.295, iss: 0 } },
  ],
}
