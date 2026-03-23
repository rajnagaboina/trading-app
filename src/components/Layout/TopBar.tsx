import { useState } from 'react'
import { Search, Bell, Settings, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useMarketStore } from '@/store/marketStore'

const MARKET_INDICES = ['SPY', 'QQQ', 'IWM']

export function TopBar() {
  const [searchValue, setSearchValue] = useState('')
  const { quotes, setSelectedSymbol } = useMarketStore()

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchValue.trim()) {
      setSelectedSymbol(searchValue.trim().toUpperCase())
      setSearchValue('')
    }
  }

  return (
    <header className="h-8 bg-bg-secondary border-b border-border flex items-center px-4 gap-6 select-none app-drag">
      {/* Logo */}
      <div className="flex items-center gap-2 app-no-drag">
        <div className="w-5 h-5 bg-accent rounded flex items-center justify-center">
          <span className="text-[10px] font-bold text-white">T</span>
        </div>
        <span className="text-text-primary font-semibold text-sm tracking-wide">TradingApp</span>
      </div>

      {/* Market index pills */}
      <div className="flex items-center gap-3 app-no-drag">
        {MARKET_INDICES.map((sym) => {
          const q = quotes[sym]
          const up = (q?.changePercent ?? 0) >= 0
          const Icon = up ? TrendingUp : (q?.changePercent ?? 0) < 0 ? TrendingDown : Minus
          return (
            <button
              key={sym}
              onClick={() => setSelectedSymbol(sym)}
              className="flex items-center gap-1.5 text-xs font-mono hover:bg-bg-elevated px-2 py-0.5 rounded transition-colors"
            >
              <span className="text-text-secondary">{sym}</span>
              {q ? (
                <>
                  <span className="text-text-primary">{q.price.toFixed(2)}</span>
                  <span className={up ? 'text-bull' : 'text-bear'}>
                    <Icon size={10} />
                  </span>
                  <span className={up ? 'text-bull' : 'text-bear'}>
                    {up ? '+' : ''}{q.changePercent.toFixed(2)}%
                  </span>
                </>
              ) : (
                <span className="text-text-muted">—</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <form onSubmit={handleSearch} className="app-no-drag">
        <div className="relative">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
            placeholder="Symbol..."
            className="bg-bg-elevated border border-border text-text-primary text-xs pl-6 pr-3 py-0.5 rounded w-28 focus:outline-none focus:border-accent placeholder:text-text-muted font-mono"
          />
        </div>
      </form>

      {/* Actions */}
      <div className="flex items-center gap-2 app-no-drag">
        <button className="text-text-secondary hover:text-text-primary transition-colors p-1">
          <Bell size={14} />
        </button>
        <button className="text-text-secondary hover:text-text-primary transition-colors p-1">
          <Settings size={14} />
        </button>
      </div>
    </header>
  )
}
