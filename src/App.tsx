import { useEffect } from 'react'
import { AppLayout } from '@/components/Layout/AppLayout'
import { useMarketStore } from '@/store/marketStore'
import { useWatchlistStore } from '@/store/watchlistStore'

export default function App() {
  const { setSelectedSymbol, loadUOA } = useMarketStore()
  const { lists, activeList } = useWatchlistStore()

  // On mount: load quotes for watchlist + initial symbol
  useEffect(() => {
    const items = lists[activeList] ?? []
    setSelectedSymbol(items[0]?.symbol ?? 'AAPL')
    loadUOA()

    // Load market index quotes for TopBar
    const indices = ['SPY', 'QQQ', 'IWM']
    indices.forEach((sym) => useMarketStore.getState().loadQuote(sym))
  }, []) // eslint-disable-line

  return <AppLayout />
}
