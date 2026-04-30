import React, { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  AreaChart, Area
} from 'recharts'
import { 
  Activity, TrendingUp, Target, Clock, Zap, Shield, 
  BarChart3, PieChart as PieChartIcon, Layers, PlayCircle,
  AlertTriangle, RefreshCcw, Brain, Calculator, TrendingDown,
  Lock, Hash, CheckCircle2, XCircle, Cpu, Key
} from 'lucide-react'
import { useAnalytics } from '../hooks/useAnalytics'
import { simulateStrategy } from '../api'
import type { SimulationResult } from '../types'
import './Analytics.css'

const COLORS = ['#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981']

export default function Analytics() {
  const { stats, distribution, probabilities, volatility, patterns, prediction, cryptoAnalysis, isLoading } = useAnalytics()

  
  const [simConfig, setSimConfig] = useState({
    strategy: 'fixed',
    balance: 100,
    bet_size: 1,
    target: 2.0
  })
  const [simResult, setSimResult] = useState<SimulationResult | null>(null)
  const [isSimulating, setIsSimulating] = useState(false)

  const handleSimulate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSimulating(true)
    try {
      const res = await simulateStrategy(simConfig)
      setSimResult(res)
    } catch (err) {
      console.error('Simulation failed', err)
    } finally {
      setIsSimulating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="analytics-loading">
        <div className="loading-spinner">
          <RefreshCcw className="spinning" size={48} />
        </div>
        <p>Analyzing thousands of rounds...</p>
        <span className="loading-sub">Computing statistical models</span>
      </div>
    )
  }

  return (
    <div className="analytics-container">
      <header className="analytics-header">
        <div className="header-content">
          <h1>
            <Brain size={28} className="header-icon" />
            Predictive Analytics
          </h1>
          <p>Real-time statistical modeling and strategy validation</p>
        </div>
        <div className="live-ticker">
          <div className="ticker-label">
            <Zap size={12} />
            LIVE TICKER
          </div>
          <div className={`ticker-value ${stats.data?.last_multiplier && stats.data.last_multiplier >= 2 ? 'up' : 'down'}`}>
            {stats.data?.last_multiplier?.toFixed(2) || '1.00'}x
          </div>
        </div>
      </header>

      {/* Top 3 Cards Row */}
      <section className="top-stats-row">
        <div className="card summary-card">
          <div className="card-header">
            <div className="title">
              <Layers size={18} />
              <h3>Range Frequencies</h3>
            </div>
          </div>
          <div className="summary-list">
            {distribution.data?.map((d, i) => (
              <div key={i} className="summary-item">
                <span className="range-label">{d.range}</span>
                <span className="count-value">= {d.count} times</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card summary-card">
          <div className="card-header">
            <div className="title">
              <Calculator size={18} />
              <h3>Event Probabilities</h3>
            </div>
          </div>
          <div className="summary-list">
            {distribution.data?.map((d, i) => (
              <div key={i} className="summary-item">
                <span className="range-label">Probability of {d.range}</span>
                <span className="prob-value">= {(d.percentage / 100).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card summary-card">
          <div className="card-header">
            <div className="title">
              <Activity size={18} />
              <h3>Multiplier Stats</h3>
            </div>
          </div>
          <div className="summary-list stats-list">
            <div className="summary-item">
              <span className="stat-label">Highest Multiplier</span>
              <span className="stat-value highlight">{stats.data?.max_multiplier?.toFixed(2) || '0.00'}x</span>
            </div>
            <div className="summary-item">
              <span className="stat-label">Lowest Multiplier</span>
              <span className="stat-value">{stats.data?.min_multiplier?.toFixed(2) || '1.00'}x</span>
            </div>
            <div className="summary-item">
              <span className="stat-label">Most Frequent</span>
              <span className="stat-value highlight">{stats.data?.most_frequent_multiplier?.toFixed(2) || '1.00'}x</span>
            </div>
          </div>
        </div>
      </section>

      {/* Graphs Section */}
      <section className="graphs-row">
        <div className="card chart-card">
          <div className="card-header">
            <div className="title">
              <BarChart3 size={18} />
              <h3>Frequency Distribution (Bar)</h3>
            </div>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distribution.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(56, 189, 248, 0.1)" vertical={false} />
                <XAxis dataKey="range" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(10, 14, 39, 0.95)', 
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '8px',
                    backdropFilter: 'blur(10px)'
                  }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {distribution.data?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card chart-card">
          <div className="card-header">
            <div className="title">
              <TrendingUp size={18} />
              <h3>Frequency Trends (Line)</h3>
            </div>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={distribution.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(56, 189, 248, 0.1)" vertical={false} />
                <XAxis dataKey="range" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(10, 14, 39, 0.95)', 
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#38bdf8" 
                  strokeWidth={3} 
                  dot={{ fill: '#38bdf8', r: 6 }} 
                  activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Automatic Predictor Section */}
      <section className="predictor-section">
        <div className="card predictor-card">
          <div className="card-header">
            <div className="title">
              <Zap size={18} className="text-amber-400" />
              <h3>Automatic Predictor</h3>
            </div>
            <div className="prediction-badge">
              {prediction.data?.method === 'provably_fair_hash_projection'
                ? '⛓ SHA-512 CRYPTO MODE'
                : 'LIVE AI MODEL'}
            </div>
          </div>
          <div className="predictor-content">
            {/* Main prediction display */}
            <div className="prediction-display">
              <div className="prediction-main">
                <span className="label">Next Predicted Multiplier</span>
                <span className="value">{prediction.data?.prediction?.toFixed(2) || '1.00'}x</span>
                <div className="prediction-sub-stats">
                  <span className="sub-stat">
                    <Activity size={12} />
                    Avg: {prediction.data?.avg_all?.toFixed(2) || '—'}x
                  </span>
                  <span className="sub-stat">
                    <TrendingUp size={12} />
                    Recent 5: {prediction.data?.avg_recent_5?.toFixed(2) || '—'}x
                  </span>
                  <span className="sub-stat">
                    <Hash size={12} />
                    {prediction.data?.seeded_rounds ?? 0} verified rounds
                  </span>
                </div>
              </div>
              <div className="prediction-meta">
                <div className="confidence-meter">
                  <div className="meter-label">
                    <span>Confidence Score</span>
                    <span>{prediction.data?.confidence || 0}%</span>
                  </div>
                  <div className="meter-bar">
                    <div className="meter-fill" style={{ width: `${prediction.data?.confidence || 0}%` }}></div>
                  </div>
                </div>
                <p className="prediction-reason">
                  <Target size={14} />
                  {prediction.data?.reason || 'Collecting data for next prediction...'}
                </p>

                {/* Method & Data Points badges */}
                <div className="method-badges">
                  <span className="method-badge crypto">
                    <Cpu size={11} />
                    {prediction.data?.method === 'provably_fair_hash_projection'
                      ? 'SHA-512 Hash Projection'
                      : 'Statistical Model'}
                  </span>
                  <span className="method-badge data">
                    <Hash size={11} />
                    {prediction.data?.data_points ?? 0} data points
                  </span>
                </div>
              </div>
            </div>

            {/* Next Committed Server-Seed Hash */}
            {prediction.data?.next_server_hash && (
              <div className="server-hash-panel">
                <div className="hash-panel-header">
                  <Lock size={14} />
                  <span>Next Round — Committed Server-Seed Hash</span>
                  <span className="hash-tooltip">committed before round starts · cannot be changed</span>
                </div>
                <code className="hash-value">{prediction.data.next_server_hash}</code>
                <p className="hash-note">
                  <Key size={12} />
                  The server seed will be revealed after the round ends, allowing independent SHA-512 verification.
                </p>
              </div>
            )}

            {/* SHA-512 Hash Chain Verification Table */}
            {cryptoAnalysis.data && cryptoAnalysis.data.total > 0 && (
              <div className="hash-chain-panel">
                <div className="hash-chain-header">
                  <div className="hc-title">
                    <Hash size={15} />
                    <span>SHA-512 Hash Chain · Last {cryptoAnalysis.data.total} Rounds</span>
                  </div>
                  <div className="hc-stats">
                    <span className="hc-stat verified">
                      <CheckCircle2 size={12} />
                      {cryptoAnalysis.data.verified_count} verified
                    </span>
                    <span className="hc-stat pending">
                      <XCircle size={12} />
                      {cryptoAnalysis.data.unverified_count} pending seeds
                    </span>
                    <span className="hc-stat rate">
                      {cryptoAnalysis.data.verification_rate}% rate
                    </span>
                  </div>
                </div>
                <div className="hash-chain-table">
                  <div className="hct-head">
                    <span>Round</span>
                    <span>Multiplier</span>
                    <span>SHA-512 (truncated)</span>
                    <span>Computed</span>
                    <span>Status</span>
                  </div>
                  {cryptoAnalysis.data.chain.slice(0, 8).map(entry => (
                    <div key={entry.id} className={`hct-row ${entry.verified ? 'hct-ok' : 'hct-pending'}`}>
                      <span className="hct-round">#{entry.game_round_id?.slice(-6) || entry.id}</span>
                      <span className="hct-mult">{entry.multiplier.toFixed(2)}x</span>
                      <code className="hct-hash">
                        {entry.computed_hash || entry.server_seed_hash?.slice(0, 32) + '…' || '—'}
                      </code>
                      <span className="hct-computed">
                        {entry.computed_multiplier != null ? `${entry.computed_multiplier.toFixed(2)}x` : '—'}
                      </span>
                      <span className={`hct-status ${entry.verified ? 'ok' : 'pending'}`}>
                        {entry.verified
                          ? <><CheckCircle2 size={12} /> Verified</>
                          : <><XCircle size={12} /> No seed</>}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="predictor-info">
              <AlertTriangle size={20} className="text-amber-500" />
              <p>
                SHA-512 is a one-way cryptographic hash — it <strong>cannot be reversed or decrypted</strong>.
                The prediction uses the provably-fair formula on <em>historically revealed</em> server seeds
                to project statistical patterns onto the next round.
                Always bet responsibly.
              </p>
            </div>
          </div>
        </div>
      </section>


      <div className="main-grid">
        {/* Historical Trends */}
        <div className="card trends-card col-span-3">
          <div className="card-header">
            <div className="title">
              <Clock size={18} />
              <h3>Multiplier History</h3>
            </div>
            <span className="badge">Last 50 Rounds</span>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.data?.recent_multipliers?.map((m, i) => ({ 
                round: i, 
                val: m 
              })) || []}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(56, 189, 248, 0.1)" vertical={false} />
                <XAxis dataKey="round" stroke="#94a3b8" fontSize={10} hide />
                <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `${v}x`} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(10, 14, 39, 0.95)', 
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    borderRadius: '8px',
                    backdropFilter: 'blur(10px)'
                  }}
                  formatter={(v: number) => [`${v.toFixed(2)}x`, 'Multiplier']}
                />
                <Area type="monotone" dataKey="val" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorVal)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Volatility & Pattern Sidebar */}
        <div className="side-column">
          <div className="card volatility-card">
            <div className="card-header">
              <div className="title">
                <Activity size={18} />
                <h3>Volatility Analysis</h3>
              </div>
            </div>
            <div className="vol-stats">
              <div className="vol-item">
                <span className="vol-label">Variance</span>
                <span className="vol-value">{volatility.data?.variance || '0.00'}</span>
              </div>
              <div className="vol-item">
                <span className="vol-label">Std Deviation</span>
                <span className="vol-value">{volatility.data?.std_dev || '0.00'}</span>
              </div>
            </div>
            <div className={`vol-indicator ${volatility.data?.indicator?.toLowerCase() || 'stable'}`}>
              <Activity size={14} />
              <span>{volatility.data?.indicator || 'Analyzing'} Volatility</span>
            </div>
          </div>
        </div>

        {/* Pattern Analysis */}
        <div className="card pattern-card">
          <div className="card-header">
            <div className="title">
              <TrendingUp size={18} />
              <h3>Sequence & Streak Analysis</h3>
            </div>
            <span className="badge">Pattern Recognition</span>
          </div>
          <div className="streak-timeline">
            {patterns.data?.streaks?.slice(-30).map((s, i) => (
              <div 
                key={i} 
                className={`streak-block ${s.type === 'high' ? 'high' : 'low'}`} 
                style={{ height: `${Math.min(s.length * 8, 60)}px` }}
                title={`${s.length} rounds`}
              >
                {s.length > 3 && <span className="streak-number">{s.length}</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Strategy Simulation Engine */}
        <div className="card simulation-card">
          <div className="card-header">
            <div className="title">
              <PlayCircle size={18} />
              <h3>Strategy Simulation Engine</h3>
            </div>
            <span className="badge premium">BACKTESTING</span>
          </div>
          
          <div className="simulation-layout">
            <form className="simulation-form" onSubmit={handleSimulate}>
              <div className="form-group">
                <label>Betting Strategy</label>
                <select 
                  value={simConfig.strategy} 
                  onChange={e => setSimConfig({...simConfig, strategy: e.target.value})}
                  className="form-select"
                >
                  <option value="fixed">Fixed Cashout</option>
                  <option value="martingale">Martingale (x2 on Loss)</option>
                </select>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Balance ($)</label>
                  <input 
                    type="number" 
                    value={simConfig.balance} 
                    onChange={e => setSimConfig({...simConfig, balance: Number(e.target.value)})} 
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Base Bet ($)</label>
                  <input 
                    type="number" 
                    value={simConfig.bet_size} 
                    onChange={e => setSimConfig({...simConfig, bet_size: Number(e.target.value)})} 
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Target Multiplier</label>
                  <input 
                    type="number" 
                    step="0.1"
                    value={simConfig.target} 
                    onChange={e => setSimConfig({...simConfig, target: Number(e.target.value)})} 
                    className="form-input"
                  />
                </div>
              </div>
              <button className="simulate-btn" type="submit" disabled={isSimulating}>
                {isSimulating ? (
                  <>
                    <RefreshCcw className="spinning" size={16} />
                    Processing...
                  </>
                ) : (
                  <>
                    <PlayCircle size={16} />
                    Run Simulation
                  </>
                )}
              </button>
            </form>

            {simResult && (
              <div className="simulation-results">
                <div className="results-header">
                  <span className="results-title">Simulation Results</span>
                </div>
                <div className="results-grid">
                  <div className="result-card">
                    <span className="result-label">Net Profit/Loss</span>
                    <span className={`result-value ${simResult.profit_loss >= 0 ? 'positive' : 'negative'}`}>
                      ${simResult.profit_loss.toFixed(2)}
                    </span>
                  </div>
                  <div className="result-card">
                    <span className="result-label">Win Rate</span>
                    <span className="result-value">{simResult.win_rate}%</span>
                  </div>
                  <div className="result-card">
                    <span className="result-label">Max Drawdown</span>
                    <span className="result-value negative">${simResult.max_drawdown.toFixed(2)}</span>
                  </div>
                  <div className="result-card">
                    <span className="result-label">Bankroll Status</span>
                    <span className={`result-value ${simResult.is_ruined ? 'negative' : 'positive'}`}>
                      {simResult.is_ruined ? 'BANKRUPT' : 'ACTIVE'}
                    </span>
                  </div>
                </div>
                <div className="equity-chart">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={simResult.equity_curve?.map((val, idx) => ({ round: idx, balance: val }))}>
                      <defs>
                        <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(56, 189, 248, 0.1)" />
                      <XAxis dataKey="round" stroke="#94a3b8" fontSize={10} />
                      <YAxis stroke="#94a3b8" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(10, 14, 39, 0.95)', 
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          borderRadius: '8px'
                        }}
                      />
                      <Area type="monotone" dataKey="balance" stroke="#3b82f6" fillOpacity={1} fill="url(#colorBalance)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, icon, color, trend }: { 
  label: string, 
  value: string | number, 
  icon: React.ReactNode, 
  color: string,
  trend?: string 
}) {
  return (
    <div className={`metric-card ${color}`}>
      <div className="metric-content">
        <span className="metric-label">{label}</span>
        <span className="metric-value">{value}</span>
        {trend && (
          <div className="metric-trend">
            <TrendingUp size={12} />
            <span>{trend}</span>
          </div>
        )}
      </div>
      <div className={`metric-icon ${color}`}>
        {icon}
      </div>
    </div>
  )
}