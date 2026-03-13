import React, { useState, useEffect } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { getAccounts } from '../api'
import { theme, typeColors, formatEuro } from '../theme'

const RADIAN = Math.PI / 180
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
  if (percent < 0.04) return null
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11}>
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  )
}

export default function Verdeling() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAccounts()
      .then(setAccounts)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.accent, borderTopColor: 'transparent' }} />
    </div>
  )

  const totaal = accounts.reduce((s, a) => s + a.saldo, 0)

  if (accounts.length === 0) {
    return (
      <div className="glass p-12 text-center" style={{ color: theme.textMuted }}>
        <p className="text-xl mb-2">Geen rekeningen</p>
        <p className="text-sm">Voeg rekeningen toe om de verdeling te zien.</p>
      </div>
    )
  }

  const perAccount = accounts.map(a => ({
    name: a.naam,
    value: a.saldo,
    kleur: a.kleur,
  }))

  const perType = Object.entries(
    accounts.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + a.saldo
      return acc
    }, {})
  ).map(([type, value]) => ({
    name: type,
    value,
    kleur: typeColors[type] || theme.accent,
  }))

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-display" style={{ color: theme.textPrimary, fontFamily: theme.fontDisplay }}>Verdeling</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: theme.textPrimary }}>Per rekening</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={perAccount}
                cx="50%"
                cy="50%"
                outerRadius={110}
                dataKey="value"
                labelLine={false}
                label={renderCustomLabel}
              >
                {perAccount.map((entry, i) => (
                  <Cell key={i} fill={entry.kleur} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1a1d27', border: `1px solid ${theme.border}`, borderRadius: 8 }}
                formatter={(v, n) => [formatEuro(v), n]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="glass p-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: theme.textPrimary }}>Per type</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={perType}
                cx="50%"
                cy="50%"
                outerRadius={110}
                dataKey="value"
                labelLine={false}
                label={renderCustomLabel}
              >
                {perType.map((entry, i) => (
                  <Cell key={i} fill={entry.kleur} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1a1d27', border: `1px solid ${theme.border}`, borderRadius: 8 }}
                formatter={(v, n) => [formatEuro(v), n]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.textPrimary }}>Detail</h3>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
              {['Rekening', 'Type', 'Saldo', 'Aandeel'].map(h => (
                <th key={h} className="px-3 py-2 text-left text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {accounts.sort((a, b) => b.saldo - a.saldo).map(acc => (
              <tr key={acc.id} className="border-b" style={{ borderColor: theme.border }}>
                <td className="px-3 py-2 flex items-center gap-2" style={{ color: theme.textPrimary }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: acc.kleur }} />
                  {acc.naam}
                </td>
                <td className="px-3 py-2 capitalize" style={{ color: theme.textSecondary }}>{acc.type}</td>
                <td className="px-3 py-2 font-mono" style={{ color: theme.textPrimary }}>{formatEuro(acc.saldo)}</td>
                <td className="px-3 py-2" style={{ color: theme.textSecondary }}>
                  {totaal > 0 ? `${((acc.saldo / totaal) * 100).toFixed(1).replace('.', ',')}%` : '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
