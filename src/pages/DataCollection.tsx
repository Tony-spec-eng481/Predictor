import { useState, useEffect, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Play, Square, CheckCircle, XCircle,
  Wifi, WifiOff, RefreshCw, Zap, Trash2,Shield
} from 'lucide-react'
import { getCollectionStatus, startCollection, stopCollection, clearMultipliers, fetchMultipliers } from '../api'
import type { SocketContext, Multiplier } from '../types'
import './DataCollection.css'

// ─── Types ────────────────────────────────────────────────────────────────────

type LoginStatus = 'idle' | 'logging_in' | 'logged_in' | 'failed'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function multiplierColor(v: number) {
  if (v >= 10) return '#a78bfa'
  if (v >= 5)  return '#f59e0b'
  if (v >= 2)  return '#10b981'
  return '#ef4444'
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DataCollection() {
  const { socket } = useOutletContext<SocketContext>()
  const queryClient = useQueryClient()

  const [loginStatus, setLoginStatus] = useState<LoginStatus>('idle')
  const [isRunning, setIsRunning] = useState(false)
  const [collectedCount, setCollectedCount] = useState(0)
  const [lastMultiplier, setLastMultiplier] = useState<number | null>(null) // Live Ticker
  const [lastCrash, setLastCrash] = useState<number | null>(null)           // Final Result
  const [dataSource, setDataSource] = useState('initializing')
  const [wsHooked, setWsHooked] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [statusMsg, setStatusMsg] = useState('System ready.')
  const [iframeFullscreen, setIframeFullscreen] = useState(false)
  const [backendLogs, setBackendLogs] = useState<{message: string, level: string, id: number}[]>([])
  const logsRef = useRef<HTMLDivElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const logIdCounter = useRef(0)

  // ── Scraper Logic removed per user request ──

  // ── Fetch Initial Log from DB ──
  const { data: historyData } = useQuery({
    queryKey: ['recentMultipliers'],
    queryFn: () => fetchMultipliers({ per_page: 50 }),
    refetchInterval: 10000, // Background refresh every 10s
  })

  const roundsLog = historyData?.multipliers || []

  // ── On mount: check status ──
  useEffect(() => {
    getCollectionStatus().then((s) => {
      setIsRunning(s.is_running)
      setLoginStatus((s.login_status as LoginStatus) ?? 'idle')
      setCollectedCount(s.collected_count ?? 0)
      setLastMultiplier(s.last_multiplier ?? null)
      setLastCrash(s.last_crash ?? null)
      setDataSource(s.data_source ?? 'initializing')
      setWsHooked(s.ws_hooked ?? false)
      if (s.recent_errors?.length) setErrors(s.recent_errors)
    }).catch(() => {
      setStatusMsg('Backend not reachable.')
    })
  }, [])

  // ── Listen for live multipliers and logs via socket ──
  useEffect(() => {
    if (!socket) return
    
    const multiplierHandler = (data: any) => {
      if (data.is_final) {
        // Invalidate query to fetch fresh data from DB
        queryClient.invalidateQueries({ queryKey: ['recentMultipliers'] })
        queryClient.invalidateQueries({ queryKey: ['stats'] })
      }
      setLastMultiplier(data.multiplier)
    }

    const logHandler = (data: {message: string, level: string}) => {
      setBackendLogs((prev) => [
        ...prev.slice(-99),
        { ...data, id: ++logIdCounter.current }
      ])
    }

    const statusHandler = (s: any) => {
      if (s.login_status) setLoginStatus(s.login_status)
      if (s.is_running !== undefined) setIsRunning(s.is_running)
      if (s.data_source) setDataSource(s.data_source)
      if (s.ws_hooked !== undefined) setWsHooked(s.ws_hooked)
      if (s.collected_count !== undefined) setCollectedCount(s.collected_count)
      if (s.last_multiplier !== undefined) setLastMultiplier(s.last_multiplier)
      if (s.last_crash !== undefined) setLastCrash(s.last_crash)
    }

    socket.on('new_multiplier', multiplierHandler)
    socket.on('backend_log', logHandler)
    socket.on('collection_status', statusHandler)
    socket.on('status_update', statusHandler)

    return () => {
      socket.off('new_multiplier', multiplierHandler)
      socket.off('backend_log', logHandler)
      socket.off('collection_status', statusHandler)
      socket.off('status_update', statusHandler)
    }
  }, [socket, queryClient])

  // ── Auto-scroll logs ──
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [backendLogs])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0
  }, [roundsLog])

  // ── Handlers ──
  const handleRestart = async () => {
    setStatusMsg('Starting collection…')
    try {
      const res = await startCollection()
      if (res.status) {
        setIsRunning(true)
        setStatusMsg('Collection live.')
      }
    } catch {
      setStatusMsg('Could not reach backend.')
    }
  }

  const handleStop = async () => {
    await stopCollection().catch(() => {})
    setIsRunning(false)
    setStatusMsg('Collection stopped.')
  }

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to delete all round history?')) return
    try {
      await clearMultipliers()
      setCollectedCount(0)
      setLastMultiplier(null)
      setLastCrash(null)
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['recentMultipliers'] })
      setStatusMsg('History cleared.')
    } catch {
      setStatusMsg('Failed to clear history.')
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className={`data-collection-page ${iframeFullscreen ? 'fullscreen-mode' : ''}`}>
      <div className="data-collection-layout">
        {/* Left Column - Status & Controls */}
        <div className="column left-column">
          <div className="column-header">
            <h2>Collection Control</h2>
            <p>Monitor and manage data capture</p>
          </div>

          <div className="status-card">
            <div className="status-header">
              <div className="status-title">
                {isRunning ? <Wifi className="icon-green" size={18} /> : <WifiOff className="icon-red" size={18} />}
                <span>System Status</span>
              </div>
              <span className={`status-badge ${isRunning ? 'live' : 'stopped'}`}>
                <span className={`pulse-dot ${isRunning ? 'running' : 'stopped'}`} />
                {isRunning ? 'LIVE' : 'STOPPED'}
              </span>
            </div>

            <div className="status-stats">
              <div className="stat-item">
                <div className="stat-label">Source</div>
                <SourceBadge source={dataSource} wsHooked={wsHooked} />
              </div>
              {/* <div className="stat-item">
                <div className="stat-label">Rounds Captured</div>
                <div className="stat-value-large">{collectedCount}</div>
              </div> */}
              {lastCrash !== null && (
                <div className="stat-item">
                  <div className="stat-label">Last Crash</div>
                  <div className="multiplier-display" style={{ color: multiplierColor(lastCrash) }}>
                    {lastCrash.toFixed(2)}x
                  </div>
                </div>
              )}
            </div>

            <div className="action-buttons">
              {isRunning ? (
                <button className="btn-danger" onClick={handleStop}>
                  <Square size={15} /> Stop Collection
                </button>
              ) : (
                <button className="btn-primary" onClick={handleRestart}>
                  <Play size={15} /> Start Collection
                </button>
              )}
              <button className="btn-outline-danger" onClick={handleClear} title="Clear Database History">
                <Trash2 size={15} /> Clear History
              </button>
            </div>
          </div>

          <div className="backend-logs-card">
            <div className="column-header mini">
              <h3>Backend Logs</h3>
              <RefreshCw 
                size={14} 
                className={isRunning ? 'spinning' : ''} 
                style={{ cursor: 'pointer', opacity: 0.5 }}
                onClick={() => setBackendLogs([])}
              />
            </div>
            <div className="logs-terminal" ref={logsRef}>
              {backendLogs.length === 0 ? (
                <div className="log-line muted">No activity recorded...</div>
              ) : (
                backendLogs.map((l) => (
                  <div key={l.id} className={`log-line ${l.level.toLowerCase()}`}>
                    <span className="log-level-tag">[{l.level}]</span> {l.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>


        {/* Right Column - Live Log */}
        <div className="column right-column">
          <div className="column-header">
            <h2>Live Round Log</h2>
            <span className="log-count">{roundsLog.length} entries</span>
          </div>

          <div className="log-container" ref={logRef}>
            {roundsLog.length === 0 ? (
              <div className="log-empty">Waiting for rounds...</div>
            ) : (
              roundsLog.map((m) => {
                const badgeClass = m.source === 'websocket' ? 'ws' : m.source === 'dom' ? 'dom' : 'man'
                return (
                  <div key={m.id} className="log-entry">
                    <div className="log-multiplier-bar" style={{ background: multiplierColor(m.multiplier) }} />
                    <div className="log-multiplier-value" style={{ color: multiplierColor(m.multiplier) }}>
                      {m.multiplier.toFixed(2)}x
                    </div>
                    <div className="log-details">
                      <div className="log-time">{new Date(m.timestamp).toLocaleTimeString()}</div>
                      <div className="log-meta">
                        <span className={`log-badge badge-${badgeClass}`}>{m.source || 'backend'}</span>
                        {m.game_round_id && <span className="log-id">ID: {m.game_round_id.slice(-8)}</span>}
                      </div>
                    </div>
                    {m.server_seed && <Shield className="log-shield" size={14} />}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function LoginBadge({ status }: { status: LoginStatus }) {
  const map: Record<LoginStatus, { icon: React.ReactNode; label: string; color: string }> = {
    idle:       { icon: <XCircle size={14} />, label: 'Idle', color: '#64748b' },
    logging_in: { icon: <RefreshCw size={14} className="spinning" />, label: 'Logging in…', color: '#22d3ee' },
    logged_in:  { icon: <CheckCircle size={14} />, label: 'Logged In', color: '#4ade80' },
    failed:     { icon: <XCircle size={14} />, label: 'Failed', color: '#f87171' },
  }
  const { icon, label, color } = map[status]
  return (
    <span className="login-badge" style={{ color }}>
      {icon} {label}
    </span>
  )
}

function SourceBadge({ source, wsHooked }: { source: string; wsHooked: boolean }) {
  return (
    <span className="source-badge ws">
      <Zap size={14} /> {source}
    </span>
  )
}