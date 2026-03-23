import { useEffect, useRef } from 'react'
import { useMarketStore } from '@/store/marketStore'
import { useWatchlistStore } from '@/store/watchlistStore'
import { useAlertStore } from '@/store/alertStore'
import { startPolling } from '@/services/polling'

export function usePolling(): void {
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    // Request notification permission once on mount
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    function launch() {
      // Clean up any existing polling loop
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }

      const { selectedSymbol } = useMarketStore.getState()
      const { lists, activeList } = useWatchlistStore.getState()

      const items = lists[activeList] ?? []
      const allSymbols = items.map((i) => i.symbol)

      // Ensure active symbol is always polled even if not on watchlist
      if (!allSymbols.includes(selectedSymbol)) {
        allSymbols.unshift(selectedSymbol)
      }

      const cleanup = startPolling({
        activeSymbol: selectedSymbol,
        allSymbols,
        getCurrentPrice: (symbol) => useMarketStore.getState().quotes[symbol]?.price,
        onUpdate: (symbol, price) => {
          const existing = useMarketStore.getState().quotes[symbol]
          if (!existing) return

          const close = existing.close
          const change = price - close
          const changePercent = close > 0 ? (change / close) * 100 : 0

          useMarketStore.getState().updateQuote(symbol, { price, change, changePercent })
          useAlertStore.getState().checkAlerts(symbol, price)
        },
      })

      cleanupRef.current = cleanup
    }

    // Initial launch
    launch()

    // Re-launch when selectedSymbol changes
    let prevSelectedSymbol = useMarketStore.getState().selectedSymbol
    const unsubMarket = useMarketStore.subscribe((state) => {
      if (state.selectedSymbol !== prevSelectedSymbol) {
        prevSelectedSymbol = state.selectedSymbol
        launch()
      }
    })

    // Re-launch when activeList or list items change
    let prevActiveList = useWatchlistStore.getState().activeList
    let prevListsJson = JSON.stringify(useWatchlistStore.getState().lists)
    const unsubWatchlist = useWatchlistStore.subscribe((state) => {
      const listsJson = JSON.stringify(state.lists)
      if (state.activeList !== prevActiveList || listsJson !== prevListsJson) {
        prevActiveList = state.activeList
        prevListsJson = listsJson
        launch()
      }
    })

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
      unsubMarket()
      unsubWatchlist()
    }
  }, [])
}
