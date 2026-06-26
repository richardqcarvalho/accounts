export function formatBRL(cents) {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  })
}

export function formatPercent(rate) {
  return `${(rate * 100).toFixed(2).replace('.', ',')}%`
}
