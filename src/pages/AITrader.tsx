import { useState, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip
} from 'recharts'
import {
  Brain, Play, Square, Settings, TrendingUp, TrendingDown,
  Target, BarChart3, Clock, AlertTriangle,Activity, Eye, ChevronDown, ChevronUp,
  Trash2
} from 'lucide-react'
import {
  fetchAIStatus, startAI, stopAI, fetchAIHistory,
  fetchAIAnalysis, clearAIHistory, trainAI
} from '../api'
import type {
  SocketContext, AISessionStats, AIDecision,
} from '../types'
import './AITrader.css'

export default function AITrader() {
  const { socket } = useOutletContext<SocketContext>()
  const queryClient = useQueryClient()

  // --- State ---
  const [isRunning, setIsRunning] = useState(false)
  const [isDryRun, setIsDryRun] = useState(false)
  const [sessionStats, setSessionStats] = useState<AISessionStats | null>(null)
  const [latestDecision, setLatestDecision] = useState<AIDecision | null>(null)
  const [logFilter, setLogFilter] = useState<string>('')
  const [showConfig, setShowConfig] = useState(true)
  const [statusMsg, setStatusMsg] = useState('')

  // Training state
  const [isTraining, setIsTraining] = useState(false)
  const [trainingRounds, setTrainingRounds] = useState(1000)
  const [trainingResult, setTrainingResult] = useState<any>(null)

  // Config form state
  const [bankroll, setBankroll] = useState(100)
  const [riskLevel, setRiskLevel] = useState<'conservative' | 'moderate' | 'aggressive'>('conservative')
  const [maxBetPct, setMaxBetPct] = useState(5)
  const [maxBetAbs, setMaxBetAbs] = useState(50)
  const [stopLossPct, setStopLossPct] = useState(30)
  const [takeProfitPct, setTakeProfitPct] = useState(50)

  // --- Queries ---
  const { data: aiStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['aiStatus'],
    queryFn: fetchAIStatus,
    refetchInterval: 5000,
  })

  const { data: historyRes, refetch: refetchHistory } = useQuery({
    queryKey: ['aiHistory', logFilter],
    queryFn: () => fetchAIHistory({ per_page: 50, action: logFilter || undefined }),
    refetchInterval: 5000,
  })

  const { data: analysis } = useQuery({
    queryKey: ['aiAnalysis'],
    queryFn: fetchAIAnalysis,
    refetchInterval: 8000,
  })

  // Sync status
  useEffect(() => {
    if (aiStatus) {
      setIsRunning(aiStatus.is_running)
      if (aiStatus.session) {
        setSessionStats(aiStatus.session)
        if (aiStatus.is_running) {
          setIsDryRun(aiStatus.session.is_dry_run)
        }
      }
      if (aiStatus.is_training !== undefined) {
        setIsTraining(aiStatus.is_training)
      }
      if (aiStatus.last_training_result) {
        setTrainingResult(aiStatus.last_training_result)
      }
    }
  }, [aiStatus])

  // --- Socket listeners ---
  useEffect(() => {
    if (!socket) return

    const onDecision = (d: AIDecision) => setLatestDecision(d)
    const onResult = () => {
      refetchHistory()
      refetchStatus()
    }
    const onStatusUpdate = (s: AISessionStats) => {
      setSessionStats(s)
      setIsRunning(s.is_running)
      if (s.is_running) {
        setIsDryRun(s.is_dry_run)
      }
    }
    const onTrainingStarted = () => {
      setIsTraining(true)
      setStatusMsg('AI auto-optimization started in background...')
    }
    const onTrainingCompleted = (data: any) => {
      setIsTraining(false)
      setTrainingResult(data)
      setStatusMsg('AI auto-optimization completed successfully!')
      refetchStatus()
    }

    socket.on('ai_decision', onDecision)
    socket.on('ai_trade_result', onResult)
    socket.on('ai_status_update', onStatusUpdate)
    socket.on('ai_training_started', onTrainingStarted)
    socket.on('ai_training_completed', onTrainingCompleted)

    return () => {
      socket.off('ai_decision', onDecision)
      socket.off('ai_trade_result', onResult)
      socket.off('ai_status_update', onStatusUpdate)
      socket.off('ai_training_started', onTrainingStarted)
      socket.off('ai_training_completed', onTrainingCompleted)
    }
  }, [socket, refetchHistory, refetchStatus])

  // --- Handlers ---
  const handleStart = useCallback(async () => {
    try {
      setStatusMsg('Starting AI session...')
      await startAI({
        bankroll,
        risk_level: riskLevel,
        max_bet_pct: maxBetPct,
        max_bet_abs: maxBetAbs,
        stop_loss_pct: stopLossPct,
        take_profit_pct: takeProfitPct,
        dry_run: isDryRun,
      })
      setIsRunning(true)
      setStatusMsg(isDryRun ? 'AI running in dry-run mode' : 'AI LIVE trading started!')
      refetchStatus()
    } catch (e) {
      setStatusMsg('Failed to start AI')
    }
  }, [bankroll, riskLevel, maxBetPct, maxBetAbs, stopLossPct, takeProfitPct, isDryRun, refetchStatus])

  const handleStop = useCallback(async () => {
    try {
      await stopAI('user_stop')
      setIsRunning(false)
      setStatusMsg('AI session stopped')
      refetchStatus()
    } catch {
      setStatusMsg('Failed to stop AI')
    }
  }, [refetchStatus])

  const handleClearHistory = useCallback(async () => {
    if (!window.confirm('Clear all AI trade history?')) return
    try {
      await clearAIHistory()
      refetchHistory()
      setStatusMsg('AI history cleared')
    } catch {
      setStatusMsg('Failed to clear history')
    }
  }, [refetchHistory])

  const handleTrain = useCallback(async () => {
    try {
      setIsTraining(true)
      setStatusMsg('Starting AI self-training backtests...')
      const res = await trainAI({ rounds: trainingRounds })
      setTrainingResult(res)
      setStatusMsg(`AI training completed! Optimized defaults updated.`)
      refetchStatus()
    } catch (err: any) {
      setStatusMsg(`Training failed: ${err.message || err}`)
    } finally {
      setIsTraining(false)
    }
  }, [trainingRounds, refetchStatus])

  // --- Derived data ---
  const displayStats = sessionStats || {
    current_balance: 0,
    starting_balance: 0,
    total_profit_loss: 0,
    roi: 0,
    win_rate: 0,
    wins: 0,
    losses: 0,
    total_bets: 0,
    skips: 0,
    best_trade: 0,
    worst_trade: 0,
    current_streak: 0,
    longest_win_streak: 0,
    peak_balance: 0,
    lowest_balance: 0,
  }
  const history = historyRes?.history || []
  const equityCurve = (sessionStats?.equity_curve || []).map((val, i) => ({
    index: i,
    balance: val,
  }))

  const getConfidenceClass = (c: number) => {
    if (c >= 60) return 'high'
    if (c >= 40) return 'medium'
    return 'low'
  }

  const getPLColor = (val: number) => val >= 0 ? 'positive' : 'negative'

  return (
    <div className="ai-trader-container">
      {/* Header */}
      <div className="ai-header">
        <div className="ai-header-left">
          <div className="ai-header-icon">
            <Brain size={26} color="white" />
          </div>
          <div>
            <h1>AI Trader</h1>
            <p>Autonomous betting engine · KES</p>
          </div>
        </div>
        <div className={`ai-status-badge ${isRunning ? (isDryRun ? 'dry-run' : 'running') : 'stopped'}`}>
          <span className={`ai-status-dot ${isRunning ? (isDryRun ? 'dry' : 'active') : 'inactive'}`} />
          {isRunning ? (isDryRun ? 'DRY RUN' : 'LIVE TRADING') : 'OFFLINE'}
        </div>
      </div>

      {/* Dry-run banner */}
      {isRunning && isDryRun && (
        <div className="ai-dry-run-banner">
          <Eye size={18} />
          <span><strong>Simulation Mode</strong> — The AI is analysing and making decisions but not executing real bets. Switch to Live mode to trade with real money.</span>
        </div>
      )}

      {/* Control Panel */}
      <div className="ai-controls">
        {/* Config */}
        <div className="ai-config-card">
          <h3
            style={{ cursor: 'pointer' }}
            onClick={() => setShowConfig(!showConfig)}
          >
            <Settings size={16} color="#6366f1" />
            Configuration
            {showConfig ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </h3>
          {showConfig && (
            <>
              <div className="ai-config-grid">
                <div className="ai-config-field">
                  <label>Bankroll (KES)</label>
                  <input
                    type="number"
                    value={bankroll}
                    onChange={(e) => setBankroll(Number(e.target.value))}
                    disabled={isRunning}
                    min={10}
                  />
                </div>
                <div className="ai-config-field">
                  <label>Risk Level</label>
                  <select
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(e.target.value as any)}
                    disabled={isRunning}
                  >
                    <option value="conservative">Conservative</option>
                    <option value="moderate">Moderate</option>
                    <option value="aggressive">Aggressive</option>
                  </select>
                </div>
                <div className="ai-config-field">
                  <label>Max Bet %</label>
                  <input
                    type="number"
                    value={maxBetPct}
                    onChange={(e) => setMaxBetPct(Number(e.target.value))}
                    disabled={isRunning}
                    min={1}
                    max={25}
                  />
                </div>
                <div className="ai-config-field">
                  <label>Max Bet (KES)</label>
                  <input
                    type="number"
                    value={maxBetAbs}
                    onChange={(e) => setMaxBetAbs(Number(e.target.value))}
                    disabled={isRunning}
                    min={10}
                  />
                </div>
                <div className="ai-config-field">
                  <label>Stop Loss %</label>
                  <input
                    type="number"
                    value={stopLossPct}
                    onChange={(e) => setStopLossPct(Number(e.target.value))}
                    disabled={isRunning}
                    min={5}
                    max={100}
                  />
                </div>
                <div className="ai-config-field">
                  <label>Take Profit %</label>
                  <input
                    type="number"
                    value={takeProfitPct}
                    onChange={(e) => setTakeProfitPct(Number(e.target.value))}
                    disabled={isRunning}
                    min={10}
                    max={500}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '14px' }}>
                <label className="ai-toggle">
                  <input
                    type="checkbox"
                    checked={!isDryRun}
                    onChange={(e) => setIsDryRun(!e.target.checked)}
                    disabled={isRunning}
                  />
                  <span className="ai-toggle-slider" />
                </label>
                <span style={{ fontSize: '13px', fontWeight: 500, color: isDryRun ? '#64748b' : '#dc2626' }}>
                  {isDryRun ? 'Dry Run (Safe)' : '⚠️ LIVE MODE'}
                </span>
              </div>
            </>
          )}
          <div className="ai-actions-row">
            {isRunning ? (
              <button className="ai-btn ai-btn-stop" onClick={handleStop}>
                <Square size={14} fill="currentColor" />
                Stop AI
              </button>
            ) : (
              <button className="ai-btn ai-btn-start" onClick={handleStart}>
                <Play size={14} fill="currentColor" />
                Start AI
              </button>
            )}
            <button className="ai-btn ai-btn-outline" onClick={handleClearHistory}>
              <Trash2 size={14} />
              Clear Log
            </button>
          </div>
          {statusMsg && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#64748b' }}>
              {statusMsg}
            </div>
          )}
        </div>

        {/* AI Self-Training Panel */}
        <div className="ai-config-card ai-training-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Brain size={16} color="#8b5cf6" />
                Autonomous Self-Training
              </h3>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '20px',
                fontSize: '11px',
                fontWeight: 600,
                background: isTraining ? 'rgba(139, 92, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                color: isTraining ? '#8b5cf6' : '#16a34a',
                border: `1px solid ${isTraining ? 'rgba(139, 92, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`
              }}>
                <span className="ai-status-dot" style={{
                  width: '6px',
                  height: '6px',
                  background: isTraining ? '#8b5cf6' : '#22c55e',
                  boxShadow: `0 0 0 2px ${isTraining ? 'rgba(139, 92, 246, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`,
                  animation: 'aiPulse 2s infinite'
                }} />
                {isTraining ? 'OPTIMIZING' : 'AUTOMATIC'}
              </div>
            </div>
            
            <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 16px 0', lineHeight: '1.4' }}>
              The engine automatically triggers background self-training every 100 rounds to optimize Kelly bet sizes and heuristic decision weights.
            </p>

            {isTraining && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '24px 16px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.03), rgba(217, 70, 239, 0.03))',
                border: '1px dashed rgba(139, 92, 246, 0.2)',
                borderRadius: '12px',
                marginBottom: '16px'
              }}>
                <span className="spinner" style={{ borderTopColor: '#8b5cf6', width: '20px', height: '20px', borderWidth: '2px' }} />
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#6d28d9' }}>Running genetic optimization algorithms...</span>
              </div>
            )}

            {/* Training Results scorecard */}
            {trainingResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', opacity: isTraining ? 0.6 : 1, transition: 'opacity 0.3s' }}>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.04), rgba(217, 70, 239, 0.04))',
                  border: '1px dashed rgba(139, 92, 246, 0.15)',
                  borderRadius: '10px',
                  padding: '12px',
                  fontSize: '12px'
                }}>
                  <div style={{ fontWeight: 600, color: '#4c1d95', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                    <span>LATEST OPTIMIZATION</span>
                    <span style={{ color: '#059669', fontWeight: 700 }}>+{trainingResult.improvement_pct}% P/L Lift</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <span style={{ color: '#64748b' }}>Sample Size:</span> <strong style={{ color: '#1e293b' }}>{trainingResult.data_points} rounds</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Win Rate:</span> <strong style={{ color: '#1e293b' }}>{trainingResult.original_stats.win_rate}% → {trainingResult.optimized_stats.win_rate}%</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Simulated P/L:</span> <strong style={trainingResult.optimized_stats.profit_loss >= 0 ? { color: '#059669' } : { color: '#dc2626' }}>
                        {trainingResult.original_stats.profit_loss.toFixed(0)} → {trainingResult.optimized_stats.profit_loss.toFixed(0)} KES
                      </strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b' }}>Max Drawdown:</span> <strong style={{ color: '#9f1239' }}>{trainingResult.original_stats.drawdown.toFixed(0)} → {trainingResult.optimized_stats.drawdown.toFixed(0)} KES</strong>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '11px', color: '#64748b' }}>
                  <div style={{ fontWeight: 600, color: '#475569', marginBottom: '4px' }}>APPLIED PARAMETERS:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', background: '#f8fafc', padding: '8px', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                    <div>Kelly Fraction: <strong>{(trainingResult.optimized_config.kelly_fraction * 100).toFixed(0)}%</strong></div>
                    <div>Confidence Min: <strong>{trainingResult.optimized_config.confidence_threshold.toFixed(0)}%</strong></div>
                    <div>Analysis Window: <strong>{trainingResult.optimized_config.analysis_window}</strong></div>
                    <div>Loss Cooldown: <strong>{trainingResult.optimized_config.cooldown_after_loss}</strong></div>
                  </div>
                </div>
              </div>
            ) : (
              !isTraining && (
                <div className="ai-empty-state" style={{ padding: '16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '24px', marginBottom: '6px' }}>⚙️</div>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Heuristics Active</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Using baseline rules. Self-training runs automatically once data points accumulate.</div>
                </div>
              )
            )}
          </div>

          {/* Secondary manual optimization section */}
          <div style={{ marginTop: '16px', borderTop: '1px solid #f1f5f9', paddingTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, textTransform: 'uppercase' }}>Sample:</span>
                <select
                  value={trainingRounds}
                  onChange={(e) => setTrainingRounds(Number(e.target.value))}
                  disabled={isTraining || isRunning}
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    background: '#f8fafc',
                    color: '#475569',
                    outline: 'none',
                    fontWeight: 500
                  }}
                >
                  <option value={200}>200 Rounds</option>
                  <option value={500}>500 Rounds</option>
                  <option value={1000}>1000 Rounds</option>
                  <option value={2000}>2000 Rounds</option>
                </select>
              </div>
              
              <button
                onClick={handleTrain}
                disabled={isTraining || isRunning}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: isTraining || isRunning ? '#94a3b8' : '#8b5cf6',
                  background: 'none',
                  border: 'none',
                  cursor: isTraining || isRunning ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (!isTraining && !isRunning) {
                    e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.06)';
                  }
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Activity size={12} />
                Optimize Now
              </button>
            </div>
            {isRunning && (
              <div style={{ fontSize: '10px', color: '#ef4444', textAlign: 'center', marginTop: '6px', fontWeight: 500 }}>
                Manual tune unavailable while AI session is active.
              </div>
            )}
          </div>
        </div>

        {/* Live Decision */}
        <div className={`ai-decision-card ${latestDecision?.action || ''}`}>
          <div className="ai-decision-header">
            <span className="ai-chart-title">
              <Brain size={16} color="#6366f1" />
              Latest AI Decision
            </span>
            {latestDecision && (
              <span className={`ai-decision-action ${latestDecision.action}`}>
                {latestDecision.action === 'bet' && <Target size={14} />}
                {latestDecision.action === 'skip' && <Clock size={14} />}
                {latestDecision.action === 'stop_session' && <AlertTriangle size={14} />}
                {latestDecision.action.toUpperCase().replace('_', ' ')}
              </span>
            )}
          </div>

          {latestDecision ? (
            <>
              <div className="ai-decision-body">
                {latestDecision.action === 'bet' && (
                  <>
                    <div className="ai-decision-metric">
                      <div className="label">Stake</div>
                      <div className="value purple">{latestDecision.stake.toFixed(0)} KES</div>
                    </div>
                    <div className="ai-decision-metric">
                      <div className="label">Target</div>
                      <div className="value green">{latestDecision.target_multiplier}x</div>
                    </div>
                  </>
                )}
                <div className="ai-decision-metric">
                  <div className="label">Confidence</div>
                  <div className={`value ${getConfidenceClass(latestDecision.confidence) === 'high' ? 'green' : getConfidenceClass(latestDecision.confidence) === 'medium' ? 'amber' : 'red'}`}>
                    {latestDecision.confidence.toFixed(0)}%
                  </div>
                  <div className="ai-confidence-bar">
                    <div
                      className={`ai-confidence-fill ${getConfidenceClass(latestDecision.confidence)}`}
                      style={{ width: `${latestDecision.confidence}%` }}
                    />
                  </div>
                </div>
                <div className="ai-decision-metric">
                  <div className="label">Risk</div>
                  <div className="ai-risk-indicator" style={{ justifyContent: 'center', marginTop: '6px' }}>
                    <span className={`ai-risk-dot ${latestDecision.risk_level}`} />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569', textTransform: 'capitalize' }}>
                      {latestDecision.risk_level}
                    </span>
                  </div>
                </div>
              </div>
              <div className="ai-decision-reasoning">
                💡 {latestDecision.reasoning}
              </div>
            </>
          ) : (
            <div className="ai-empty-state" style={{ padding: '32px 16px' }}>
              <div className="icon">🤖</div>
              <div className="title">Waiting for data</div>
              <div className="subtitle">Start the AI to see decisions here</div>
            </div>
          )}
        </div>
      </div>

      {/* Session Stats Cards */}
      <div className="ai-stats-grid">
        <div className="ai-stat-card">
          <div className="ai-stat-label">Balance</div>
          <div className={`ai-stat-value ${getPLColor(displayStats.total_profit_loss)}`}>
            {displayStats.current_balance.toFixed(0)} KES
          </div>
          <div className="ai-stat-sub">Started: {displayStats.starting_balance.toFixed(0)}</div>
        </div>
        <div className="ai-stat-card">
          <div className="ai-stat-label">Profit / Loss</div>
          <div className={`ai-stat-value ${getPLColor(displayStats.total_profit_loss)}`}>
            {displayStats.total_profit_loss >= 0 ? '+' : ''}{displayStats.total_profit_loss.toFixed(0)} KES
          </div>
          <div className="ai-stat-sub">ROI: {displayStats.roi}%</div>
        </div>
        <div className="ai-stat-card">
          <div className="ai-stat-label">Wins</div>
          <div className="ai-stat-value positive">
            {displayStats.wins}
          </div>
          <div className="ai-stat-sub">Winning trades</div>
        </div>
        <div className="ai-stat-card">
          <div className="ai-stat-label">Losses</div>
          <div className="ai-stat-value negative">
            {displayStats.losses}
          </div>
          <div className="ai-stat-sub">Losing trades</div>
        </div>
        <div className="ai-stat-card">
          <div className="ai-stat-label">Win Rate</div>
          <div className="ai-stat-value">{displayStats.win_rate}%</div>
          <div className="ai-stat-sub">{displayStats.wins}W / {displayStats.losses}L</div>
        </div>
        <div className="ai-stat-card">
          <div className="ai-stat-label">Total Trades</div>
          <div className="ai-stat-value">{displayStats.total_bets}</div>
          <div className="ai-stat-sub">{displayStats.skips} skipped</div>
        </div>
        <div className="ai-stat-card">
          <div className="ai-stat-label">Best Trade</div>
          <div className="ai-stat-value positive">
            +{displayStats.best_trade.toFixed(0)} KES
          </div>
        </div>
        <div className="ai-stat-card">
          <div className="ai-stat-label">Worst Trade</div>
          <div className="ai-stat-value negative">
            {displayStats.worst_trade.toFixed(0)} KES
          </div>
        </div>
        <div className="ai-stat-card">
          <div className="ai-stat-label">Streak</div>
          <div className={`ai-stat-value ${displayStats.current_streak >= 0 ? 'positive' : 'negative'}`}>
            {displayStats.current_streak >= 0 ? `+${displayStats.current_streak}` : displayStats.current_streak}
          </div>
          <div className="ai-stat-sub">Best: {displayStats.longest_win_streak}W</div>
        </div>
        <div className="ai-stat-card">
          <div className="ai-stat-label">Peak / Low</div>
          <div className="ai-stat-value">{displayStats.peak_balance.toFixed(0)}</div>
          <div className="ai-stat-sub">Low: {displayStats.lowest_balance.toFixed(0)}</div>
        </div>
      </div>

      {/* Charts Row: Equity Curve + Analysis */}
      <div className="ai-charts-row">
        {/* Equity Curve */}
        <div className="ai-chart-card">
          <div className="ai-chart-title">
            <Activity size={16} color="#6366f1" />
            Equity Curve
          </div>
          {equityCurve.length > 1 ? (
            <div style={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityCurve}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="index" hide />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '10px',
                      padding: '8px 14px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      fontSize: '13px',
                    }}
                    formatter={(value: number) => [`${value.toFixed(2)} KES`, 'Balance']}
                    labelFormatter={() => ''}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="#6366f1"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#eqGrad)"
                    activeDot={{ r: 5, fill: 'white', stroke: '#6366f1', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="ai-empty-state" style={{ padding: '48px 16px' }}>
              <div className="icon">📈</div>
              <div className="title">No trades yet</div>
              <div className="subtitle">Equity curve will appear as the AI trades</div>
            </div>
          )}
        </div>

        {/* Market Analysis */}
        <div className="ai-chart-card">
          <div className="ai-chart-title">
            <BarChart3 size={16} color="#8b5cf6" />
            Market Analysis
          </div>
          {analysis && !('error' in analysis) ? (
            <div>
              {/* Mean Reversion Signal */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500, marginBottom: '6px' }}>SIGNAL</div>
                <div className={`ai-signal-badge ${analysis.mean_reversion.signal}`}>
                  {analysis.mean_reversion.signal === 'oversold' && <TrendingUp size={14} />}
                  {analysis.mean_reversion.signal === 'overbought' && <TrendingDown size={14} />}
                  {analysis.mean_reversion.signal === 'neutral' && <Activity size={14} />}
                  {analysis.mean_reversion.signal.toUpperCase()} ({analysis.mean_reversion.strength.toFixed(0)}%)
                </div>
              </div>

              {/* Key Probabilities */}
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500, marginBottom: '8px' }}>
                WIN PROBABILITIES
              </div>
              {['1.3x', '1.5x', '1.8x', '2.0x', '3.0x'].map((key) => {
                const prob = (analysis.probabilities[key] || 0) * 100
                return (
                  <div key={key} className="ai-prob-row">
                    <span className="ai-prob-label">≥{key}</span>
                    <div className="ai-prob-bar-track">
                      <div className="ai-prob-bar-fill" style={{ width: `${prob}%` }} />
                    </div>
                    <span className="ai-prob-pct">{prob.toFixed(0)}%</span>
                  </div>
                )
              })}

              {/* Quick Stats */}
              <div className="ai-analysis-grid" style={{ marginTop: '16px' }}>
                <div className="ai-analysis-item">
                  <div className="label">Mean</div>
                  <div className="value">{analysis.mean.toFixed(2)}x</div>
                </div>
                <div className="ai-analysis-item">
                  <div className="label">Volatility</div>
                  <div className="value">{analysis.volatility_10.toFixed(2)}</div>
                </div>
                <div className="ai-analysis-item">
                  <div className="label">Streak</div>
                  <div className="value" style={{ color: analysis.streaks.current_type === 'high' ? '#059669' : '#dc2626' }}>
                    {analysis.streaks.current_length} {analysis.streaks.current_type}
                  </div>
                </div>
                <div className="ai-analysis-item">
                  <div className="label">Samples</div>
                  <div className="value">{analysis.data_points}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="ai-empty-state" style={{ padding: '32px 16px' }}>
              <div className="icon">📊</div>
              <div className="title">Collecting data</div>
              <div className="subtitle">Need more rounds for analysis</div>
            </div>
          )}
        </div>
      </div>

      {/* Trade Log */}
      <div className="ai-log-card">
        <div className="ai-log-header">
          <div className="ai-log-title">
            <Clock size={16} color="#64748b" />
            AI Trade Log
            <span style={{
              fontSize: '12px',
              fontWeight: 500,
              color: '#94a3b8',
              background: '#f1f5f9',
              padding: '2px 10px',
              borderRadius: '20px',
            }}>
              {historyRes?.total || 0} entries
            </span>
          </div>
          <div className="ai-filter-tabs">
            {['', 'bet', 'skip'].map((f) => (
              <button
                key={f}
                className={`ai-filter-tab ${logFilter === f ? 'active' : ''}`}
                onClick={() => setLogFilter(f)}
              >
                {f === '' ? 'All' : f === 'bet' ? 'Bets' : 'Skips'}
              </button>
            ))}
          </div>
        </div>

        {history.length === 0 ? (
          <div className="ai-empty-state">
            <div className="icon">📋</div>
            <div className="title">No trades recorded</div>
            <div className="subtitle">Start the AI to see trade history</div>
          </div>
        ) : (
          <div className="ai-log-scroll" style={{ overflowX: 'auto' }}>
            <table className="ai-log-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Action</th>
                  <th>Stake</th>
                  <th>Target</th>
                  <th>Actual</th>
                  <th>P/L</th>
                  <th>Balance</th>
                  <th>Confidence</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className={entry.outcome === 'win' ? 'win' : entry.outcome === 'loss' ? 'loss' : ''}>
                    <td style={{ whiteSpace: 'nowrap', color: '#94a3b8', fontSize: '12px' }}>
                      {entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString() : '-'}
                    </td>
                    <td>
                      <span className={`ai-outcome-badge ${entry.action === 'bet' ? (entry.outcome === 'win' ? 'win' : 'loss') : entry.action === 'skip' ? 'skipped' : 'stopped'}`}>
                        {entry.action.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {entry.stake ? `${entry.stake.toFixed(0)}` : '-'}
                    </td>
                    <td style={{ color: '#7c3aed', fontWeight: 600 }}>
                      {entry.target_multiplier ? `${entry.target_multiplier}x` : '-'}
                    </td>
                    <td style={{
                      fontWeight: 600,
                      color: entry.actual_multiplier && entry.target_multiplier
                        ? (entry.actual_multiplier >= entry.target_multiplier ? '#059669' : '#dc2626')
                        : '#94a3b8'
                    }}>
                      {entry.actual_multiplier ? `${entry.actual_multiplier.toFixed(2)}x` : '-'}
                    </td>
                    <td style={{
                      fontWeight: 700,
                      color: entry.profit_loss !== null
                        ? (entry.profit_loss >= 0 ? '#059669' : '#dc2626')
                        : '#94a3b8'
                    }}>
                      {entry.profit_loss !== null ? `${entry.profit_loss >= 0 ? '+' : ''}${entry.profit_loss.toFixed(0)}` : '-'}
                    </td>
                    <td style={{ fontWeight: 500 }}>
                      {entry.balance_after ? `${entry.balance_after.toFixed(0)}` : '-'}
                    </td>
                    <td>
                      {entry.confidence !== null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div className="ai-confidence-bar" style={{ width: '50px' }}>
                            <div
                              className={`ai-confidence-fill ${getConfidenceClass(entry.confidence)}`}
                              style={{ width: `${entry.confidence}%` }}
                            />
                          </div>
                          <span style={{ fontSize: '12px', color: '#64748b' }}>{entry.confidence.toFixed(0)}%</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td>
                      <span className={`ai-outcome-badge ${entry.outcome || 'skipped'}`}>
                        {(entry.outcome || 'skip').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
