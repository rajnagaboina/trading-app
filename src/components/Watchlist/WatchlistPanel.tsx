import { useState, useEffect } from 'react'
import { Plus, X, ChevronDown } from 'lucide-react'
import clsx from 'clsx'
import { useWatchlistStore } from '@/store/watchlistStore'
import { useMarketStore } from '@/store/marketStore'

export function WatchlistPanel() {
  const { lists, activeList, setActiveList, addSymbol, removeSymbol } = useWatchlistStore()
  const { quotes, selectedSymbol, setSelectedSymbol, loadQuote } = useMarketStore()
  const [addInput, setAddInput] = useState('')
  const [showListMenu, setShowListMenu] = useState(false)

  const items = lists[activeList] ?? []

  // Load quotes for all watchlist items
  useEffect(() => {
    items.forEach((item) => {
      if (!quotes[item.symbol]) loadQuote(item.symbol)
    })
  }, [activeList]) // eslint-disable-line

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const sym = addInput.trim().toUpperCase()
    if (sym) {
      addSymbol(sym)
      loadQuote(sym)
      setAddInput('')
    }
  }

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
                  <span className="font-mono text-text-primary">
                    {q.price.toFixed(2)}
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); removeSymbol(item.symbol) }}
                  className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-bear transition-all ml-1"
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
    </aside>
  )
}
