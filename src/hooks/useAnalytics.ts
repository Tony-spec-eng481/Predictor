import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { 
  fetchStats, 
  fetchDistribution, 
  fetchProbabilities, 
  fetchVolatility, 
  fetchPatterns,
  fetchPrediction,
  fetchCryptoAnalysis
} from '../api'
import { useWebSocket } from './useWebSocket'

export const useAnalytics = () => {
  const queryClient = useQueryClient()
  const { socket } = useWebSocket()

  const stats = useQuery({ queryKey: ['stats'], queryFn: fetchStats })
  const distribution = useQuery({ queryKey: ['distribution'], queryFn: fetchDistribution })
  const probabilities = useQuery({ queryKey: ['probabilities'], queryFn: fetchProbabilities })
  const volatility = useQuery({ queryKey: ['volatility'], queryFn: fetchVolatility })
  const patterns = useQuery({ queryKey: ['patterns'], queryFn: fetchPatterns })
  const prediction = useQuery({ queryKey: ['prediction'], queryFn: fetchPrediction, refetchInterval: 15000 })
  const cryptoAnalysis = useQuery({ queryKey: ['cryptoAnalysis'], queryFn: fetchCryptoAnalysis, refetchInterval: 20000 })

  useEffect(() => {
    if (!socket) return

    socket.on('new_multiplier', (data) => {
      console.log('New multiplier received, refreshing analytics...', data)
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      queryClient.invalidateQueries({ queryKey: ['distribution'] })
      queryClient.invalidateQueries({ queryKey: ['probabilities'] })
      queryClient.invalidateQueries({ queryKey: ['volatility'] })
      queryClient.invalidateQueries({ queryKey: ['patterns'] })
      queryClient.invalidateQueries({ queryKey: ['prediction'] })
      queryClient.invalidateQueries({ queryKey: ['cryptoAnalysis'] })
    })

    return () => {
      socket.off('new_multiplier')
    }
  }, [socket, queryClient])

  return {
    stats,
    distribution,
    probabilities,
    volatility,
    patterns,
    prediction,
    cryptoAnalysis,
    isLoading: stats.isLoading || distribution.isLoading || probabilities.isLoading || volatility.isLoading || patterns.isLoading || prediction.isLoading,
    isError: stats.isError || distribution.isError || probabilities.isError || volatility.isError || patterns.isError || prediction.isError
  }
}
