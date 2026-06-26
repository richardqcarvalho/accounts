// Tabelas de impostos brasileiras — valores vigentes em 2026.
// Mudam no máximo uma vez por ano; atualize este arquivo e ajuste TAX_YEAR.
// Fontes:
//   INSS teto 2026: gov.br/inss, contabilizei.com.br/contabilidade-online/tabela-inss
//   IRRF 2026:      gov.br/receitafederal/.../tabelas/2026 (isenção até R$ 5.000 + redutor)
//   Anexo III 2026: contabilizei.com.br/contabilidade-online/anexo-3-simples-nacional
//   Fator R / exportação de serviços: LC 123/2006, art. 18.

export const TAX_YEAR = 2026

// Mensalidade do serviço de contabilidade (plano padrão da Contabilizei).
// Taxa fixa cobrada todo mês — ajuste conforme o seu plano.
export const CONTABILIDADE_MENSAL = 195

// Contribuição do sócio sobre o pró-labore: alíquota fixa de 11%, limitada ao teto.
export const INSS = {
  rate: 0.11,
  teto: 8475.55, // máx. contribuição = 11% × 8.475,55 = R$ 932,31
}

// Tabela progressiva mensal do IRRF + isenção/redutor de 2026.
// O imposto normal é calculado sobre a base (pró-labore − INSS) e, em seguida,
// aplica-se a redução: renda ≤ 5.000 fica isenta; entre 5.000,01 e 7.350 há redutor.
export const IRRF = {
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

// Simples Nacional — Anexo III (serviços), com Fator R.
// Pró-labore fixado em 28% do faturamento mantém o Fator R ≥ 28% (Anexo III).
// Na exportação de serviços (mercado externo) o DAS desconsidera ISS, COFINS e PIS.
export const ANEXO_III = {
  proLaboreRate: 0.28,
  faixas: [
    { rbt12UpTo: 180000, nominal: 0.06, deduct: 0, dist: { cpp: 0.434, iss: 0.335, csll: 0.035, irpj: 0.04, cofins: 0.1282, pis: 0.0278 } },
    { rbt12UpTo: 360000, nominal: 0.112, deduct: 9360, dist: { cpp: 0.434, iss: 0.32, csll: 0.035, irpj: 0.04, cofins: 0.1405, pis: 0.0305 } },
    { rbt12UpTo: 720000, nominal: 0.135, deduct: 17640, dist: { cpp: 0.434, iss: 0.325, csll: 0.035, irpj: 0.04, cofins: 0.1364, pis: 0.0296 } },
    { rbt12UpTo: 1800000, nominal: 0.16, deduct: 35640, dist: { cpp: 0.434, iss: 0.325, csll: 0.035, irpj: 0.04, cofins: 0.1364, pis: 0.0296 } },
    { rbt12UpTo: 3600000, nominal: 0.21, deduct: 125640, dist: { cpp: 0.434, iss: 0.335, csll: 0.035, irpj: 0.04, cofins: 0.1282, pis: 0.0278 } },
    { rbt12UpTo: 4800000, nominal: 0.33, deduct: 648000, dist: { cpp: 0.305, iss: 0, csll: 0.15, irpj: 0.35, cofins: 0.1603, pis: 0.0347 } },
  ],
  // Tributos desconsiderados no DAS para exportação de serviços.
  exportExcludedTaxes: ['iss', 'cofins', 'pis'],
}
