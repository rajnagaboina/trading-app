import { create } from 'zustand'
import type { Position, PortfolioGreeks } from '@/types'
import { fetchPositions, fetchPortfolioGreeks } from '@/services/tradier'

interface PortfolioState {
  positions: Position[]
  greeks: PortfolioGreeks | null
  isLoading: boolean
  lastUpdated: number | null
  loadPortfolio: () => Promise<void>
}

export const usePortfolioStore = create<PortfolioState>((set) => ({
  positions: [],
  greeks: null,
  isLoading: false,
  lastUpdated: null,

  loadPortfolio: async () => {
    set({ isLoading: true })
    try {
      const positions = await fetchPositions()
      const greeks = await fetchPortfolioGreeks(positions)
      set({ positions, greeks, isLoading: false, lastUpdated: Date.now() })
    } catch {
      set({ isLoading: false })
    }
  },
}))
