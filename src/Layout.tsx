import { useState, useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { io, Socket } from 'socket.io-client'
import {
  BarChart3,
  Database,
  Activity,
  Zap,
  Menu,
  X,
} from 'lucide-react'
import './Layout.css'

export default function Layout() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    })

    newSocket.on('connect', () => setConnected(true))
    newSocket.on('disconnect', () => setConnected(false))

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const navItems = [
    { path: '/', label: 'Dashboard', icon: BarChart3 },
    { path: '/collect', label: 'Data Collection', icon: Zap },
    { path: '/history', label: 'History', icon: Database },
    { path: '/analytics', label: 'Analytics', icon: Activity },
  ]

  return (
    <div className="app-layout">
      {/* Navbar */}
      <nav className="navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <div className="navbar-logo">
              <span className="navbar-logo-icon">✈</span>
              <div className="navbar-logo-text">
                <h1>Aviator Analytics</h1>
                <p>SpotPesa Data Hub</p>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="navbar-links">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link${isActive(item.path) ? ' active' : ''}`}
              >
                <item.icon className="nav-icon" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="navbar-actions">
            <div className="connection-status">
              <span className={`status-dot ${connected ? 'connected' : 'disconnected'}`} />
              <span className="status-text">
                {connected ? 'Live Connected' : 'Disconnected'}
              </span>
            </div>

            {/* Mobile Menu Button */}
            <button
              className="mobile-menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="mobile-nav">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`mobile-nav-link${isActive(item.path) ? ' active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className="nav-icon" />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="main-content">
        <Outlet context={{ socket, connected }} />
      </main>
    </div>
  )
}