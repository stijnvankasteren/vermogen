import React, { useState } from 'react'
import { exportData, deleteHistorie, deleteAlles } from '../api'
import { theme } from '../theme'

function Toast({ message, type = 'error', onClose }) {
  React.useEffect(() => {
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

function ConfirmDialog({ title, description, onConfirm, onCancel, dangerous }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4">
      <div className="glass p-6 w-full max-w-sm space-y-4">
        <h3 className="text-xl font-semibold" style={{ color: dangerous ? theme.accentRed : theme.textPrimary }}>{title}</h3>
        <p className="text-sm" style={{ color: theme.textSecondary }}>{description}</p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-xl font-medium text-sm"
            style={{ background: dangerous ? theme.accentRed : theme.accent, color: '#fff' }}
          >
            Bevestigen
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl text-sm hover:bg-white/10"
            style={{ color: theme.textSecondary, border: `1px solid ${theme.border}` }}
          >
            Annuleren
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="glass p-6 space-y-4">
      <h3 className="text-lg font-semibold" style={{ color: theme.textPrimary }}>{title}</h3>
      {children}
    </div>
  )
}

function ActionRow({ label, description, buttonLabel, onClick, danger }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${theme.border}` }}>
      <div>
        <p className="text-sm font-medium" style={{ color: theme.textPrimary }}>{label}</p>
        {description && <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{description}</p>}
      </div>
      <button
        onClick={onClick}
        className="px-4 py-2 rounded-xl text-sm font-medium transition ml-4 shrink-0"
        style={{
          background: danger ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)',
          color: danger ? theme.accentRed : theme.textSecondary,
          border: `1px solid ${danger ? theme.accentRed : theme.border}`,
        }}
      >
        {buttonLabel}
      </button>
    </div>
  )
}

export default function Instellingen() {
  const [toast, setToast] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [exporting, setExporting] = useState(false)

  const showToast = (message, type = 'success') => setToast({ message, type })

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vermogen-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Data geëxporteerd')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteHistorie = async () => {
    try {
      const result = await deleteHistorie()
      setConfirm(null)
      showToast(`${result.verwijderd} historische records verwijderd`)
    } catch (e) {
      setConfirm(null)
      showToast(e.message, 'error')
    }
  }

  const handleDeleteAlles = async () => {
    try {
      const result = await deleteAlles()
      setConfirm(null)
      const totaal = Object.values(result).reduce((s, v) => s + v, 0)
      showToast(`Alle data verwijderd (${totaal} records)`)
    } catch (e) {
      setConfirm(null)
      showToast(e.message, 'error')
    }
  }

  return (
    <div className="space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          description={confirm.description}
          onConfirm={confirm.onConfirm}
          onCancel={() => setConfirm(null)}
          dangerous={confirm.dangerous}
        />
      )}

      <h2 className="text-3xl font-display" style={{ color: theme.textPrimary, fontFamily: theme.fontDisplay }}>
        Instellingen
      </h2>

      <Section title="Data exporteren">
        <ActionRow
          label="Exporteer alle data"
          description="Download een JSON-bestand met alle rekeningen, historie, schulden, rendement en jaaropgaves."
          buttonLabel={exporting ? 'Exporteren...' : 'Exporteren'}
          onClick={handleExport}
        />
      </Section>

      <Section title="Data verwijderen">
        <ActionRow
          label="Verwijder historische data"
          description="Verwijdert alle saldo-historie. Rekeningen en andere data blijven bewaard."
          buttonLabel="Verwijder historie"
          danger
          onClick={() => setConfirm({
            title: 'Historie verwijderen',
            description: 'Weet je zeker dat je alle historische saldo-data wilt verwijderen? Dit kan niet ongedaan worden gemaakt.',
            onConfirm: handleDeleteHistorie,
            dangerous: true,
          })}
        />
        <ActionRow
          label="Verwijder alle data"
          description="Verwijdert alle rekeningen, historie, schulden, rendement en jaaropgaves. Niet terug te draaien."
          buttonLabel="Alles verwijderen"
          danger
          onClick={() => setConfirm({
            title: 'Alle data verwijderen',
            description: 'Weet je zeker dat je ALLE data wilt verwijderen? Rekeningen, historie, schulden, rendement en jaaropgaves worden permanent gewist.',
            onConfirm: handleDeleteAlles,
            dangerous: true,
          })}
        />
      </Section>
    </div>
  )
}
