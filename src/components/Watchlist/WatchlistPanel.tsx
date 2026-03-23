import { useState, useEffect, useRef } from 'react'
import { Plus, X, ChevronDown, Bell } from 'lucide-react'
import clsx from 'clsx'
import { useWatchlistStore } from '@/store/watchlistStore'
import { useMarketStore } from '@/store/marketStore'
import { useAlertStore } from '@/store/alertStore'
import { SetAlertModal } from '@/components/Alerts/SetAlertModal'

export function WatchlistPanel() {
  const { lists, activeList, setActiveList, addSymbol, removeSymbol } = useWatchlistStore()
  const { quotes, selectedSymbol, setSelectedSymbol, loadQuote } = useMarketStore()
  const { alerts } = useAlertStore()
  const [addInput, setAddInput] = useState('')
  const [showListMenu, setShowListMenu] = useState(false)
  const [alertModalSymbol, setAlertModalSymbol] = useState<string | null>(null)

  // Track previous prices for flash animation
  const prevPricesRef = useRef<Record<string, number>>({})
  // Track active flash class per symbol: 'up' | 'down' | null
  const [flashMap, setFlashMap] = useState<Record<string, 'up' | 'down' | null>>({})
  const flashTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const items = lists[activeList] ?? []

  // Load quotes for all watchlist items
  useEffect(() => {
    items.forEach((item) => {
      if (!quotes[item.symbol]) loadQuote(item.symbol)
    })
  }, [activeList]) // eslint-disable-line

  // Detect price changes and trigger flash
  useEffect(() => {
    const updates: Record<string, 'up' | 'down'> = {}

    items.forEach((item) => {
      const q = quotes[item.symbol]
      if (!q) return
      const prev = prevPricesRef.current[item.symbol]
      if (prev !== undefined && prev !== q.price) {
        updates[item.symbol] = q.price > prev ? 'up' : 'down'
      }
      prevPricesRef.current[item.symbol] = q.price
    })

    if (Object.keys(updates).length === 0) return

    setFlashMap((fm) => ({ ...fm, ...updates }))

    // Clear flash after 700ms
    Object.entries(updates).forEach(([symbol]) => {
      if (flashTimersRef.current[symbol]) {
        clearTimeout(flashTimersRef.current[symbol])
      }
      flashTimersRef.current[symbol] = setTimeout(() => {
        setFlashMap((fm) => ({ ...fm, [symbol]: null }))
      }, 700)
    })
  }) // run every render to catch price changes

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const sym = addInput.trim().toUpperCase()
    if (sym) {
      addSymbol(sym)
      loadQuote(sym)
      setAddInput('')
    }
  }

  const alertModalQuote = alertModalSymbol ? quotes[alertModalSymbol] : null

  return (
    <aside className="w-52 bg-bg-secondary border-r border-border flex flex-col text-xs">
      {/* List selector */}
      <div className="relative px-3 py-2 border-b border-border">
        <button
          onClick={() => setShowListMenu((v) => !v)}
          className="flex items-center justify-between w-full text-text-primary font-medium hover:text-accent transition-colors"
        >
          <span className="truncate">{activeList}</span>
          <ChevronDown size={12} className="shrink-0 ml-1" />
        </button>
        {showListMenu && (
          <div className="absolute top-full left-0 right-0 z-50 bg-bg-elevated border border-border rounded shadow-lg mt-1 py-1">
            {Object.keys(lists).map((name) => (
              <button
                key={name}
                onClick={() => { setActiveList(name); setShowListMenu(false) }}
                className={clsx(
                  'w-full text-left px-3 py-1.5 hover:bg-bg-tertiary transition-colors truncate',
                  name === activeList ? 'text-accent' : 'text-text-primary'
                )}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Symbol rows */}
      <div className="flex-1 overflow-y-auto">
        {items.map((item) => {
          const q = quotes[item.symbol]
          const up = (q?.changePercent ?? 0) >= 0
          const active = item.symbol === selectedSymbol
          const flash = flashMap[item.symbol]
          const hasAlert = alerts.some(
            (a) => a.symbol === item.symbol && a.isActive && a.triggeredAt === undefined
          )

          return (
            <div
              key={item.symbol}
              onClick={() => setSelectedSymbol(item.symbol)}
              className={clsx(
                'group flex items-center justify-between px-3 py-2 cursor-pointer border-l-2 transition-colors',
                active
                  ? 'bg-bg-elevated border-l-accent text-text-primary'
                  : 'border-l-transparent hover:bg-bg-elevated text-text-secondary hover:text-text-primary'
              )}
            >
              <div className="flex flex-col min-w-0">
                <span className="font-medium font-mono text-text-primary">{item.symbol}</span>
                {q && (
                  <span className={clsx('text-[10px]', up ? 'text-bull' : 'text-bear')}>
                    {up ? '+' : ''}{q.changePercent.toFixed(2)}%
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {q && (
                  <span
                    className={clsx(
                      'font-mono text-text-primary rounded px-0.5',
                      flash === 'up' && 'flash-up',
                      flash === 'down' && 'flash-down'
                    )}
                  >
                    {q.price.toFixed(2)}
                  </span>
                )}

                {/* Bell / alert button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setAlertModalSymbol(item.symbol)
                  }}
                  className={clsx(
                    'transition-all ml-0.5',
                    hasAlert
                      ? 'text-warn opacity-100'
                      : 'opacity-0 group-hover:opacity-100 text-text-muted hover:text-warn'
                  )}
                  title={hasAlert ? 'Alert set' : 'Set alert'}
                >
                  <Bell size={10} />
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); removeSymbol(item.symbol) }}
                  className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-bear transition-all ml-0.5"
                >
                  <X size={10} />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add symbol */}
      <form onSubmit={handleAdd} className="p-2 border-t border-border">
        <div className="flex gap-1">
          <input
            type="text"
            value={addInput}
            onChange={(e) => setAddInput(e.target.value.toUpperCase())}
            placeholder="Add symbol..."
            className="flex-1 bg-bg-elevated border border-border text-text-primary px-2 py-1 rounded text-xs font-mono focus:outline-none focus:border-accent placeholder:text-text-muted"
          />
          <button
            type="submit"
            className="bg-accent hover:bg-accent-hover text-white px-2 py-1 rounded transition-colors"
          >
            <Plus size={12} />
          </button>
        </div>
      </form>

      {/* Alert modal */}
      {alertModalSymbol && alertModalQuote && (
        <SetAlertModal
          symbol={alertModalSymbol}
          currentPrice={alertModalQuote.price}
          onClose={() => setAlertModalSymbol(null)}
        />
      )}
    </aside>
  )
}
