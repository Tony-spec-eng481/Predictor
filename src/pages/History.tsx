import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { 
  Download, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, 
  Shield, ShieldCheck, ShieldAlert, Trash2, Trash, RefreshCw, Layers
} from 'lucide-react'
import { fetchMultipliers, fetchStats, exportMultipliersCsv, verifyRound, clearMultipliers, deleteMultiplier } from '../api'
import type { Multiplier, VerifyResult } from '../types'
import './History.css'

export default function History() {
  const [page, setPage] = useState(1)
  const [perPage] = useState(25)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [minMult, setMinMult] = useState('')
  const [maxMult, setMaxMult] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [verifyResults, setVerifyResults] = useState<Record<number, VerifyResult>>({})
  const [verifying, setVerifying] = useState<number | null>(null)
  const [showFilters, setShowFilters] = useState(true)
  
  const queryClient = useQueryClient()

  // Fetch paginated and filtered multipliers from the backend database
  const { data, isLoading, isPlaceholderData } = useQuery({
    queryKey: ['history', page, perPage, startDate, endDate, minMult, maxMult],
    queryFn: () =>
      fetchMultipliers({
        page,
        per_page: perPage,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        min_multiplier: minMult || undefined,
        max_multiplier: maxMult || undefined,
      }),
  })

  // Fetch overall statistics
  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['stats'],
    queryFn: fetchStats,
  })

  const totalPages = data ? Math.ceil(data.total / perPage) : 0

  const getMultiplierColorClass = (val: number) => {
    if (val >= 10) return 'text-purple'
    if (val >= 5) return 'text-amber'
    if (val >= 2) return 'text-green'
    return 'text-red'
  }

  const getBadgeClass = (val: number) => {
    if (val >= 10) return 'history-badge badge-purple'
    if (val >= 5) return 'history-badge badge-amber'
    if (val >= 2) return 'history-badge badge-green'
    return 'history-badge badge-red'
  }

  const handleClearFilters = () => {
    setStartDate('')
    setEndDate('')
    setMinMult('')
    setMaxMult('')
    setPage(1)
  }

  const handleVerify = async (id: number) => {
    setVerifying(id)
    try {
      const result = await verifyRound(id)
      setVerifyResults(prev => ({ ...prev, [id]: result }))
    } catch {
      setVerifyResults(prev => ({ ...prev, [id]: { verified: null, message: 'Verification failed.' } }))
    }
    setVerifying(null)
  }

  const toggleExpand = (id: number) => {
    setExpandedId(prev => prev === id ? null : id)
  }

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL round records? This cannot be undone.')) return
    try {
      await clearMultipliers()
      queryClient.invalidateQueries({ queryKey: ['history'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      refetchStats()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDeleteRow = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation()
    if (!window.confirm('Delete this record?')) return
    try {
      await deleteMultiplier(id)
      queryClient.invalidateQueries({ queryKey: ['history'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      refetchStats()
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="history-page-container">
      {/* Top Header */}
      <div className="history-page-header">
        <div className="header-meta">
          <h1>Round History</h1>
          <p>Browse collected multipliers and cryptographically verify round outcomes</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary flex-center gap-2" onClick={exportMultipliersCsv}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          <button className="btn-danger-outline flex-center gap-2" onClick={handleClearAll}>
            <Trash2 size={16} />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="history-stats-grid">
        <div className="kpi-card">
          <span className="kpi-label">Total Captured</span>
          <span className="kpi-value">{statsData?.total_rounds ?? 0}</span>
          <span className="kpi-detail">rounds in database</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Average Multiplier</span>
          <span className="kpi-value">{statsData?.avg_multiplier ? `${statsData.avg_multiplier.toFixed(2)}x` : '—'}</span>
          <span className="kpi-detail">all-time mean</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Median Multiplier</span>
          <span className="kpi-value">{statsData?.median_multiplier ? `${statsData.median_multiplier.toFixed(2)}x` : '—'}</span>
          <span className="kpi-detail">middle value</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Highest Record</span>
          <span className="kpi-value">{statsData?.max_multiplier ? `${statsData.max_multiplier.toFixed(2)}x` : '—'}</span>
          <span className="kpi-detail">maximum crash point</span>
        </div>
      </div>

      {/* Filters Section */}
      <div className="history-filter-section">
        <div className="filter-header" onClick={() => setShowFilters(!showFilters)}>
          <div className="filter-title flex-center gap-2">
            <Search size={16} />
            <span>Search & Filter</span>
          </div>
          <div className="flex-center gap-3">
            <button 
              className="btn-link" 
              onClick={(e) => { e.stopPropagation(); handleClearFilters(); }}
            >
              Reset Filters
            </button>
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>

        {showFilters && (
          <div className="filter-body">
            <div className="filter-fields-grid">
              <div className="filter-field">
                <label>Start Date</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => { setStartDate(e.target.value); setPage(1); }} 
                />
              </div>
              <div className="filter-field">
                <label>End Date</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => { setEndDate(e.target.value); setPage(1); }} 
                />
              </div>
              <div className="filter-field">
                <label>Min Multiplier</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="Min (e.g. 2.0)" 
                  value={minMult} 
                  onChange={(e) => { setMinMult(e.target.value); setPage(1); }} 
                />
              </div>
              <div className="filter-field">
                <label>Max Multiplier</label>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="Max (e.g. 10.0)" 
                  value={maxMult} 
                  onChange={(e) => { setMaxMult(e.target.value); setPage(1); }} 
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Table Content */}
      <div className="history-table-card">
        <div className="table-header-bar">
          <div className="table-title flex-center gap-2">
            <Layers size={16} />
            <span>Round Log</span>
          </div>
          <span className="results-badge">
            {isLoading ? 'Loading...' : `${data?.total ?? 0} matches`}
          </span>
        </div>

        {isLoading ? (
          <div className="history-loading-wrapper">
            <RefreshCw size={24} className="animate-spin" />
            <span>Fetching data from database...</span>
          </div>
        ) : !data || data.multipliers.length === 0 ? (
          <div className="history-empty-wrapper">
            <div className="empty-icon">📁</div>
            <h3>No results match your criteria</h3>
            <p>Try clearing your filters or capturing additional data using the Data Collection page.</p>
            <button className="btn-primary" onClick={handleClearFilters}>
              Clear Active Filters
            </button>
          </div>
        ) : (
          <>
            <div className="history-table-wrapper">
              <table className="history-custom-table">
                <thead>
                  <tr>
                    <th>Index</th>
                    <th>Multiplier</th>
                    <th>Status</th>
                    <th>Source</th>
                    <th>Timestamp</th>
                    <th>Provably Fair</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {data.multipliers.map((m, idx) => (
                    <HistoryRow
                      key={m.id}
                      m={m}
                      idx={(page - 1) * perPage + idx + 1}
                      expanded={expandedId === m.id}
                      onToggle={() => toggleExpand(m.id)}
                      onVerify={() => handleVerify(m.id)}
                      verifyResult={verifyResults[m.id]}
                      isVerifying={verifying === m.id}
                      multiplierClass={getMultiplierColorClass(m.multiplier)}
                      badgeClass={getBadgeClass(m.multiplier)}
                      onDelete={(e) => handleDeleteRow(e, m.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="history-pagination">
                <button 
                  className="pagination-btn flex-center gap-1"
                  onClick={() => setPage(p => Math.max(1, p - 1))} 
                  disabled={page <= 1 || isPlaceholderData}
                >
                  <ChevronLeft size={16} />
                  <span>Prev</span>
                </button>
                <div className="pagination-text">
                  Page <strong>{page}</strong> of {totalPages}
                </div>
                <button 
                  className="pagination-btn flex-center gap-1"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} 
                  disabled={page >= totalPages || isPlaceholderData}
                >
                  <span>Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Row Component ───
interface HistoryRowProps {
  m: Multiplier
  idx: number
  expanded: boolean
  onToggle: () => void
  onVerify: () => void
  verifyResult?: VerifyResult
  isVerifying: boolean
  multiplierClass: string
  badgeClass: string
  onDelete: (e: React.MouseEvent) => void
}

function HistoryRow({
  m, idx, expanded, onToggle, onVerify, verifyResult, isVerifying,
  multiplierClass, badgeClass, onDelete
}: HistoryRowProps) {
  const hasSeeds = !!(m.server_seed || m.server_seed_hash)
  const sourceLabel = m.source === 'websocket' ? 'WebSocket' : m.source === 'dom' ? 'DOM' : m.source || 'Scraped'
  const sourceClass = m.source === 'websocket' ? 'source-badge web-socket' : 'source-badge dom-scrape'

  const formattedDate = format(new Date(m.timestamp), 'MMM dd, yyyy')
  const formattedTime = format(new Date(m.timestamp), 'HH:mm:ss')

  const getStatusText = (val: number) => {
    if (val >= 10) return '🚀 Moon'
    if (val >= 5) return '⚡ High'
    if (val >= 2) return '✅ Safe'
    return '⚠️ Crash'
  }

  return (
    <>
      <tr className={`history-clickable-row ${expanded ? 'row-expanded' : ''}`} onClick={onToggle}>
        <td data-label="Index" className="cell-index">
          <span className="index-num">#{idx}</span>
        </td>
        <td data-label="Multiplier" className="cell-multiplier">
          <span className={`multiplier-text ${multiplierClass}`}>
            {m.multiplier.toFixed(2)}x
          </span>
        </td>
        <td data-label="Status" className="cell-status">
          <span className={badgeClass}>{getStatusText(m.multiplier)}</span>
        </td>
        <td data-label="Source" className="cell-source">
          <span className={sourceClass}>{sourceLabel}</span>
        </td>
        <td data-label="Timestamp" className="cell-time">
          <div className="time-container">
            <span className="time-date">{formattedDate}</span>
            <span className="time-hour">{formattedTime}</span>
          </div>
        </td>
        <td data-label="Provably Fair" className="cell-fair">
          {hasSeeds ? (
            <span className="shield-icon-container verified" title="Cryptographic proof available">
              <Shield size={16} />
              <span className="shield-lbl">Available</span>
            </span>
          ) : (
            <span className="shield-icon-container empty">—</span>
          )}
        </td>
        <td className="cell-actions">
          <div className="row-action-buttons">
            <button 
              className="btn-icon-danger" 
              onClick={onDelete} 
              title="Delete this record"
            >
              <Trash size={14} />
            </button>
            {expanded ? <ChevronUp size={16} className="chevron" /> : <ChevronDown size={16} className="chevron" />}
          </div>
        </td>
      </tr>

      {/* Drawer detailed row */}
      {expanded && (
        <tr className="history-detail-row">
          <td colSpan={7}>
            <div className="detail-panel">
              <div className="detail-header flex-center gap-2">
                <Shield size={16} />
                <h3>Provably Fair Analysis</h3>
              </div>

              {hasSeeds ? (
                <div className="detail-grid">
                  <DetailItem label="Game Round ID" value={m.game_round_id} />
                  <DetailItem label="Server Seed (Raw)" value={m.server_seed} />
                  <DetailItem label="Server Seed (SHA-256 Hash)" value={m.server_seed_hash} />
                  <DetailItem label="Combined SHA-512 Hash" value={m.sha512_hash} />
                  <DetailItem label="Client Seed 1" value={m.client_seed_1} />
                  <DetailItem label="Client Seed 2" value={m.client_seed_2} />
                  <DetailItem label="Client Seed 3" value={m.client_seed_3} />
                  <DetailItem label="Nonce" value={m.nonce !== null && m.nonce !== undefined ? String(m.nonce) : null} />
                </div>
              ) : (
                <div className="detail-empty-message">
                  No cryptographic seed data was logged for this round (captured via basic DOM scraper). Only basic stats are available.
                </div>
              )}

              <div className="detail-verify-bar flex-center gap-3">
                <button
                  className="btn-primary flex-center gap-2"
                  onClick={(e) => { e.stopPropagation(); onVerify(); }}
                  disabled={!hasSeeds || isVerifying}
                >
                  <Shield size={14} />
                  {isVerifying ? 'Computing...' : 'Verify Cryptographic Proof'}
                </button>

                {verifyResult && <VerifyOutcome result={verifyResult} />}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function DetailItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="detail-field">
      <div className="detail-field-label">{label}</div>
      <div className="detail-field-value">{value || '—'}</div>
    </div>
  )
}

function VerifyOutcome({ result }: { result: VerifyResult }) {
  if (result.verified === true) {
    return (
      <div className="verify-banner success flex-center gap-2">
        <ShieldCheck size={16} />
        <span>Verification Success: Calculated multiplier is precisely {result.computed_multiplier}x. Match validated.</span>
      </div>
    )
  }
  if (result.verified === false) {
    return (
      <div className="verify-banner error flex-center gap-2">
        <ShieldAlert size={16} />
        <span>Verification Mismatch: Calculated multiplier ({result.computed_multiplier}x) differs from recorded multiplier.</span>
      </div>
    )
  }
  return (
    <div className="verify-banner failure">
      {result.message || 'Unable to compute verification.'}
    </div>
  )
}