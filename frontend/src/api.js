const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'API fout')
  }
  if (res.status === 204) return null
  return res.json()
}

// Accounts
export const getAccounts = () => request('/accounts')
export const createAccount = (data) => request('/accounts', { method: 'POST', body: JSON.stringify(data) })
export const updateAccount = (id, data) => request(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteAccount = (id) => request(`/accounts/${id}`, { method: 'DELETE' })

// Historie
export const getAccountHistorie = (id) => request(`/accounts/${id}/historie`)
export const addAccountHistorie = (id, data) => request(`/accounts/${id}/historie`, { method: 'POST', body: JSON.stringify(data) })
export const getTotaalHistorie = () => request('/historie/totaal')
export const getVermogensgroei = () => request('/vermogensgroei')

// Import
export const importCsv = (file) => {
  const form = new FormData()
  form.append('file', file)
  return fetch('/api/import', { method: 'POST', body: form })
    .then(async res => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || 'Import fout')
      }
      return res.json()
    })
}

// Schulden
export const getSchulden = () => request('/schulden')
export const createSchuld = (data) => request('/schulden', { method: 'POST', body: JSON.stringify(data) })
export const updateSchuld = (id, data) => request(`/schulden/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const deleteSchuld = (id) => request(`/schulden/${id}`, { method: 'DELETE' })

// Rendement
export const getRendement = () => request('/rendement')
export const upsertRendement = (data) => request('/rendement', { method: 'POST', body: JSON.stringify(data) })

// Jaaropgave
export const getJaaropgave = () => request('/jaaropgave')
export const getJaaropgaveJaar = (jaar) => request(`/jaaropgave/${jaar}`)
export const upsertJaaropgave = (data) => request('/jaaropgave', { method: 'POST', body: JSON.stringify(data) })

// Data beheer
export const exportData = () => fetch('/api/export').then(r => r.json())
export const deleteHistorie = () => request('/data/historie', { method: 'DELETE' })
export const deleteAlles = () => request('/data/alles', { method: 'DELETE' })
