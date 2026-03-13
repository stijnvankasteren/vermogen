import React, { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { getAccounts } from '../api'
import { theme, formatEuro } from '../theme'

export default function ToekomstigVermogen() {
  const [accounts, setAccounts] = useState([])
  const [rendement, setRendement] = useState(7)
  const [maandelijksInleg, setMaandelijksInleg] = useState(0)
  const [startVermogen, setStartVermogen] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAccounts()
      .then(acc => {
        const totaal = acc.reduce((s, a) => s + a.saldo, 0)
        setStartVermogen(totaal)
        setAccounts(acc)
      })
      .finally(() => setLoading(false))
  }, [])

  const data = useMemo(() => {
    const r = rendement / 100
    const months = maandelijksInleg
    const result = []
    for (let jaar = 0; jaar <= 30; jaar++) {
      const n = jaar
      const zonder = startVermogen * Math.pow(1 + r, n)
      const met = startVermogen * Math.pow(1 + r, n) +
        months * 12 * ((Math.pow(1 + r, n) - 1) / r) * (1 + r)
      result.push({
        jaar: `${jaar}j`,
        zonder: Math.round(zonder),
        met: Math.round(isFinite(met) ? met : zonder),
      })
    }
    return result
  }, [startVermogen, rendement, maandelijksInleg])

  const milestones = [5, 10, 20, 30]

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.accent, borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-display" style={{ color: theme.textPrimary, fontFamily: theme.fontDisplay }}>
        Toekomstig Vermogen
      </h2>

      <div className="glass p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>
            Startvermogen (€)
          </label>
          <input
            type="number"
            value={startVermogen}
            onChange={e => setStartVermogen(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${theme.border}`, color: theme.textPrimary }}
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>
            Jaarlijks rendement: <span style={{ color: theme.accent }}>{rendement}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="20"
            step="0.5"
            value={rendement}
            onChange={e => setRendement(parseFloat(e.target.value))}
            className="w-full accent-yellow-500"
          />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>
            Maandelijkse inleg (€)
          </label>
          <input
            type="number"
            value={maandelijksInleg}
            onChange={e => setMaandelijksInleg(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${theme.border}`, color: theme.textPrimary }}
          />
        </div>
      </div>

      <div className="glass p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.textPrimary }}>Prognose 30 jaar</h3>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="jaar" tick={{ fill: theme.textMuted, fontSize: 11 }} tickLine={false} />
            <YAxis
              tick={{ fill: theme.textMuted, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `€${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{ background: '#1a1d27', border: `1px solid ${theme.border}`, borderRadius: 8 }}
              formatter={(v, n) => [formatEuro(v), n === 'zonder' ? 'Zonder inleg' : 'Met inleg']}
            />
            <Legend formatter={v => v === 'zonder' ? 'Zonder inleg' : 'Met inleg'} />
            <Line type="monotone" dataKey="zonder" stroke={theme.accent} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="met" stroke={theme.accentGreen} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="glass p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.textPrimary }}>Mijlpalen</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {milestones.map(jaar => {
            const d = data[jaar]
            return (
              <div key={jaar} className="text-center p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${theme.border}` }}>
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: theme.textMuted }}>Na {jaar} jaar</p>
                <p className="text-lg font-semibold" style={{ color: theme.accent }}>{d ? formatEuro(d.met) : '–'}</p>
                {maandelijksInleg === 0 && (
                  <p className="text-xs mt-1" style={{ color: theme.textMuted }}>{d ? formatEuro(d.zonder) : '–'}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
