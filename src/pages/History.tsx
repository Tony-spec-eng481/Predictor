import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { 
  Download, Search, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, 
  Shield, ShieldCheck, ShieldAlert, Trash2, Trash
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { fetchMultipliers, exportMultipliersCsv, verifyRound, clearMultipliers, deleteMultiplier } from '../api'
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
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
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

  const totalPages = data ? Math.ceil(data.total / perPage) : 0

  const getMultiplierColor = (val: number) => {
    if (val >= 10) return '#a78bfa'
    if (val >= 5) return '#f59e0b'
    if (val >= 2) return '#10b981'
    return '#ef4444'
  }

  const getBadgeClass = (val: number) => {
    if (val >= 10) return 'badge badge-purple'
    if (val >= 5) return 'badge badge-amber'
    if (val >= 2) return 'badge badge-green'
    return 'badge badge-red'
  }

  const handleClearFilters = () => {
    setStartDate(''); setEndDate(''); setMinMult(''); setMaxMult(''); setPage(1)
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
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="history-page">
      <div className="page-header">
        <div className="page-header-content">
          <h1>History</h1>
          <p>Browse all collected rounds with provably fair verification</p>
        </div>
        <div className="page-actions">
          <button className="btn-outline-danger" onClick={handleClearAll} style={{ marginRight: '0.75rem' }}>
            <Trash2 size={16} />
            Clear All
          </button>
          <button className="btn-primary" onClick={exportMultipliersCsv}>
            <Download size={16} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card filters-card">
        <div className="card-header">
          <span className="card-title">
            <Search size={18} />
            Filters
          </span>
          <button className="btn-secondary" onClick={handleClearFilters}>Clear All</button>
        </div>
        <div className="filters-grid">
          <div className="filter-group">
            <label className="form-label">Start Date</label>
            <input type="date" className="form-input" value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1) }} />
          </div>
          <div className="filter-group">
            <label className="form-label">End Date</label>
            <input type="date" className="form-input" value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1) }} />
          </div>
          <div className="filter-group">
            <label className="form-label">Min Multiplier</label>
            <input type="number" step="0.01" className="form-input" placeholder="e.g. 1.50"
              value={minMult} onChange={(e) => { setMinMult(e.target.value); setPage(1) }} />
          </div>
          <div className="filter-group">
            <label className="form-label">Max Multiplier</label>
            <input type="number" step="0.01" className="form-input" placeholder="e.g. 10.00"
              value={maxMult} onChange={(e) => { setMaxMult(e.target.value); setPage(1) }} />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="card table-card">
        <div className="card-header">
          <span className="card-title">Round Records</span>
          <span className="stats-badge">{data?.total ?? 0} Total Rounds</span>
        </div>

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <div className="loading-text">Loading rounds...</div>
          </div>
        ) : !data || data.multipliers.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-text">No records found</div>
            <div className="empty-state-sub">Adjust your filters or start collecting data</div>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="col-id">#</th>
                    <th className="col-multiplier">Multiplier</th>
                    <th className="col-status">Status</th>
                    <th className="col-source">Source</th>
                    <th className="col-date">Date &amp; Time</th>
                    <th className="col-fair">Fair</th>
                    <th className="col-expand"></th>
                  </tr>
                </thead>
                <tbody>
                  {data.multipliers.map((m, idx) => (
                    <RoundRow
                      key={m.id}
                      m={m}
                      idx={(page - 1) * perPage + idx + 1}
                      expanded={expandedId === m.id}
                      onToggle={() => toggleExpand(m.id)}
                      onVerify={() => handleVerify(m.id)}
                       verifyResult={verifyResults[m.id]}
                       isVerifying={verifying === m.id}
                       getMultiplierColor={getMultiplierColor}
                       getBadgeClass={getBadgeClass}
                       onDelete={(e) => handleDeleteRow(e, m.id)}
                     />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination-container">
                <button 
                  className="pagination-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))} 
                  disabled={page <= 1}
                >
                  <ChevronLeft size={18} />
                  Previous
                </button>
                <div className="pagination-info">
                  Page <span className="pagination-current">{page}</span> of {totalPages}
                </div>
                <button 
                  className="pagination-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))} 
                  disabled={page >= totalPages}
                >
                  Next
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Row with expandable provably fair detail ──────────────────────────────────

function RoundRow({
  m, idx, expanded, onToggle, onVerify, verifyResult, isVerifying,
  getMultiplierColor, getBadgeClass, onDelete,
}: {
  m: Multiplier
  idx: number
  expanded: boolean
  onToggle: () => void
  onVerify: () => void
  verifyResult?: VerifyResult
  isVerifying: boolean
  getMultiplierColor: (v: number) => string
  getBadgeClass: (v: number) => string
  onDelete: (e: React.MouseEvent) => void
}) {
  const hasSeedData = !!(m.server_seed || m.server_seed_hash)
  const sourceLabel = m.source === 'websocket' ? 'WebSocket' : m.source === 'dom' ? 'DOM' : m.source || '—'
  const sourceBadge = m.source === 'websocket' ? 'badge badge-green' : m.source === 'dom' ? 'badge badge-blue' : 'badge badge-amber'

  return (
    <>
      <tr className={`table-row ${expanded ? 'expanded' : ''}`} onClick={onToggle}>
        <td className="col-id">
          <span className="id-badge">#{idx}</span>
        </td>
        <td className="col-multiplier">
          <span className="multiplier-value" style={{ color: getMultiplierColor(m.multiplier) }}>
            {m.multiplier.toFixed(2)}x
          </span>
        </td>
        <td className="col-status">
          <span className={getBadgeClass(m.multiplier)}>
            {m.multiplier >= 10 ? '🚀 MOON' : m.multiplier >= 5 ? '⚡ HIGH' : m.multiplier >= 2 ? '✅ SAFE' : '⚠️ CRASH'}
          </span>
        </td>
        <td className="col-source">
          <span className={sourceBadge}>{sourceLabel}</span>
        </td>
        <td className="col-date">
          <div className="date-time">
            <span className="date">{format(new Date(m.timestamp), 'MMM dd, yyyy')}</span>
            <span className="time">{format(new Date(m.timestamp), 'HH:mm:ss')}</span>     
          </div>
        </td>
        <td className="col-fair">
          {hasSeedData ? (
            <span title="Seed data available">
              <Shield size={16} className="shield-icon verified" />
            </span>
          ) : (
            <span className="no-data">—</span>
          )}
        </td>
        <td className="col-expand">
          <div className="expand-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              className="btn-icon-delete" 
              onClick={onDelete} 
              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
            >
              <Trash size={14} />
            </button>
            {expanded ? <ChevronUp size={18} className="expand-icon" /> : <ChevronDown size={18} className="expand-icon" />}
          </div>
        </td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr className="expanded-row">
          <td colSpan={7}>
            <div className="expanded-content">
              <div className="expanded-header">
                <Shield size={16} />
                <span>Provably Fair Details</span>
              </div>

              {hasSeedData ? (
                <div className="seed-grid">
                  <SeedField label="Game Round ID" value={m.game_round_id} />
                  <SeedField label="Server Seed Hash" value={m.server_seed_hash} />
                  <SeedField label="Server Seed" value={m.server_seed} />
                  <SeedField label="SHA-512 Hash" value={m.sha512_hash} />
                  <SeedField label="Client Seed 1" value={m.client_seed_1} />
                  <SeedField label="Client Seed 2" value={m.client_seed_2} />
                  <SeedField label="Client Seed 3" value={m.client_seed_3} />
                  <SeedField label="Nonce" value={m.nonce != null ? String(m.nonce) : null} />
                </div>
              ) : (
                <div className="no-seed-data">
                  No provably fair data captured for this round (collected via DOM scraping).
                </div>
              )}

              {/* Verify button */}
              <div className="verify-section">
                <button
                  onClick={(e) => { e.stopPropagation(); onVerify() }}
                  disabled={!hasSeedData || isVerifying}
                  className={`verify-btn ${hasSeedData ? 'active' : 'disabled'}`}
                >
                  <Shield size={14} />
                  {isVerifying ? 'Verifying...' : 'Verify Round'}
                </button>

                {verifyResult && (
                  <VerifyBadge result={verifyResult} />
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function SeedField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="seed-field">
      <div className="seed-label">{label}</div>
      <div className="seed-value">
        {value || '—'}
      </div>
    </div>
  )
}

function VerifyBadge({ result }: { result: VerifyResult }) {
  if (result.verified === true) {
    return (
      <div className="verify-badge success">
        <ShieldCheck size={14} />
        <span>Verified ✓</span>
        {result.computed_multiplier != null && (
          <span className="computed-value">
            (computed: {result.computed_multiplier}x)
          </span>
        )}
      </div>
    )
  }
  if (result.verified === false) {
    return (
      <div className="verify-badge error">
        <ShieldAlert size={14} />
        <span>Mismatch</span>
        {result.computed_multiplier != null && (
          <span className="computed-value">
            (computed: {result.computed_multiplier}x, diff: {result.difference})
          </span>
        )}
      </div>
    )
  }
  return (
    <div className="verify-badge neutral">
      {result.message || 'Unable to verify.'}
    </div>
  )
}