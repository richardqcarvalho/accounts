export const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const now = new Date()
export const currentMonth = String(now.getMonth())
export const currentYear = now.getFullYear()
export const YEARS = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)
