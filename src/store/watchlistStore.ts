import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WatchlistItem } from '@/types'

interface WatchlistState {
  lists: Record<string, WatchlistItem[]>   // listName -> items
  activeList: string
  addList: (name: string) => void
  removeList: (name: string) => void
  setActiveList: (name: string) => void
  addSymbol: (symbol: string, listName?: string) => void
  removeSymbol: (symbol: string, listName?: string) => void
  updateItem: (symbol: string, updates: Partial<WatchlistItem>, listName?: string) => void
}

const DEFAULT_LIST = 'Watchlist 1'

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set, get) => ({
      lists: {
        [DEFAULT_LIST]: [
          { symbol: 'AAPL' },
          { symbol: 'TSLA' },
          { symbol: 'NVDA' },
          { symbol: 'SPY' },
          { symbol: 'QQQ' },
          { symbol: 'AMZN' },
        ],
        'Options Plays': [
          { symbol: 'AAPL' },
          { symbol: 'NVDA' },
          { symbol: 'AMD' },
        ],
      },
      activeList: DEFAULT_LIST,

      addList: (name) =>
        set((s) => ({ lists: { ...s.lists, [name]: [] } })),

      removeList: (name) =>
        set((s) => {
          const next = { ...s.lists }
          delete next[name]
          return {
            lists: next,
            activeList: s.activeList === name ? DEFAULT_LIST : s.activeList,
          }
        }),

      setActiveList: (name) => set({ activeList: name }),

      addSymbol: (symbol, listName) => {
        const list = listName ?? get().activeList
        set((s) => {
          const existing = s.lists[list] ?? []
          if (existing.find((i) => i.symbol === symbol.toUpperCase())) return s
          return {
            lists: {
              ...s.lists,
              [list]: [...existing, { symbol: symbol.toUpperCase() }],
            },
          }
        })
      },

      removeSymbol: (symbol, listName) => {
        const list = listName ?? get().activeList
        set((s) => ({
          lists: {
            ...s.lists,
            [list]: (s.lists[list] ?? []).filter((i) => i.symbol !== symbol),
          },
        }))
      },

      updateItem: (symbol, updates, listName) => {
        const list = listName ?? get().activeList
        set((s) => ({
          lists: {
            ...s.lists,
            [list]: (s.lists[list] ?? []).map((i) =>
              i.symbol === symbol ? { ...i, ...updates } : i
            ),
          },
        }))
      },
    }),
    { name: 'trading-watchlist' }
  )
)
