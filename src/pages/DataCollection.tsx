import { useState, useEffect, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Play, Square, Wifi, WifiOff, RefreshCw, Zap, Trash2, Shield, Terminal, Radio
} from 'lucide-react'
import { getCollectionStatus, startCollection, stopCollection, clearMultipliers, fetchMultipliers } from '../api'
import type { SocketContext } from '../types'
import './DataCollection.css'

type LoginStatus = 'idle' | 'logging_in' | 'logged_in' | 'failed'

export default function DataCollection() {
  const { socket } = useOutletContext<SocketContext>()
  const queryClient = useQueryClient()

  const [loginStatus, setLoginStatus] = useState<LoginStatus>('idle')
  const [isRunning, setIsRunning] = useState(false)
  const [collectedCount, setCollectedCount] = useState(0)
  const [lastMultiplier, setLastMultiplier] = useState<number | null>(null)
  const [lastCrash, setLastCrash] = useState<number | null>(null)
  const [dataSource, setDataSource] = useState('initializing')
  const [wsHooked, setWsHooked] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [statusMsg, setStatusMsg] = useState('System ready.')
  const [backendLogs, setBackendLogs] = useState<{message: string, level: string, id: number}[]>([])
  
  const logsRef = useRef<HTMLDivElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const logIdCounter = useRef(0)

  // Fetch initial logs from the database
  const { data: historyData } = useQuery({
    queryKey: ['recentMultipliers'],
    queryFn: () => fetchMultipliers({ per_page: 50 }),
    refetchInterval: 10000,
  })

  const roundsLog = historyData?.multipliers || []

  // Check backend status on mount
  useEffect(() => {
    getCollectionStatus()
      .then((s) => {
        setIsRunning(s.is_running)
        setLoginStatus((s.login_status as LoginStatus) ?? 'idle')
        setCollectedCount(s.collected_count ?? 0)
        setLastMultiplier(s.last_multiplier ?? null)
        setLastCrash(s.last_crash ?? null)
        setDataSource(s.data_source ?? 'initializing')
        setWsHooked(s.ws_hooked ?? false)
        if (s.recent_errors?.length) setErrors(s.recent_errors)
      })
      .catch(() => {
        setStatusMsg('Backend connection failed.')
      })
  }, [])

  // Listen for socket events
  useEffect(() => {
    if (!socket) return
    
    const multiplierHandler = (data: any) => {
      if (data.is_final) {
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

  // Scroll logs to bottom
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight
    }
  }, [backendLogs])

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = 0
    }
  }, [roundsLog])

  // Controls Handlers
  const handleStart = async () => {
    setStatusMsg('Requesting collector start…')
    try {
      const res = await startCollection()
      if (res.status) {
        setIsRunning(true)
        setStatusMsg('Collector active.')
      }
    } catch {
      setStatusMsg('Backend unreachable.')
    }
  }

  const handleStop = async () => {
    try {
      await stopCollection()
      setIsRunning(false)
      setStatusMsg('Collector stopped.')
    } catch {
      setStatusMsg('Error stopping collector.')
    }
  }

  const handleClear = async () => {
    if (!window.confirm('Delete all database history? This cannot be undone.')) return
    try {
      await clearMultipliers()
      setCollectedCount(0)
      setLastMultiplier(null)
      setLastCrash(null)
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['recentMultipliers'] })
      setStatusMsg('Database history cleared.')
    } catch {
      setStatusMsg('Clear operation failed.')
    }
  }

  const multiplierColorClass = (v: number) => {
    if (v >= 10) return 'text-purple'
    if (v >= 5)  return 'text-amber'
    if (v >= 2)  return 'text-green'
    return 'text-red'
  }

  return (
    <div className="collect-page-container">
      <div className="collect-layout-grid">
        
        {/* Left Column: Settings and Diagnostics */}
        <div className="collect-panel-left">
          <div className="collect-section-header">
            <h2>Collector Control</h2>
            <p>Initiate, monitor, and configure data scrapers</p>
          </div>

          {/* Engine Status Card */}
          <div className="collect-card status-info-card">
            <div className="card-header-row">
              <span className="card-lbl">System Engine</span>
              <span className={`status-pill ${isRunning ? 'active' : 'inactive'}`}>
                <span className={`status-pulse-dot ${isRunning ? 'pulse' : ''}`} />
                {isRunning ? 'RUNNING' : 'OFFLINE'}
              </span>
            </div>

            <div className="kpi-row">
              <div className="kpi-block">
                <span className="kpi-lbl">Current Source</span>
                <span className="kpi-val flex-center gap-1">
                  <Zap size={13} className="text-amber" />
                  {dataSource === 'playwright_ws' ? 'Playwright WS' : dataSource}
                </span>
              </div>
              
              {lastCrash !== null && (
                <div className="kpi-block">
                  <span className="kpi-lbl">Last Captured</span>
                  <span className={`kpi-val bold ${multiplierColorClass(lastCrash)}`}>
                    {lastCrash.toFixed(2)}x
                  </span>
                </div>
              )}
            </div>

            <div className="actions-row">
              {isRunning ? (
                <button className="btn-solid-red flex-center gap-2" onClick={handleStop}>
                  <Square size={14} fill="currentColor" />
                  <span>Stop Capture</span>
                </button>
              ) : (
                <button className="btn-solid-black flex-center gap-2" onClick={handleStart}>
                  <Play size={14} fill="currentColor" />
                  <span>Start Capture</span>
                </button>
              )}
              <button className="btn-outline-red flex-center gap-2" onClick={handleClear}>
                <Trash2 size={14} />
                <span>Reset Database</span>
              </button>
            </div>
            {statusMsg && <div className="status-sys-msg">Status: {statusMsg}</div>}
          </div>

          {/* Logs Card */}
          <div className="collect-card logs-console-card">
            <div className="card-header-row border-bottom">
              <span className="card-lbl flex-center gap-2">
                <Terminal size={14} />
                Console Logs
              </span>
              <button 
                className="clear-console-btn"
                onClick={() => setBackendLogs([])}
                title="Clear console window"
              >
                Clear
              </button>
            </div>
            
            <div className="console-body" ref={logsRef}>
              {backendLogs.length === 0 ? (
                <div className="console-line muted">No activity recorded...</div>
              ) : (
                backendLogs.map((l) => (
                  <div key={l.id} className={`console-line ${l.level.toLowerCase()}`}>
                    <span className="console-level">[{l.level}]</span>
                    <span className="console-message">{l.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Logs */}
        <div className="collect-panel-right">
          <div className="collect-section-header">
            <h2>Real-time Stream</h2>
            <p>Live feed of scraped rounds retrieved from database</p>
          </div>

          <div className="stream-container">
            <div className="stream-header-row">
              <span className="card-lbl flex-center gap-2">
                <Radio size={14} className={isRunning ? 'text-green animate-pulse' : 'text-red'} />
                Round Log
              </span>
              <span className="stream-count-badge">{roundsLog.length} rounds</span>
            </div>

            <div className="stream-list" ref={logRef}>
              {roundsLog.length === 0 ? (
                <div className="stream-empty">
                  Waiting for active collection to pipe data...
                </div>
              ) : (
                roundsLog.map((m) => {
                  const hasSeeds = !!(m.server_seed || m.server_seed_hash)
                  const isWs = m.source === 'websocket'
                  return (
                    <div key={m.id} className="stream-item">
                      <div className="stream-item-main flex-center gap-3">
                        <span className={`stream-multiplier-text ${multiplierColorClass(m.multiplier)}`}>
                          {m.multiplier.toFixed(2)}x
                        </span>
                        <div className="stream-meta flex-center gap-2">
                          <span className={`source-tag ${isWs ? 'tag-ws' : 'tag-dom'}`}>
                            {m.source || 'Scraped'}
                          </span>
                          {m.game_round_id && (
                            <span className="round-id-tag">
                              ID: {m.game_round_id.slice(-8)}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="stream-item-right flex-center gap-3">
                        {hasSeeds && (
                          <span className="verified-icon-lbl flex-center gap-1 text-green" title="Provably fair seeds captured">
                            <Shield size={13} />
                            <span>Proof Available</span>
                          </span>
                        )}
                        <span className="stream-time-text">
                          {new Date(m.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}