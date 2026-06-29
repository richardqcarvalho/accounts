export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(2).replace('.', ',')}%`
}

// Formata um valor em reais (não em centavos).
export function formatReais(reais: number): string {
  return formatBRL(Math.round(reais * 100))
}
