import React, { useState, useEffect } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts'
import { getAccounts, getTotaalHistorie, getSchulden } from '../api'
import { theme, formatEuro, formatPct } from '../theme'

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="glass p-5 flex flex-col gap-1">
      <p className="text-xs uppercase tracking-widest" style={{ color: theme.textMuted }}>{label}</p>
      <p className="text-2xl font-semibold" style={{ color: color || theme.textPrimary }}>{value}</p>
      {sub && <p className="text-sm" style={{ color: theme.textSecondary }}>{sub}</p>}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.accent, borderTopColor: 'transparent' }} />
    </div>
  )
}

export default function Overzicht() {
  const [accounts, setAccounts] = useState([])
  const [schulden, setSchulden] = useState([])
  const [historie, setHistorie] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([getAccounts(), getTotaalHistorie(), getSchulden()])
      .then(([acc, hist, schuld]) => {
        setAccounts(acc)
        setHistorie(hist)
        setSchulden(schuld)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (error) return <div className="text-red-400 p-4">Fout: {error}</div>

  const totaalSaldo = accounts.reduce((s, a) => s + a.saldo, 0)
  const totaalSchulden = schulden.reduce((s, d) => s + d.bedrag, 0)
  const nettoVermogen = totaalSaldo - totaalSchulden
  const totaalInleg = accounts.reduce((s, a) => s + a.inleg, 0)
  const winst = totaalSaldo - totaalInleg
  const winstPct = totaalInleg > 0 ? (winst / totaalInleg) * 100 : 0

  const top3 = [...accounts].sort((a, b) => b.saldo - a.saldo).slice(0, 3)
  const maxSaldo = top3[0]?.saldo || 1

  const chartData = historie.map(h => ({
    datum: h.datum,
    saldo: h.saldo,
  }))

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap gap-8 items-end">
        <div>
          <p className="text-sm uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>Bruto Vermogen</p>
          <h2 className="text-5xl font-display" style={{ color: theme.accent, fontFamily: theme.fontDisplay }}>
            {formatEuro(totaalSaldo)}
          </h2>
        </div>
        {totaalSchulden > 0 && (
          <div>
            <p className="text-sm uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>Netto Vermogen</p>
            <h2 className="text-4xl font-display" style={{ color: nettoVermogen >= 0 ? theme.accentGreen : theme.accentRed, fontFamily: theme.fontDisplay }}>
              {formatEuro(nettoVermogen)}
            </h2>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard label="Totale Inleg" value={formatEuro(totaalInleg)} />
        <KpiCard
          label="Totale Winst/Verlies"
          value={formatEuro(winst)}
          sub={formatPct(winstPct)}
          color={winst >= 0 ? theme.accentGreen : theme.accentRed}
        />
        {totaalSchulden > 0
          ? <KpiCard label="Totale Schulden" value={formatEuro(totaalSchulden)} color={theme.accentRed} />
          : <KpiCard label="Aantal Rekeningen" value={accounts.length} />
        }
      </div>

      {chartData.length > 0 && (
        <div className="glass p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: theme.textPrimary }}>
            Vermogensontwikkeling
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.accent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={theme.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="datum" tick={{ fill: theme.textMuted, fontSize: 11 }} tickLine={false} />
              <YAxis
                tick={{ fill: theme.textMuted, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `€${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ background: '#1a1d27', border: `1px solid ${theme.border}`, borderRadius: 8 }}
                labelStyle={{ color: theme.textSecondary }}
                formatter={(v) => [formatEuro(v), 'Saldo']}
              />
              <Area
                type="monotone"
                dataKey="saldo"
                stroke={theme.accent}
                strokeWidth={2}
                fill="url(#gradSaldo)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {top3.length > 0 && (
        <div className="glass p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: theme.textPrimary }}>Top Rekeningen</h3>
          <div className="space-y-4">
            {top3.map(acc => (
              <div key={acc.id}>
                <div className="flex justify-between mb-1">
                  <span className="text-sm" style={{ color: theme.textSecondary }}>{acc.naam}</span>
                  <span className="text-sm font-medium" style={{ color: theme.textPrimary }}>{formatEuro(acc.saldo)}</span>
                </div>
                <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                  <div
                    className="h-2 rounded-full transition-all"
                    style={{ width: `${(acc.saldo / maxSaldo) * 100}%`, background: acc.kleur || theme.accent }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
