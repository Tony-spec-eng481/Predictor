import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useOutletContext } from 'react-router-dom'
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart, PieChart, Pie, Cell
} from 'recharts'
import { format } from 'date-fns'
import { TrendingUp, Hash, Trophy, AlertTriangle, ShieldCheck, Zap, Clock, Activity } from 'lucide-react'
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

  // Prepare pie chart data
  const safeCount = recentList.filter(m => m.multiplier >= 2).length
  const crashCount = recentList.filter(m => m.multiplier < 2).length
  const pieData = [
    { name: 'Safe (≥2x)', value: safeCount, color: '#2e7d32' },
    { name: 'Crash (<2x)', value: crashCount, color: '#d32f2f' },
  ]

  const getMultiplierColor = (val: number) => {
    if (val >= 10) return '#7c3aed'
    if (val >= 5) return '#d97706'
    if (val >= 2) return '#2e7d32'
    return '#d32f2f'
  }

  const getBadgeClass = (val: number) => {
    if (val >= 10) return 'badge-purple'
    if (val >= 5) return 'badge-amber'
    if (val >= 2) return 'badge-green'
    return 'badge-red'
  }

  const latestMultiplier = recentList[0]?.multiplier || 0

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      minHeight: '100%',
      padding: '24px',
      borderRadius: '16px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Header with live indicator */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '28px',
        padding: '20px 24px',
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            backgroundColor: '#0056a3',
            padding: '12px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShieldCheck size={28} color="white" />
          </div>
          <div>
            <h1 style={{
              color: '#0056a3',
              fontSize: '24px',
              fontWeight: 700,
              margin: 0,
              letterSpacing: '-0.5px'
            }}>
              SportPesa Road Worx
            </h1>
            <p style={{
              color: '#64748b',
              fontSize: '14px',
              margin: '4px 0 0 0'
            }}>
              Live multiplier analytics engine
            </p>
          </div>
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          background: '#f1f5f9',
          padding: '8px 16px 8px 12px',
          borderRadius: '40px',
          border: '1px solid #e2e8f0'
        }}>
          <span style={{
            display: 'inline-block',
            width: '10px',
            height: '10px',
            backgroundColor: '#22c55e',
            borderRadius: '50%',
            animation: 'pulse 2s infinite',
            boxShadow: '0 0 0 2px rgba(34,197,94,0.3)'
          }} />
          <span style={{ color: '#475569', fontSize: '13px', fontWeight: 500 }}>Live</span>
          {latestMultiplier > 0 && (
            <span style={{
              color: getMultiplierColor(latestMultiplier),
              fontWeight: 700,
              fontSize: '18px',
              marginLeft: '4px'
            }}>
              {latestMultiplier.toFixed(2)}x
            </span>
          )}
        </div>
      </div>

      {/* Stat Cards - 4 column grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        {[
          { label: 'Total Rounds', value: stats?.total_rounds?.toLocaleString() || '0', icon: Hash, color: '#0056a3', bg: '#eff6ff' },
          { label: 'Avg Multiplier', value: `${stats?.avg_multiplier?.toFixed(2) || '0.00'}x`, icon: TrendingUp, color: '#2e7d32', bg: '#ecfdf5' },
          { label: 'Highest', value: `${stats?.max_multiplier?.toFixed(2) || '0.00'}x`, icon: Trophy, color: '#7c3aed', bg: '#f5f3ff' },
          { label: 'Crash Rate', value: `${stats?.low_multiplier_prob ?? '0'}%`, icon: AlertTriangle, color: '#d32f2f', bg: '#fef2f2' },
        ].map((stat, i) => (
          <div key={i} style={{
            background: 'white',
            borderRadius: '14px',
            padding: '20px 20px 18px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            cursor: 'default',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 8px 16px -6px rgba(0,0,0,0.08)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.03)'
          }}
          >
            <div>
              <div style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                {stat.label}
              </div>
              <div style={{ color: '#0f172a', fontSize: '26px', fontWeight: 700, lineHeight: 1.2, marginTop: '4px' }}>
                {stat.value}
              </div>
            </div>
            <div style={{
              backgroundColor: stat.bg,
              padding: '10px',
              borderRadius: '12px',
              color: stat.color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <stat.icon size={20} />
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '20px',
        marginBottom: '28px'
      }}>
        {/* Multiplier Trend Chart */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '20px 20px 12px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Activity size={18} color="#0056a3" />
              <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '16px' }}>Multiplier Trend</span>
            </div>
            <span style={{
              fontSize: '12px',
              color: '#94a3b8',
              background: '#f1f5f9',
              padding: '4px 12px',
              borderRadius: '20px',
              fontWeight: 500
            }}>
              {chartData.length} points
            </span>
          </div>
          <div style={{ height: '280px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorMultiplier" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0056a3" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#0056a3" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(t) => format(new Date(t), 'HH:mm')}
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  dy={6}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={11} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `${val}x`}
                  dx={-6}
                />
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                    fontSize: '13px'
                  }}
                  labelFormatter={(t) => format(new Date(t), 'MMM dd, HH:mm')}
                  formatter={(value: number) => [`${value.toFixed(2)}x`, 'Multiplier']}
                  itemStyle={{ color: '#0f172a' }}
                  labelStyle={{ fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}
                />
                <Area
                  type="monotone"
                  dataKey="multiplier"
                  stroke="#0056a3"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorMultiplier)"
                  activeDot={{ r: 5, fill: 'white', stroke: '#0056a3', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Chart + Quick Stats */}
        <div style={{
          background: 'white',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '20px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <Zap size={18} color="#7c3aed" />
            <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '16px' }}>Risk Distribution</span>
          </div>
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    fontSize: '13px'
                  }}
                  formatter={(value: number) => [`${value} rounds`, '']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '24px',
            marginTop: '4px',
            paddingTop: '12px',
            borderTop: '1px solid #f1f5f9'
          }}>
            {pieData.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  borderRadius: '4px',
                  backgroundColor: item.color
                }} />
                <span style={{ fontSize: '13px', color: '#475569' }}>
                  {item.name.split(' ')[0]} <strong style={{ color: '#0f172a' }}>{item.value}</strong>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Rounds Table */}
      <div style={{
        background: 'white',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 24px',
          borderBottom: '1px solid #f1f5f9',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={18} color="#64748b" />
            <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '16px' }}>Recent Rounds</span>
          </div>
          <span style={{
            fontSize: '12px',
            fontWeight: 500,
            color: '#059669',
            background: '#ecfdf5',
            padding: '4px 14px',
            borderRadius: '20px',
            border: '1px solid #a7f3d0'
          }}>
            ● Live Updates
          </span>
        </div>

        {recentList.length === 0 ? (
          <div style={{
            padding: '48px 24px',
            textAlign: 'center',
            color: '#94a3b8'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '8px' }}>📊</div>
            <div style={{ fontSize: '16px', fontWeight: 500, color: '#475569' }}>No data yet</div>
            <div style={{ fontSize: '14px' }}>Start collecting multiplier data</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '14px'
            }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>#</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Multiplier</th>
                  <th style={{ padding: '12px 20px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Status</th>
                  <th style={{ padding: '12px 20px', textAlign: 'right', color: '#64748b', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentList.slice(0, 15).map((round, index) => {
                  const color = getMultiplierColor(round.multiplier)
                  const badge = getBadgeClass(round.multiplier)
                  const isSafe = round.multiplier >= 2
                  return (
                    <tr key={round.id} style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.1s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#fafbfc' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={{ padding: '12px 20px', color: '#94a3b8', fontWeight: 500 }}>#{index + 1}</td>
                      <td style={{ padding: '12px 20px', fontWeight: 700, color }}>{round.multiplier.toFixed(2)}x</td>
                      <td style={{ padding: '12px 20px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 14px',
                          borderRadius: '40px',
                          fontSize: '11px',
                          fontWeight: 600,
                          letterSpacing: '0.3px',
                          background: isSafe ? '#ecfdf5' : '#fef2f2',
                          color: isSafe ? '#059669' : '#dc2626',
                          border: isSafe ? '1px solid #a7f3d0' : '1px solid #fecaca'
                        }}>
                          {isSafe ? 'SAFE' : 'CRASH'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', color: '#94a3b8', fontWeight: 500 }}>
                        {format(new Date(round.timestamp), 'HH:mm:ss')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Animation keyframes for live dot */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}