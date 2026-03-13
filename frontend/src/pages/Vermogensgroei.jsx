import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, Cell, LabelList
} from 'recharts'
import { getVermogensgroei } from '../api'
import { theme, formatEuro } from '../theme'

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.accent, borderTopColor: 'transparent' }} />
    </div>
  )
}

function KpiCard({ label, value, sub, color }) {
  return (
    <div className="glass p-5 flex flex-col gap-1">
      <p className="text-xs uppercase tracking-widest" style={{ color: theme.textMuted }}>{label}</p>
      <p className="text-2xl font-semibold" style={{ color: color || theme.textPrimary }}>{value}</p>
      {sub && <p className="text-sm" style={{ color: theme.textSecondary }}>{sub}</p>}
    </div>
  )
}

export default function Vermogensgroei() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [view, setView] = useState('gestapeld') // 'gestapeld' | 'totaal'

  useEffect(() => {
    getVermogensgroei()
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (error) return <div className="text-red-400 p-4">Fout: {error}</div>
  if (!data || data.jaren.length === 0) {
    return (
      <div className="glass p-12 text-center" style={{ color: theme.textMuted }}>
        <p className="text-xl mb-2">Geen historische data</p>
        <p className="text-sm">Importeer saldo-historie om vermogensgroei te zien.</p>
      </div>
    )
  }

  const { jaren, accounts } = data
  const huidigJaar = jaren[jaren.length - 1]
  const vorigJaar = jaren.length > 1 ? jaren[jaren.length - 2] : null
  const eersteJaar = jaren[0]

  const groeiAbsoluut = huidigJaar.totaal - eersteJaar.totaal
  const groeiPct = eersteJaar.totaal > 0 ? (groeiAbsoluut / eersteJaar.totaal) * 100 : 0

  const groeiDitJaar = vorigJaar ? huidigJaar.totaal - vorigJaar.totaal : null
  const groeiDitJaarPct = vorigJaar && vorigJaar.totaal > 0
    ? ((huidigJaar.totaal - vorigJaar.totaal) / vorigJaar.totaal) * 100
    : null

  // Beste jaar op basis van absolute groei
  let besteJaar = null
  let besteGroei = -Infinity
  for (let i = 1; i < jaren.length; i++) {
    const g = jaren[i].totaal - jaren[i - 1].totaal
    if (g > besteGroei) { besteGroei = g; besteJaar = jaren[i].jaar }
  }

  // Jaarlijkse groei tabel
  const groeiData = jaren.map((j, i) => ({
    jaar: String(j.jaar),
    totaal: j.totaal,
    groei: i === 0 ? 0 : j.totaal - jaren[i - 1].totaal,
    groeiPct: i === 0 || jaren[i - 1].totaal === 0 ? 0 : ((j.totaal - jaren[i - 1].totaal) / jaren[i - 1].totaal) * 100,
  }))

  const tooltipStyle = { background: '#1a1d27', border: `1px solid ${theme.border}`, borderRadius: 8 }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-display" style={{ color: theme.textPrimary, fontFamily: theme.fontDisplay }}>
        Vermogensgroei
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          label={`Groei ${eersteJaar.jaar}–${huidigJaar.jaar}`}
          value={formatEuro(groeiAbsoluut)}
          sub={`${groeiPct >= 0 ? '+' : ''}${groeiPct.toFixed(1).replace('.', ',')}%`}
          color={groeiAbsoluut >= 0 ? theme.accentGreen : theme.accentRed}
        />
        {groeiDitJaar !== null && (
          <KpiCard
            label={`Groei ${huidigJaar.jaar}`}
            value={formatEuro(groeiDitJaar)}
            sub={groeiDitJaarPct !== null ? `${groeiDitJaarPct >= 0 ? '+' : ''}${groeiDitJaarPct.toFixed(1).replace('.', ',')}%` : undefined}
            color={groeiDitJaar >= 0 ? theme.accentGreen : theme.accentRed}
          />
        )}
        {besteJaar && (
          <KpiCard
            label="Beste jaar"
            value={String(besteJaar)}
            sub={`+${formatEuro(besteGroei)}`}
            color={theme.accent}
          />
        )}
      </div>

      {/* Grafiek */}
      <div className="glass p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold" style={{ color: theme.textPrimary }}>Vermogen per jaar</h3>
          <div className="flex gap-2">
            {['gestapeld', 'totaal'].map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className="px-3 py-1 rounded-lg text-xs font-medium transition"
                style={{
                  background: view === v ? theme.accent : 'rgba(255,255,255,0.06)',
                  color: view === v ? '#0f1117' : theme.textSecondary,
                  border: `1px solid ${view === v ? theme.accent : theme.border}`,
                }}
              >
                {v === 'gestapeld' ? 'Per rekening' : 'Totaal'}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          {view === 'gestapeld' ? (
            <BarChart data={jaren.map(j => ({ ...j, jaar: String(j.jaar) }))} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="jaar" tick={{ fill: theme.textMuted, fontSize: 11 }} tickLine={false} />
              <YAxis
                tick={{ fill: theme.textMuted, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `€${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: theme.textSecondary }}
                formatter={(v, name) => [formatEuro(v), name]}
              />
              {accounts.map(acc => (
                <Bar key={acc.naam} dataKey={acc.naam} stackId="a" fill={acc.kleur} radius={[0, 0, 0, 0]} />
              ))}
            </BarChart>
          ) : (
            <AreaChart data={groeiData}>
              <defs>
                <linearGradient id="gradGroei" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.accent} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={theme.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="jaar" tick={{ fill: theme.textMuted, fontSize: 11 }} tickLine={false} />
              <YAxis
                tick={{ fill: theme.textMuted, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={v => `€${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: theme.textSecondary }}
                formatter={(v) => [formatEuro(v), 'Totaal vermogen']}
              />
              <Area type="monotone" dataKey="totaal" stroke={theme.accent} strokeWidth={2} fill="url(#gradGroei)" />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Jaarlijkse groei tabel */}
      <div className="glass overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
              {['Jaar', 'Vermogen', 'Groei (€)', 'Groei (%)'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...groeiData].reverse().map((r, i) => (
              <tr key={r.jaar} className="border-b hover:bg-white/[0.02] transition" style={{ borderColor: theme.border }}>
                <td className="px-4 py-3 font-medium" style={{ color: theme.textPrimary }}>{r.jaar}</td>
                <td className="px-4 py-3 font-mono" style={{ color: theme.textPrimary }}>{formatEuro(r.totaal)}</td>
                <td className="px-4 py-3 font-mono" style={{ color: r.groei >= 0 ? theme.accentGreen : theme.accentRed }}>
                  {i === groeiData.length - 1 ? '–' : `${r.groei >= 0 ? '+' : ''}${formatEuro(r.groei)}`}
                </td>
                <td className="px-4 py-3 font-mono" style={{ color: r.groeiPct >= 0 ? theme.accentGreen : theme.accentRed }}>
                  {i === groeiData.length - 1 ? '–' : `${r.groeiPct >= 0 ? '+' : ''}${r.groeiPct.toFixed(1).replace('.', ',')}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
