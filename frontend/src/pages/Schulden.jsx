import React, { useState, useEffect } from 'react'
import { getSchulden, createSchuld, updateSchuld, deleteSchuld } from '../api'
import { theme, formatEuro, formatDate } from '../theme'

const schuldTypes = ['hypotheek', 'lening', 'creditcard', 'overig']
const emptyForm = { naam: '', type: 'lening', bedrag: '', kleur: '#f87171' }

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: theme.accent, borderTopColor: 'transparent' }} />
    </div>
  )
}

function Toast({ message, type = 'error', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div
      className="fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl shadow-lg text-sm"
      style={{ background: type === 'error' ? '#7f1d1d' : '#14532d', color: '#fff', border: `1px solid ${theme.border}` }}
    >
      {message}
    </div>
  )
}

export default function Schulden() {
  const [schulden, setSchulden] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editSchuld, setEditSchuld] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteId, setDeleteId] = useState(null)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    getSchulden()
      .then(setSchulden)
      .catch(e => setToast({ message: e.message, type: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openNew = () => {
    setForm(emptyForm)
    setEditSchuld(null)
    setShowForm(true)
  }

  const openEdit = (s) => {
    setForm({ naam: s.naam, type: s.type, bedrag: s.bedrag, kleur: s.kleur })
    setEditSchuld(s)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = { ...form, bedrag: parseFloat(form.bedrag) }
      if (editSchuld) {
        await updateSchuld(editSchuld.id, data)
        setToast({ message: 'Schuld bijgewerkt', type: 'success' })
      } else {
        await createSchuld(data)
        setToast({ message: 'Schuld toegevoegd', type: 'success' })
      }
      setShowForm(false)
      load()
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteSchuld(deleteId)
      setDeleteId(null)
      setToast({ message: 'Schuld verwijderd', type: 'success' })
      load()
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    }
  }

  const totaal = schulden.reduce((s, d) => s + d.bedrag, 0)

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-display" style={{ color: theme.textPrimary, fontFamily: theme.fontDisplay }}>Schulden</h2>
        <button
          onClick={openNew}
          className="px-4 py-2 rounded-xl text-sm font-medium transition"
          style={{ background: theme.accentRed, color: '#fff' }}
        >
          + Schuld toevoegen
        </button>
      </div>

      {schulden.length > 0 && (
        <div className="glass p-5">
          <p className="text-xs uppercase tracking-widest mb-1" style={{ color: theme.textMuted }}>Totale schuld</p>
          <p className="text-3xl font-semibold" style={{ color: theme.accentRed }}>{formatEuro(totaal)}</p>
        </div>
      )}

      {schulden.length === 0 ? (
        <div className="glass p-12 text-center" style={{ color: theme.textMuted }}>
          <p className="text-xl mb-2">Geen schulden</p>
          <p className="text-sm">Voeg een schuld toe om het netto vermogen te berekenen.</p>
        </div>
      ) : (
        <div className="glass overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                {['Naam', 'Type', 'Bedrag', 'Bijgewerkt', 'Acties'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {schulden.map(s => (
                <tr key={s.id} className="border-b hover:bg-white/[0.02] transition" style={{ borderColor: theme.border }}>
                  <td className="px-4 py-3 font-medium flex items-center gap-2" style={{ color: theme.textPrimary }}>
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: s.kleur }} />
                    {s.naam}
                  </td>
                  <td className="px-4 py-3 capitalize" style={{ color: theme.textSecondary }}>{s.type}</td>
                  <td className="px-4 py-3 font-mono" style={{ color: theme.accentRed }}>{formatEuro(s.bedrag)}</td>
                  <td className="px-4 py-3" style={{ color: theme.textMuted }}>{formatDate(s.bijgewerkt_op)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(s)} className="text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition" style={{ color: theme.textSecondary }}>Bewerk</button>
                      <button onClick={() => setDeleteId(s.id)} className="text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition" style={{ color: theme.accentRed }}>Verwijder</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4">
          <div className="glass p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl font-semibold" style={{ color: theme.textPrimary }}>
              {editSchuld ? 'Schuld bewerken' : 'Schuld toevoegen'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: theme.textMuted }}>Naam</label>
                <input
                  required type="text" value={form.naam}
                  onChange={e => setForm(p => ({ ...p, naam: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: theme.textMuted }}>Bedrag (€)</label>
                <input
                  required type="number" step="0.01" value={form.bedrag}
                  onChange={e => setForm(p => ({ ...p, bedrag: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                />
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: theme.textMuted }}>Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'rgba(20,20,30,0.95)', border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                >
                  {schuldTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: theme.textMuted }}>Kleur</label>
                <input
                  type="color" value={form.kleur}
                  onChange={e => setForm(p => ({ ...p, kleur: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                  style={{ background: 'none' }}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 py-2 rounded-xl font-medium text-sm" style={{ background: theme.accentRed, color: '#fff' }}>
                  {saving ? 'Opslaan...' : 'Opslaan'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl text-sm hover:bg-white/10" style={{ color: theme.textSecondary, border: `1px solid ${theme.border}` }}>
                  Annuleren
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4">
          <div className="glass p-6 w-full max-w-sm space-y-4">
            <h3 className="text-xl font-semibold" style={{ color: theme.accentRed }}>Schuld verwijderen</h3>
            <p className="text-sm" style={{ color: theme.textSecondary }}>Weet je zeker dat je deze schuld wilt verwijderen?</p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 py-2 rounded-xl font-medium text-sm" style={{ background: theme.accentRed, color: '#fff' }}>Verwijderen</button>
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-xl text-sm hover:bg-white/10" style={{ color: theme.textSecondary, border: `1px solid ${theme.border}` }}>Annuleren</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
