import React, { useState, useEffect, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, Cell
} from 'recharts'
import { getRendement, upsertRendement } from '../api'
import { theme, formatEuro, formatPct } from '../theme'

function Toast({ message, type = 'error', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm"
      style={{ background: type === 'error' ? '#7f1d1d' : '#14532d', color: '#fff', border: `1px solid ${theme.border}` }}>
      {message}
    </div>
  )
}

const emptyForm = { jaar: new Date().getFullYear(), rendement_pct: '', rendement_abs: '', benchmark_pct: '' }

export default function Rendement() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    getRendement()
      .then(setData)
      .catch(e => setToast({ message: e.message, type: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const stats = useMemo(() => {
    const valid = data.filter(d => d.rendement_pct !== null)
    if (!valid.length) return null
    const avg = valid.reduce((s, d) => s + d.rendement_pct, 0) / valid.length
    const best = valid.reduce((a, b) => a.rendement_pct > b.rendement_pct ? a : b)
    const worst = valid.reduce((a, b) => a.rendement_pct < b.rendement_pct ? a : b)
    return { avg, best, worst }
  }, [data])

  const cumulData = useMemo(() => {
    let cumul = 100, benchCumul = 100
    return data.map(d => {
      if (d.rendement_pct !== null) cumul *= (1 + d.rendement_pct / 100)
      if (d.benchmark_pct !== null) benchCumul *= (1 + d.benchmark_pct / 100)
      return { jaar: d.jaar, portfolio: Math.round(cumul * 10) / 10, benchmark: Math.round(benchCumul * 10) / 10 }
    })
  }, [data])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await upsertRendement({
        jaar: parseInt(form.jaar),
        rendement_pct: form.rendement_pct !== '' ? parseFloat(form.rendement_pct) : null,
        rendement_abs: form.rendement_abs !== '' ? parseFloat(form.rendement_abs) : null,
        benchmark_pct: form.benchmark_pct !== '' ? parseFloat(form.benchmark_pct) : null,
      })
      setToast({ message: 'Rendement opgeslagen', type: 'success' })
      setForm(emptyForm)
      load()
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.accent, borderTopColor: 'transparent' }} />
    </div>
  )

  return (
    <div className="space-y-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <h2 className="text-3xl font-display" style={{ color: theme.textPrimary, fontFamily: theme.fontDisplay }}>Rendement</h2>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Gemiddeld rendement', value: `${stats.avg.toFixed(2).replace('.', ',')}%`, color: theme.accent },
            { label: `Beste jaar (${stats.best.jaar})`, value: `+${stats.best.rendement_pct.toFixed(2).replace('.', ',')}%`, color: theme.accentGreen },
            { label: `Slechtste jaar (${stats.worst.jaar})`, value: `${stats.worst.rendement_pct.toFixed(2).replace('.', ',')}%`, color: theme.accentRed },
          ].map(s => (
            <div key={s.label} className="glass p-5">
              <p className="text-xs uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>{s.label}</p>
              <p className="text-2xl font-semibold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {data.length > 0 && (
        <>
          <div className="glass p-6">
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.textPrimary }}>Rendement per jaar (%)</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="jaar" tick={{ fill: theme.textMuted, fontSize: 11 }} />
                <YAxis tick={{ fill: theme.textMuted, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip
                  contentStyle={{ background: '#1a1d27', border: `1px solid ${theme.border}`, borderRadius: 8 }}
                  formatter={(v) => [`${v}%`, 'Rendement']}
                />
                <Bar dataKey="rendement_pct" radius={[4, 4, 0, 0]}>
                  {data.map((d, i) => (
                    <Cell key={i} fill={d.rendement_pct >= 0 ? theme.accentGreen : theme.accentRed} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {cumulData.length > 0 && (
            <div className="glass p-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: theme.textPrimary }}>Cumulatief rendement vs. benchmark</h3>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={cumulData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="jaar" tick={{ fill: theme.textMuted, fontSize: 11 }} />
                  <YAxis tick={{ fill: theme.textMuted, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#1a1d27', border: `1px solid ${theme.border}`, borderRadius: 8 }}
                    formatter={(v, n) => [`${v}`, n === 'portfolio' ? 'Portfolio' : 'Benchmark']}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="portfolio" stroke={theme.accent} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="benchmark" stroke={theme.textSecondary} strokeWidth={2} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      <div className="glass p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.textPrimary }}>Rendement toevoegen / bijwerken</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Jaar', key: 'jaar', type: 'number', required: true },
            { label: 'Rendement (%)', key: 'rendement_pct', type: 'number' },
            { label: 'Absoluut (€)', key: 'rendement_abs', type: 'number' },
            { label: 'Benchmark (%)', key: 'benchmark_pct', type: 'number' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs mb-1" style={{ color: theme.textMuted }}>{f.label}</label>
              <input
                type={f.type}
                step="0.01"
                required={f.required}
                value={form[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${theme.border}`, color: theme.textPrimary }}
              />
            </div>
          ))}
          <div className="col-span-2 md:col-span-4 flex justify-end">
            <button type="submit" disabled={saving} className="px-6 py-2 rounded-xl text-sm font-medium" style={{ background: theme.accent, color: '#0f1117' }}>
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
