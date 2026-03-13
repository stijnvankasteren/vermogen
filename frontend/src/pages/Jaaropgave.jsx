import React, { useState, useEffect } from 'react'
import { getJaaropgave, upsertJaaropgave } from '../api'
import { theme, formatEuro } from '../theme'

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

// Box 3 fictief rendement percentages (2024 indicatief)
const FICTIEF_RENDEMENT = {
  sparen: 0.0092,
  overig: 0.0660,
}
const BELASTING_TARIEF = 0.36

function berekenBox3(eindsaldo, heffingsvrij = 57000) {
  const grondslag = Math.max(0, eindsaldo - heffingsvrij)
  // Simplified: treat all as 'overig'
  const fictief = grondslag * FICTIEF_RENDEMENT.overig
  const belasting = fictief * BELASTING_TARIEF
  return { grondslag, fictief, belasting }
}

const emptyForm = {
  jaar: new Date().getFullYear() - 1,
  saldo_begin: '',
  saldo_eind: '',
  inleg: '',
  heffingsvrij_vermogen: 57000,
}

export default function Jaaropgave() {
  const [data, setData] = useState([])
  const [selectedJaar, setSelectedJaar] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    getJaaropgave()
      .then(res => {
        setData(res)
        if (res.length > 0 && !selectedJaar) setSelectedJaar(res[0].jaar)
      })
      .catch(e => setToast({ message: e.message, type: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const selected = data.find(d => d.jaar === selectedJaar)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await upsertJaaropgave({
        jaar: parseInt(form.jaar),
        saldo_begin: parseFloat(form.saldo_begin),
        saldo_eind: parseFloat(form.saldo_eind),
        inleg: parseFloat(form.inleg),
        heffingsvrij_vermogen: parseFloat(form.heffingsvrij_vermogen),
      })
      setToast({ message: 'Jaaropgave opgeslagen', type: 'success' })
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

  const box3 = selected ? berekenBox3(selected.saldo_eind, selected.heffingsvrij_vermogen) : null
  const rendement = selected ? selected.saldo_eind - selected.saldo_begin - selected.inleg : 0
  const rendementPct = selected && (selected.saldo_begin + selected.inleg) > 0
    ? (rendement / (selected.saldo_begin + selected.inleg)) * 100
    : 0

  return (
    <div className="space-y-8">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between flex-wrap gap-4 no-print">
        <h2 className="text-3xl font-display" style={{ color: theme.textPrimary, fontFamily: theme.fontDisplay }}>Jaaropgave</h2>
        <div className="flex items-center gap-3">
          {data.length > 0 && (
            <select
              value={selectedJaar || ''}
              onChange={e => setSelectedJaar(parseInt(e.target.value))}
              className="px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'rgba(20,20,30,0.95)', border: `1px solid ${theme.border}`, color: theme.textPrimary }}
            >
              {data.map(d => <option key={d.jaar} value={d.jaar}>{d.jaar}</option>)}
            </select>
          )}
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl text-sm transition hover:bg-white/10"
            style={{ border: `1px solid ${theme.border}`, color: theme.textSecondary }}
          >
            Afdrukken
          </button>
        </div>
      </div>

      {selected ? (
        <div className="space-y-6">
          <div className="glass p-6">
            <h3 className="text-xl font-display mb-6" style={{ color: theme.accent, fontFamily: theme.fontDisplay }}>
              Jaaroverzicht {selected.jaar}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { label: 'Beginsaldo', value: formatEuro(selected.saldo_begin) },
                { label: 'Eindsaldo', value: formatEuro(selected.saldo_eind) },
                { label: 'Totale inleg', value: formatEuro(selected.inleg) },
                {
                  label: 'Rendement',
                  value: formatEuro(rendement),
                  sub: `${rendementPct >= 0 ? '+' : ''}${rendementPct.toFixed(2).replace('.', ',')}%`,
                  color: rendement >= 0 ? theme.accentGreen : theme.accentRed
                },
                { label: 'Heffingsvrij vermogen', value: formatEuro(selected.heffingsvrij_vermogen) },
              ].map(item => (
                <div key={item.label} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${theme.border}` }}>
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: theme.textMuted }}>{item.label}</p>
                  <p className="text-lg font-semibold" style={{ color: item.color || theme.textPrimary }}>{item.value}</p>
                  {item.sub && <p className="text-sm" style={{ color: item.color || theme.textSecondary }}>{item.sub}</p>}
                </div>
              ))}
            </div>
          </div>

          {box3 && (
            <div className="glass p-6">
              <h3 className="text-lg font-semibold mb-4" style={{ color: theme.textPrimary }}>Box 3 Schatting</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${theme.border}` }}>
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: theme.textMuted }}>Grondslag</p>
                  <p className="text-lg font-semibold" style={{ color: theme.textPrimary }}>{formatEuro(box3.grondslag)}</p>
                  <p className="text-xs mt-1" style={{ color: theme.textMuted }}>Eindsaldo minus heffingsvrij</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${theme.border}` }}>
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: theme.textMuted }}>Fictief rendement (6,60%)</p>
                  <p className="text-lg font-semibold" style={{ color: theme.textPrimary }}>{formatEuro(box3.fictief)}</p>
                </div>
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${theme.border}` }}>
                  <p className="text-xs uppercase tracking-wider mb-1" style={{ color: theme.textMuted }}>Geschatte belasting (36%)</p>
                  <p className="text-lg font-semibold" style={{ color: theme.accentRed }}>{formatEuro(box3.belasting)}</p>
                </div>
              </div>
              <p className="text-xs p-3 rounded-lg" style={{ background: 'rgba(201,168,76,0.08)', border: `1px solid rgba(201,168,76,0.2)`, color: theme.textMuted }}>
                ⚠ Dit is een schatting op basis van fictief rendement 2024. Raadpleeg de Belastingdienst voor exacte opgave en actuele tarieven.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="glass p-12 text-center" style={{ color: theme.textMuted }}>
          <p className="text-xl mb-2">Geen jaaropgave</p>
          <p className="text-sm">Voeg hieronder jaardata toe.</p>
        </div>
      )}

      <div className="glass p-6 no-print">
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.textPrimary }}>Jaardata toevoegen / bijwerken</h3>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Jaar', key: 'jaar', type: 'number', required: true },
            { label: 'Beginsaldo (€)', key: 'saldo_begin', type: 'number', required: true },
            { label: 'Eindsaldo (€)', key: 'saldo_eind', type: 'number', required: true },
            { label: 'Inleg (€)', key: 'inleg', type: 'number', required: true },
            { label: 'Heffingsvrij vermogen (€)', key: 'heffingsvrij_vermogen', type: 'number', required: true },
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
          <div className="col-span-2 md:col-span-3 flex justify-end">
            <button type="submit" disabled={saving} className="px-6 py-2 rounded-xl text-sm font-medium" style={{ background: theme.accent, color: '#0f1117' }}>
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
