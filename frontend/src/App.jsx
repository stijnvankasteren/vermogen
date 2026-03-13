import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import Overzicht from './pages/Overzicht'
import Rekeningen from './pages/Rekeningen'
import ToekomstigVermogen from './pages/ToekomstigVermogen'
import Rendement from './pages/Rendement'
import Verdeling from './pages/Verdeling'
import Jaaropgave from './pages/Jaaropgave'
import Vermogensgroei from './pages/Vermogensgroei'
import { theme } from './theme'

const navItems = [
  { path: '/', label: 'Overzicht', icon: '◈' },
  { path: '/rekeningen', label: 'Rekeningen', icon: '◉' },
  { path: '/toekomst', label: 'Toekomstig', icon: '◇' },
  { path: '/rendement', label: 'Rendement', icon: '◆' },
  { path: '/verdeling', label: 'Verdeling', icon: '◑' },
  { path: '/jaaropgave', label: 'Jaaropgave', icon: '◎' },
  { path: '/groei', label: 'Vermogensgroei', icon: '◈' },
]

function Sidebar({ open, onClose }) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-20 md:hidden"
          onClick={onClose}
        />
      )}
      <nav
        className={`fixed top-0 left-0 h-full z-30 flex flex-col transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        style={{
          width: 240,
          background: 'rgba(15,17,23,0.97)',
          borderRight: `1px solid ${theme.border}`,
          backdropFilter: 'blur(16px)',
        }}
      >
        <div className="px-6 pt-8 pb-6" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <h1
            className="text-2xl font-display"
            style={{ color: theme.accent, fontFamily: theme.fontDisplay }}
          >
            Vermogen
          </h1>
          <p className="text-xs mt-1" style={{ color: theme.textMuted }}>Portfolio Dashboard</p>
        </div>
        <ul className="flex-1 py-6 px-3 space-y-1">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200
                  ${isActive
                    ? 'text-white'
                    : 'hover:bg-white/5'
                  }`
                }
                style={({ isActive }) => ({
                  color: isActive ? theme.accent : theme.textSecondary,
                  background: isActive ? 'rgba(201,168,76,0.12)' : undefined,
                })}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="px-6 py-4" style={{ borderTop: `1px solid ${theme.border}` }}>
          <p className="text-xs" style={{ color: theme.textMuted }}>
            © {new Date().getFullYear()} Vermogensdashboard
          </p>
        </div>
      </nav>
    </>
  )
}

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen" style={{ background: theme.bg }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col md:ml-60">
        <header
          className="flex items-center md:hidden px-4 py-4 sticky top-0 z-10"
          style={{ background: 'rgba(15,17,23,0.95)', borderBottom: `1px solid ${theme.border}` }}
        >
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 transition"
            style={{ color: theme.textPrimary }}
          >
            <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="19" y2="6" />
              <line x1="3" y1="12" x2="19" y2="12" />
              <line x1="3" y1="18" x2="19" y2="18" />
            </svg>
          </button>
          <h1 className="ml-3 text-lg font-display" style={{ color: theme.accent, fontFamily: theme.fontDisplay }}>
            Vermogen
          </h1>
        </header>
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Overzicht />} />
          <Route path="/rekeningen" element={<Rekeningen />} />
          <Route path="/toekomst" element={<ToekomstigVermogen />} />
          <Route path="/rendement" element={<Rendement />} />
          <Route path="/verdeling" element={<Verdeling />} />
          <Route path="/jaaropgave" element={<Jaaropgave />} />
          <Route path="/groei" element={<Vermogensgroei />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
