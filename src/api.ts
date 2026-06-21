// Centralized API service — all calls use relative URLs via Vite proxy
import type {
  Stats, MultiplierResponse, CollectionStatus, Multiplier, VerifyResult,
  CryptoAnalysis, DistributionBucket, ProbabilityData, VolatilityData,
  PatternData, PredictionData, SimulationResult,
  AIStatusResponse, AIConfig, AIDecision, AISessionStats, AIHistoryResponse, AIAnalysis
} from './types'

const API_BASE = '/api'

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || `Request failed: ${res.status}`)
  }
  return res.json()
}

export function fetchStats(): Promise<Stats> {
  return request<Stats>('/stats')
}

export function fetchDistribution(): Promise<DistributionBucket[]> {
  return request<DistributionBucket[]>('/distribution')
}

export function fetchProbabilities(): Promise<ProbabilityData> {
  return request<ProbabilityData>('/probabilities')
}

export function fetchVolatility(): Promise<VolatilityData> {
  return request<VolatilityData>('/volatility')
}

export function fetchPatterns(): Promise<PatternData> {
  return request<PatternData>('/patterns')
}

export function fetchPrediction(): Promise<PredictionData> {
  return request<PredictionData>('/predict')
}

export function fetchCryptoAnalysis(): Promise<CryptoAnalysis> {
  return request<CryptoAnalysis>('/predict/crypto')
}

export function simulateStrategy(config: {
  strategy: string
  balance: number
  bet_size: number
  target: number
}): Promise<SimulationResult> {
  return request<SimulationResult>('/simulate', {
    method: 'POST',
    body: JSON.stringify(config),
  })
}

export function fetchMultipliers(params: {
  page?: number
  per_page?: number
  start_date?: string
  end_date?: string
  min_multiplier?: string
  max_multiplier?: string
} = {}): Promise<MultiplierResponse> {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== '') searchParams.set(key, String(val))
  })
  const qs = searchParams.toString()
  return request<MultiplierResponse>(`/multipliers${qs ? '?' + qs : ''}`)
}

export function addMultiplier(data: Partial<Multiplier> & { multiplier: number }): Promise<any> {
  return request('/multiplier', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function startCollection(creds?: { username: string; password: string }): Promise<{ status: string }> {
  return request('/collection/start', {
    method: 'POST',
    body: JSON.stringify(creds || {}),
  })
}

export function stopCollection(): Promise<{ status: string }> {
  return request('/collection/stop', { method: 'POST' })
}

export function getCollectionStatus(): Promise<CollectionStatus> {
  return request<CollectionStatus>('/collection/status')
}


export function fetchRoundDetail(id: number): Promise<Multiplier> {
  return request<Multiplier>(`/round/${id}`)
}

export function verifyRound(id: number): Promise<VerifyResult> {
  return request<VerifyResult>(`/round/${id}/verify`)
}

export function exportMultipliersCsv(): void {
  window.open(`${API_BASE}/multipliers/export`, '_blank')
}
export function clearMultipliers(): Promise<{ status: string; deleted: number }> {
  return request('/multipliers/clear', { method: 'POST' })
}

export function deleteMultiplier(id: number): Promise<{ status: string }> {
  return request(`/multiplier/${id}`, { method: 'DELETE' })
}

// ===== AI Trading API =====

export function fetchAIStatus(): Promise<AIStatusResponse> {
  return request<AIStatusResponse>('/ai/status')
}

export function startAI(config: Partial<AIConfig> & { bankroll: number }): Promise<{ status: string; session_id: string; config: AIConfig }> {
  return request('/ai/start', {
    method: 'POST',
    body: JSON.stringify(config),
  })
}

export function stopAI(reason?: string): Promise<{ status: string; session?: AISessionStats }> {
  return request('/ai/stop', {
    method: 'POST',
    body: JSON.stringify({ reason: reason || 'user_stop' }),
  })
}

export function fetchAIConfig(): Promise<AIConfig> {
  return request<AIConfig>('/ai/config')
}

export function updateAIConfig(config: Partial<AIConfig>): Promise<AIConfig> {
  return request<AIConfig>('/ai/config', {
    method: 'POST',
    body: JSON.stringify(config),
  })
}

export function fetchAIDecision(): Promise<AIDecision> {
  return request<AIDecision>('/ai/decision')
}

export function fetchAIHistory(params: { page?: number; per_page?: number; action?: string } = {}): Promise<AIHistoryResponse> {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== '') searchParams.set(key, String(val))
  })
  const qs = searchParams.toString()
  return request<AIHistoryResponse>(`/ai/history${qs ? '?' + qs : ''}`)
}

export function fetchAIStats(): Promise<AISessionStats> {
  return request<AISessionStats>('/ai/stats')
}

export function fetchAIAnalysis(): Promise<AIAnalysis> {
  return request<AIAnalysis>('/ai/analysis')
}

export function clearAIHistory(): Promise<{ status: string; deleted: number }> {
  return request('/ai/history/clear', { method: 'POST' })
}

export function trainAI(params?: { rounds?: number }): Promise<{
  status: string
  data_points: number
  original_stats: {
    profit_loss: number
    roi: number
    total_bets: number
    wins: number
    losses: number
    win_rate: number
    drawdown: number
    final_balance: number
  }
  optimized_stats: {
    profit_loss: number
    roi: number
    total_bets: number
    wins: number
    losses: number
    win_rate: number
    drawdown: number
    final_balance: number
  }
  improvement_pct: number
  optimized_config: any
}> {
  return request('/ai/train', {
    method: 'POST',
    body: JSON.stringify(params || {}),
  })
}
