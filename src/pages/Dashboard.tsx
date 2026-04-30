import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format } from 'date-fns'
import { TrendingUp, Hash, Trophy, AlertTriangle } from 'lucide-react'
import { fetchStats, fetchMultipliers } from '../api'
import type { SocketContext, Stats } from '../types'

export default function Dashboard() {
  const { socket } = useOutletContext<SocketContext>()
  const queryClient = useQueryClient()

  const { data: stats } = useQuery<Stats>({
    queryKey: ['stats'],
    queryFn: fetchStats,
    refetchInterval: 5000,
  })

  const { data: multipliersRes } = useQuery({
    queryKey: ['recentMultipliers'],
    queryFn: () => fetchMultipliers({ per_page: 50 }),
    refetchInterval: 5000,
  })

  // Listen for real-time updates
  useEffect(() => {
    if (!socket) return
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['recentMultipliers'] })
    }
    socket.on('new_multiplier', handler)
    return () => { socket.off('new_multiplier', handler) }
  }, [socket, queryClient])

  const chartData = (multipliersRes?.multipliers || [])
    .slice()
    .reverse()
    .map((m) => ({
      multiplier: m.multiplier,
      timestamp: new Date(m.timestamp).getTime(),
    }))

  const recentList = multipliersRes?.multipliers || []

  const getMultiplierColor = (val: number) => {
    if (val >= 10) return 'var(--accent-purple)'
    if (val >= 5) return 'var(--accent-amber)'
    if (val >= 2) return 'var(--accent-green)'
    return 'var(--accent-red)'
  }

  const getBadgeClass = (val: number) => {
    if (val >= 10) return 'badge badge-purple'
    if (val >= 5) return 'badge badge-amber'
    if (val >= 2) return 'badge badge-green'
    return 'badge badge-red'
  }

  return (
    <div className="page-container fade-in">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Real-time overview of SpotPesa Aviator multiplier data</p>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid">
        <div className="stat-card blue">
          <div>
            <div className="stat-label">Total Rounds</div>
            <div className="stat-value" style={{ color: 'var(--text-primary)' }}>
              {stats?.total_rounds?.toLocaleString() || '0'}
            </div>
          </div>
          <div className="stat-icon blue">
            <Hash size={22} />
          </div>
        </div>

        <div className="stat-card green">
          <div>
            <div className="stat-label">Avg Multiplier</div>
            <div className="stat-value text-green">
              {stats?.avg_multiplier?.toFixed(2) || '0.00'}x
            </div>
          </div>
          <div className="stat-icon green">
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="stat-card purple">
          <div>
            <div className="stat-label">Highest</div>
            <div className="stat-value text-purple">
              {stats?.max_multiplier?.toFixed(2) || '0.00'}x
            </div>
          </div>
          <div className="stat-icon purple">
            <Trophy size={22} />
          </div>
        </div>

        <div className="stat-card red">
          <div>
            <div className="stat-label">Crash Rate (&lt;2x)</div>
            <div className="stat-value text-red">
              {stats?.low_multiplier_prob ?? '0'}%
            </div>
          </div>
          <div className="stat-icon red">
            <AlertTriangle size={22} />
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="charts-grid">
        {/* Multiplier Trend Chart */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Multiplier Trend</span>
            <span className="badge badge-blue">{chartData.length} pts</span>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(t) => format(new Date(t), 'HH:mm')}
                  stroke="var(--text-muted)"
                  fontSize={11}
                />
                <YAxis stroke="var(--text-muted)" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                  }}
                  labelFormatter={(t) => format(new Date(t), 'MMM dd, HH:mm')}
                  formatter={(value: number) => [`${value}x`, 'Multiplier']}
                />
                <Line
                  type="monotone"
                  dataKey="multiplier"
                  stroke="var(--accent-blue)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, fill: 'var(--accent-blue-light)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Rounds */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Rounds</span>
            <span className="badge badge-blue">Live</span>
          </div>
          {recentList.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <div className="empty-state-text">No data yet</div>
              <div className="empty-state-sub">Start collecting multiplier data</div>
            </div>
          ) : (
            <div className="round-list">
              {recentList.slice(0, 20).map((round) => (
                <div key={round.id} className="round-item">
                  <span
                    className="round-multiplier"
                    style={{ color: getMultiplierColor(round.multiplier) }}
                  >
                    {round.multiplier.toFixed(2)}x
                  </span>
                  <span className={getBadgeClass(round.multiplier)}>
                    {round.multiplier >= 2 ? 'SAFE' : 'CRASH'}
                  </span>
                  <span className="round-time">
                    {format(new Date(round.timestamp), 'HH:mm:ss')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}