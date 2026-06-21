// Shared TypeScript interfaces for the SportPesa Road Worx Analytics platform

export interface Stats {
  total_rounds: number
  avg_multiplier: number
  median_multiplier: number
  min_multiplier: number
  max_multiplier: number
  most_frequent_multiplier: number
  last_multiplier: number
  recent_multipliers: number[]
  low_multiplier_prob: number
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

export interface SocketContext {
  socket: any
  connected: boolean
}

// ===== AI Trading Types =====

export interface AIConfig {
  bankroll: number
  risk_level: 'conservative' | 'moderate' | 'aggressive'
  max_bet_pct: number
  max_bet_abs: number
  stop_loss_pct: number
  take_profit_pct: number
  kelly_fraction: number
  min_data_points: number
  analysis_window: number
  cooldown_after_loss: number
  max_consecutive_losses: number
  dry_run: boolean
  target_win_rate: number
  preferred_targets: number[]
  w_prob_high?: number
  w_prob_med?: number
  w_mr_oversold?: number
  w_vol_low?: number
  w_streak_low?: number
  w_data_quality?: number
  w_mr_overbought?: number
  w_vol_high?: number
  w_streak_high?: number
  w_prob_low?: number
  w_loss_penalty?: number
  confidence_threshold?: number
  weight_ev?: number
  weight_prob?: number
}

export interface AIDecision {
  action: 'bet' | 'skip' | 'stop_session'
  stake: number
  target_multiplier: number
  confidence: number
  reasoning: string
  risk_level: 'low' | 'medium' | 'high'
  analysis: AIAnalysis | Record<string, never>
}

export interface AISessionStats {
  session_id: string
  started_at: string
  total_bets: number
  wins: number
  losses: number
  skips: number
  current_balance: number
  starting_balance: number
  peak_balance: number
  lowest_balance: number
  total_profit_loss: number
  win_rate: number
  roi: number
  best_trade: number
  worst_trade: number
  current_streak: number
  longest_win_streak: number
  longest_loss_streak: number
  consecutive_losses: number
  rounds_since_last_bet: number
  equity_curve: number[]
  is_running: boolean
  is_dry_run: boolean
}

export interface AITradeResult {
  outcome: 'win' | 'loss'
  stake: number
  target: number
  actual: number
  profit_loss: number
  balance: number
  is_dry_run: boolean
}

export interface AIBetLogEntry {
  id: number
  timestamp: string
  action: string
  stake: number | null
  target_multiplier: number | null
  actual_multiplier: number | null
  profit_loss: number | null
  balance_before: number | null
  balance_after: number | null
  confidence: number | null
  risk_level: string | null
  reasoning: string | null
  outcome: string | null
  session_id: string | null
  is_dry_run: boolean
}

export interface AIAnalysis {
  data_points: number
  mean: number
  median: number
  stdev: number
  variance: number
  skewness: number
  mean_5: number
  mean_10: number
  mean_20: number
  distribution: Record<string, number>
  distribution_counts: Record<string, number>
  probabilities: Record<string, number>
  streaks: {
    current_type: 'high' | 'low' | null
    current_length: number
    max_low: number
    max_high: number
  }
  volatility_10: number
  volatility_20: number
  mean_reversion: {
    signal: 'oversold' | 'overbought' | 'neutral'
    strength: number
    deviation: number
  }
  last_5: number[]
}

export interface AIStatusResponse {
  is_running: boolean
  session?: AISessionStats
  config?: AIConfig
  message?: string
}

export interface AIHistoryResponse {
  history: AIBetLogEntry[]
  total: number
  page: number
  per_page: number
}
