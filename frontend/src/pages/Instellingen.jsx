import React, { useState } from 'react'
import { exportData, importJson, importCsvHistorie, deleteHistorie, deleteAlles } from '../api'
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

function ConfirmDialog({ title, description, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4">
      <div className="glass p-6 w-full max-w-sm space-y-4">
        <h3 className="text-xl font-semibold" style={{ color: theme.accentRed }}>{title}</h3>
        <p className="text-sm" style={{ color: theme.textSecondary }}>{description}</p>
        <div className="flex gap-3">
          <button onClick={onConfirm} className="flex-1 py-2 rounded-xl font-medium text-sm" style={{ background: theme.accentRed, color: '#fff' }}>
            Bevestigen
          </button>
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl text-sm hover:bg-white/10" style={{ color: theme.textSecondary, border: `1px solid ${theme.border}` }}>
            Annuleren
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, description, children }) {
  return (
    <div className="glass p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold" style={{ color: theme.textPrimary }}>{title}</h3>
        {description && <p className="text-sm mt-1" style={{ color: theme.textMuted }}>{description}</p>}
      </div>
      <div className="space-y-0 divide-y" style={{ borderColor: theme.border }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, description, children }) {
  return (
    <div className="flex items-center justify-between py-4 gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium" style={{ color: theme.textPrimary }}>{label}</p>
        {description && <p className="text-xs mt-0.5" style={{ color: theme.textMuted }}>{description}</p>}
      </div>
      <div className="shrink-0 flex gap-2">
        {children}
      </div>
    </div>
  )
}

function Btn({ onClick, danger, children, as: Tag = 'button', ...props }) {
  return (
    <Tag
      onClick={onClick}
      className="px-4 py-2 rounded-xl text-sm font-medium transition cursor-pointer"
      style={{
        background: danger ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.08)',
        color: danger ? theme.accentRed : theme.textSecondary,
        border: `1px solid ${danger ? theme.accentRed : theme.border}`,
      }}
      {...props}
    >
      {children}
    </Tag>
  )
}

export default function Instellingen() {
  const [toast, setToast] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState({})

  const showToast = (message, type = 'success') => setToast({ message, type })
  const setBusyKey = (key, val) => setBusy(b => ({ ...b, [key]: val }))

  // Export JSON
  const handleExport = async () => {
    setBusyKey('export', true)
    try {
      const data = await exportData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `vermogen-export-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast('Data geëxporteerd als JSON')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setBusyKey('export', false)
    }
  }

  // Import JSON
  const handleImportJson = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setBusyKey('importJson', true)
    try {
      const result = await importJson(file)
      const parts = Object.entries(result)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${v} ${k}`)
      showToast(parts.length ? `Geïmporteerd: ${parts.join(', ')}` : 'Niets nieuws gevonden (alles bestond al)')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setBusyKey('importJson', false)
      e.target.value = ''
    }
  }

  // Download CSV template
  const handleCsvTemplate = () => {
    const inhoud = 'account_naam,account_type,datum,saldo,inleg\nSpaarrekening,bankrekening,2024-01-01,10000,\nBeleggingen,beleggen,2024-01-01,5000,4000\nCrypto,crypto,2024-01-01,2000,1500\n'
    const blob = new Blob([inhoud], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'saldo_historie_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Import CSV (saldo historie)
  const handleImportCsv = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setBusyKey('importCsv', true)
    try {
      const result = await importCsvHistorie(file)
      const msgs = [`${result.ingevoegd} rijen ingevoegd`, `${result.overgeslagen} overgeslagen`]
      if (result.fouten.length > 0) msgs.push(`${result.fouten.length} fouten`)
      showToast(msgs.join(', '), result.fouten.length ? 'error' : 'success')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setBusyKey('importCsv', false)
      e.target.value = ''
    }
  }

  // Delete historie
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

  // Delete alles
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
        />
      )}

      <h2 className="text-3xl font-display" style={{ color: theme.textPrimary, fontFamily: theme.fontDisplay }}>
        Instellingen
      </h2>

      <Section
        title="Exporteren"
        description="Download al je data als backup of om te importeren in een ander systeem."
      >
        <Row
          label="Exporteer alle data (JSON)"
          description="Bevat rekeningen, saldo-historie, schulden, rendement en jaaropgaves."
        >
          <Btn onClick={handleExport} disabled={busy.export}>
            {busy.export ? 'Exporteren...' : 'Exporteren'}
          </Btn>
        </Row>
      </Section>

      <Section
        title="Importeren"
        description="Importeer data vanuit een eerder geëxporteerd bestand of een CSV-bestand."
      >
        <Row
          label="Importeer alle data (JSON)"
          description="Importeer vanuit een eerder geëxporteerd JSON-bestand. Bestaande records worden niet overschreven."
        >
          <label>
            <Btn as="span" disabled={busy.importJson}>
              {busy.importJson ? 'Importeren...' : 'JSON importeren'}
            </Btn>
            <input type="file" accept=".json" className="hidden" onChange={handleImportJson} disabled={busy.importJson} />
          </label>
        </Row>
        <Row
          label="Importeer saldo-historie (CSV)"
          description="Kolommen: account_naam, datum (YYYY-MM-DD), saldo, inleg (optioneel). Nieuwe accounts worden automatisch aangemaakt."
        >
          <Btn onClick={handleCsvTemplate}>Template</Btn>
          <label>
            <Btn as="span" disabled={busy.importCsv}>
              {busy.importCsv ? 'Importeren...' : 'CSV importeren'}
            </Btn>
            <input type="file" accept=".csv" className="hidden" onChange={handleImportCsv} disabled={busy.importCsv} />
          </label>
        </Row>
      </Section>

      <Section
        title="Data verwijderen"
        description="Let op: verwijderde data kan niet worden hersteld. Maak eerst een export als backup."
      >
        <Row
          label="Verwijder saldo-historie"
          description="Verwijdert alle historische saldo-data. Rekeningen en andere data blijven bewaard."
        >
          <Btn
            danger
            onClick={() => setConfirm({
              title: 'Saldo-historie verwijderen',
              description: 'Weet je zeker dat je alle historische saldo-data wilt verwijderen? Dit kan niet ongedaan worden gemaakt.',
              onConfirm: handleDeleteHistorie,
            })}
          >
            Verwijder historie
          </Btn>
        </Row>
        <Row
          label="Verwijder alle data"
          description="Verwijdert alle rekeningen, historie, schulden, rendement en jaaropgaves."
        >
          <Btn
            danger
            onClick={() => setConfirm({
              title: 'Alle data verwijderen',
              description: 'Weet je zeker dat je ALLE data wilt verwijderen? Rekeningen, historie, schulden, rendement en jaaropgaves worden permanent gewist.',
              onConfirm: handleDeleteAlles,
            })}
          >
            Alles verwijderen
          </Btn>
        </Row>
      </Section>
    </div>
  )
}
