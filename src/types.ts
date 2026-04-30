// Shared TypeScript interfaces for the SpotPesa Aviator Analytics platform

export interface Stats {
  total_rounds: number
  avg_multiplier: number
  median_multiplier: number
  min_multiplier: number
  max_multiplier: number
  most_frequent_multiplier: number
  last_multiplier: number
  recent_multipliers: number[]
  trends: {
    rounds_24h: number
    avg_24h: number
  }
}

export interface Multiplier {
  id: number
  multiplier: number
  timestamp: string
  session_id: string
  game_round_id?: string | null
  server_seed_hash?: string | null
  server_seed?: string | null
  client_seed_1?: string | null
  client_seed_2?: string | null
  client_seed_3?: string | null
  nonce?: number | null
  sha512_hash?: string | null
  source?: string
  has_seeds?: boolean
}

export interface MultiplierResponse {
  multipliers: Multiplier[]
  total: number
  page: number
  per_page: number
}

export interface CollectionStatus {
  is_running: boolean
  driver_active: boolean
  login_status?: string
  last_multiplier?: number | null
  collected_count?: number
  data_source?: string
  ws_hooked?: boolean
  recent_errors?: string[]
  last_crash?: number | null
}

export interface DistributionBucket {
  range: string
  count: number
  percentage: number
  color?: string
}

export interface ProbabilityData {
  p2x: number
  p5x: number
  range_probs: Record<string, number>
}

export interface PredictionData {
  prediction: number
  confidence: number
  reason: string
  method?: string
  next_server_hash?: string | null
  data_points?: number
  seeded_rounds?: number
  avg_all?: number
  avg_recent_5?: number
  std_dev?: number
}

export interface VolatilityData {
  variance: number
  std_dev: number
  indicator: string
}

export interface PatternData {
  streaks: { type: 'high' | 'low'; length: number }[]
  longest_low: number
  longest_high: number
  recent_streak: { type: 'high' | 'low'; length: number }
}

export interface SimulationResult {
  final_balance: number
  profit_loss: number
  win_rate: number
  max_drawdown: number
  is_ruined: boolean
  total_simulated: number
  equity_curve: number[]
}

export interface VerifyResult {
  verified: boolean | null
  recorded_multiplier?: number
  computed_multiplier?: number
  difference?: number
  sha512_hash?: string
  message?: string
  round?: Multiplier
}

export interface CryptoChainEntry {
  id: number
  game_round_id?: string | null
  multiplier: number
  server_seed_hash?: string | null
  server_seed_preview?: string | null
  nonce?: number | null
  computed_hash?: string | null
  computed_multiplier?: number | null
  verified: boolean
  timestamp: string
}

export interface CryptoAnalysis {
  chain: CryptoChainEntry[]
  verified_count: number
  unverified_count: number
  total: number
  verification_rate: number
}

