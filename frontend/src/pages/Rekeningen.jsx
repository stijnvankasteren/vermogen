import React, { useState, useEffect } from 'react'
import { getAccounts, createAccount, updateAccount, deleteAccount, addAccountHistorie, importCsv } from '../api'
import { theme, accountTypes, formatEuro, formatDate } from '../theme'

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

const emptyForm = { naam: '', type: 'sparen', saldo: '', inleg: '', kleur: '#c9a84c' }

export default function Rekeningen() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editAccount, setEditAccount] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [deleteId, setDeleteId] = useState(null)
  const [saldoModal, setSaldoModal] = useState(null)
  const [nieuwSaldo, setNieuwSaldo] = useState('')
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)

  const load = () => {
    setLoading(true)
    getAccounts()
      .then(setAccounts)
      .catch(e => setToast({ message: e.message, type: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openNew = () => {
    setForm(emptyForm)
    setEditAccount(null)
    setShowForm(true)
  }

  const openEdit = (acc) => {
    setForm({ naam: acc.naam, type: acc.type, saldo: acc.saldo, inleg: acc.inleg, kleur: acc.kleur })
    setEditAccount(acc)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const data = { ...form, saldo: parseFloat(form.saldo), inleg: form.type === 'sparen' ? 0 : parseFloat(form.inleg) }
      if (editAccount) {
        await updateAccount(editAccount.id, data)
        setToast({ message: 'Rekening bijgewerkt', type: 'success' })
      } else {
        await createAccount(data)
        setToast({ message: 'Rekening aangemaakt', type: 'success' })
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
      await deleteAccount(deleteId)
      setDeleteId(null)
      setToast({ message: 'Rekening verwijderd', type: 'success' })
      load()
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    }
  }

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setImporting(true)
    try {
      const result = await importCsv(file)
      const msgs = [`${result.ingevoegd} rijen ingevoegd`, `${result.overgeslagen} overgeslagen`]
      if (result.fouten.length > 0) msgs.push(`${result.fouten.length} fouten`)
      setToast({ message: msgs.join(', '), type: result.fouten.length ? 'error' : 'success' })
      load()
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    } finally {
      setImporting(false)
      e.target.value = ''
    }
  }

  const handleSaldoUpdate = async () => {
    if (!nieuwSaldo) return
    setSaving(true)
    try {
      const saldo = parseFloat(nieuwSaldo)
      const today = new Date().toISOString().slice(0, 10)
      await addAccountHistorie(saldoModal.id, { datum: today, saldo })
      await updateAccount(saldoModal.id, { saldo })
      setSaldoModal(null)
      setNieuwSaldo('')
      setToast({ message: 'Saldo bijgewerkt', type: 'success' })
      load()
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-display" style={{ color: theme.textPrimary, fontFamily: theme.fontDisplay }}>Rekeningen</h2>
        <div className="flex gap-2">
          <label
            className="px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.08)', color: theme.textSecondary, border: `1px solid ${theme.border}` }}
          >
            {importing ? 'Importeren...' : 'CSV importeren'}
            <input type="file" accept=".csv" className="hidden" onChange={handleImport} disabled={importing} />
          </label>
          <button
            onClick={openNew}
            className="px-4 py-2 rounded-xl text-sm font-medium transition"
            style={{ background: theme.accent, color: '#0f1117' }}
          >
            + Rekening toevoegen
          </button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="glass p-12 text-center" style={{ color: theme.textMuted }}>
          <p className="text-xl mb-2">Geen rekeningen</p>
          <p className="text-sm">Voeg je eerste rekening toe om te beginnen.</p>
        </div>
      ) : (
        <div className="glass overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${theme.border}` }}>
                {['Naam', 'Type', 'Saldo', 'Inleg', 'Winst/Verlies', 'Bijgewerkt', 'Acties'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map(acc => {
                const winst = acc.saldo - acc.inleg
                const winstPct = acc.inleg > 0 ? (winst / acc.inleg) * 100 : 0
                return (
                  <tr key={acc.id} className="border-b hover:bg-white/[0.02] transition" style={{ borderColor: theme.border }}>
                    <td className="px-4 py-3 font-medium flex items-center gap-2" style={{ color: theme.textPrimary }}>
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: acc.kleur }} />
                      {acc.naam}
                    </td>
                    <td className="px-4 py-3 capitalize" style={{ color: theme.textSecondary }}>{acc.type}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: theme.textPrimary }}>{formatEuro(acc.saldo)}</td>
                    <td className="px-4 py-3 font-mono" style={{ color: theme.textSecondary }}>
                      {acc.type === 'sparen' ? <span style={{ color: theme.textMuted }}>–</span> : formatEuro(acc.inleg)}
                    </td>
                    <td className="px-4 py-3 font-mono" style={{ color: winst >= 0 ? theme.accentGreen : theme.accentRed }}>
                      {acc.type === 'sparen'
                        ? <span style={{ color: theme.textMuted }}>–</span>
                        : <>{formatEuro(winst)}{' '}<span className="text-xs">({winstPct >= 0 ? '+' : ''}{winstPct.toFixed(2).replace('.', ',')}%)</span></>
                      }
                    </td>
                    <td className="px-4 py-3" style={{ color: theme.textMuted }}>{formatDate(acc.bijgewerkt_op)}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setSaldoModal(acc); setNieuwSaldo(acc.saldo) }} className="text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition" style={{ color: theme.accent }}>Saldo</button>
                        <button onClick={() => openEdit(acc)} className="text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition" style={{ color: theme.textSecondary }}>Bewerk</button>
                        <button onClick={() => setDeleteId(acc.id)} className="text-xs px-2 py-1 rounded-lg hover:bg-white/10 transition" style={{ color: theme.accentRed }}>Verwijder</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4">
          <div className="glass p-6 w-full max-w-md space-y-4">
            <h3 className="text-xl font-semibold" style={{ color: theme.textPrimary }}>
              {editAccount ? 'Rekening bewerken' : 'Nieuwe rekening'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { label: 'Naam', key: 'naam', type: 'text' },
                { label: 'Saldo (€)', key: 'saldo', type: 'number' },
                ...(form.type !== 'sparen' ? [{ label: 'Inleg (€)', key: 'inleg', type: 'number' }] : []),
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs mb-1" style={{ color: theme.textMuted }}>{f.label}</label>
                  <input
                    required
                    type={f.type}
                    step="0.01"
                    value={form[f.key]}
                    onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs mb-1" style={{ color: theme.textMuted }}>Type</label>
                <select
                  value={form.type}
                  onChange={e => setForm(p => ({ ...p, type: e.target.value, inleg: e.target.value === 'sparen' ? '0' : p.inleg }))}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ background: 'rgba(20,20,30,0.95)', border: `1px solid ${theme.border}`, color: theme.textPrimary }}
                >
                  {accountTypes.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: theme.textMuted }}>Kleur</label>
                <input
                  type="color"
                  value={form.kleur}
                  onChange={e => setForm(p => ({ ...p, kleur: e.target.value }))}
                  className="w-10 h-10 rounded cursor-pointer border-0"
                  style={{ background: 'none' }}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="flex-1 py-2 rounded-xl font-medium text-sm transition" style={{ background: theme.accent, color: '#0f1117' }}>
                  {saving ? 'Opslaan...' : 'Opslaan'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 rounded-xl text-sm transition hover:bg-white/10" style={{ color: theme.textSecondary, border: `1px solid ${theme.border}` }}>
                  Annuleren
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Saldo Modal */}
      {saldoModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4">
          <div className="glass p-6 w-full max-w-sm space-y-4">
            <h3 className="text-xl font-semibold" style={{ color: theme.textPrimary }}>Saldo bijwerken — {saldoModal.naam}</h3>
            <div>
              <label className="block text-xs mb-1" style={{ color: theme.textMuted }}>Nieuw saldo (€)</label>
              <input
                type="number"
                step="0.01"
                value={nieuwSaldo}
                onChange={e => setNieuwSaldo(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.06)', border: `1px solid ${theme.border}`, color: theme.textPrimary }}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={handleSaldoUpdate} disabled={saving} className="flex-1 py-2 rounded-xl font-medium text-sm" style={{ background: theme.accent, color: '#0f1117' }}>
                {saving ? 'Opslaan...' : 'Bijwerken'}
              </button>
              <button onClick={() => setSaldoModal(null)} className="flex-1 py-2 rounded-xl text-sm hover:bg-white/10" style={{ color: theme.textSecondary, border: `1px solid ${theme.border}` }}>
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4">
          <div className="glass p-6 w-full max-w-sm space-y-4">
            <h3 className="text-xl font-semibold" style={{ color: theme.accentRed }}>Rekening verwijderen</h3>
            <p className="text-sm" style={{ color: theme.textSecondary }}>
              Weet je zeker dat je deze rekening en alle bijbehorende saldo-historie wilt verwijderen?
            </p>
            <div className="flex gap-3">
              <button onClick={handleDelete} className="flex-1 py-2 rounded-xl font-medium text-sm" style={{ background: theme.accentRed, color: '#fff' }}>
                Verwijderen
              </button>
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2 rounded-xl text-sm hover:bg-white/10" style={{ color: theme.textSecondary, border: `1px solid ${theme.border}` }}>
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
