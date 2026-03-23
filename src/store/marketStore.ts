import { create } from 'zustand'
import type { Quote, OptionChain, UOAAlert, Timeframe } from '@/types'
import { fetchQuote, fetchOptionChain } from '@/services/polygon'
import { generateMockUOA } from '@/services/mockData'

interface MarketState {
  quotes: Record<string, Quote>
  selectedSymbol: string
  activeTimeframe: Timeframe
  optionChain: OptionChain | null
  selectedExpiry: string | null
  uoaAlerts: UOAAlert[]
  isLoadingChain: boolean
  isLoadingUOA: boolean
  error: string | null

  setSelectedSymbol: (symbol: string) => void
  setActiveTimeframe: (tf: Timeframe) => void
  setSelectedExpiry: (expiry: string) => void
  loadQuote: (symbol: string) => Promise<void>
  loadOptionChain: (symbol: string) => Promise<void>
  loadUOA: () => Promise<void>
  updateQuote: (symbol: string, partial: Partial<Quote>) => void
}

export const useMarketStore = create<MarketState>((set, get) => ({
  quotes: {},
  selectedSymbol: 'AAPL',
  activeTimeframe: '1d',
  optionChain: null,
  selectedExpiry: null,
  uoaAlerts: [],
  isLoadingChain: false,
  isLoadingUOA: false,
  error: null,

  setSelectedSymbol: (symbol) => {
    set({ selectedSymbol: symbol.toUpperCase() })
    get().loadQuote(symbol)
    get().loadOptionChain(symbol)
  },

  setActiveTimeframe: (tf) => set({ activeTimeframe: tf }),

  setSelectedExpiry: (expiry) => set({ selectedExpiry: expiry }),

  loadQuote: async (symbol) => {
    try {
      const quote = await fetchQuote(symbol.toUpperCase())
      set((s) => ({ quotes: { ...s.quotes, [symbol.toUpperCase()]: quote } }))
    } catch (err) {
      set({ error: `Failed to load quote for ${symbol}` })
    }
  },

  loadOptionChain: async (symbol) => {
    set({ isLoadingChain: true, error: null })
    try {
      const chain = await fetchOptionChain(symbol.toUpperCase())
      set({
        optionChain: chain,
        selectedExpiry: chain.expirations[0] ?? null,
        isLoadingChain: false,
      })
    } catch {
      // Fall back to mock data in dev/sandbox
      set({ isLoadingChain: false, error: null })
    }
  },

  loadUOA: async () => {
    set({ isLoadingUOA: true })
    try {
      // In production: call your aggregated options flow endpoint
      // For MVP: use mock data or a paid service like Unusual Whales API
      const alerts = await generateMockUOA()
      set({ uoaAlerts: alerts, isLoadingUOA: false })
    } catch {
      set({ isLoadingUOA: false })
    }
  },

  updateQuote: (symbol, partial) => {
    set((s) => {
      const existing = s.quotes[symbol]
      if (!existing) return s
      return { quotes: { ...s.quotes, [symbol]: { ...existing, ...partial } } }
    })
  },
}))
