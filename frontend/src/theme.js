export const theme = {
  bg: '#0f1117',
  bgCard: 'rgba(255,255,255,0.04)',
  bgCardHover: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.08)',
  accent: '#c9a84c',
  accentGreen: '#4ade80',
  accentRed: '#f87171',
  textPrimary: '#e8e8e8',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
  fontDisplay: "'DM Serif Display', serif",
  fontBody: "'DM Sans', sans-serif",
}

export const accountTypes = ['sparen', 'beleggen', 'crypto', 'pensioen']

export const typeColors = {
  sparen: '#4ade80',
  beleggen: '#c9a84c',
  crypto: '#818cf8',
  pensioen: '#38bdf8',
}

export const formatEuro = (value) => {
  if (value === null || value === undefined) return '–'
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export const formatPct = (value) => {
  if (value === null || value === undefined) return '–'
  return new Intl.NumberFormat('nl-NL', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value / 100)
}

export const formatDate = (dateStr) => {
  if (!dateStr) return '–'
  const d = new Date(dateStr)
  return d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
