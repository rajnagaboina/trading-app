import { useEffect, useState } from 'react'
import { RefreshCw, Flame, Zap } from 'lucide-react'
import clsx from 'clsx'
import { formatDistanceToNow } from 'date-fns'
import { useMarketStore } from '@/store/marketStore'
import type { UOAAlert } from '@/types'

type Filter = 'all' | 'calls' | 'puts' | 'sweeps' | 'golden'

function premiumLabel(p: number) {
  if (p >= 1_000_000) return `$${(p / 1_000_000).toFixed(1)}M`
  if (p >= 1_000) return `$${(p / 1_000).toFixed(0)}K`
  return `$${p.toFixed(0)}`
}

function AlertRow({ alert, onClick }: { alert: UOAAlert; onClick: () => void }) {
  const isCall = alert.type === 'call'
  return (
    <div
      onClick={onClick}
      className={clsx(
        'flex flex-col gap-0.5 px-3 py-2 border-b border-border/50 cursor-pointer hover:bg-bg-elevated transition-colors text-xs',
        alert.isGoldenSweep && 'bg-sweep/5 border-l-2 border-l-sweep',
        !alert.isGoldenSweep && alert.isSweep && 'border-l-2 border-l-accent'
      )}
    >
      {/* Row 1: Symbol + type badge + premium */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="font-mono font-semibold text-text-primary">{alert.symbol}</span>
          <span className={clsx(
            'px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide',
            isCall ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear'
          )}>
            {alert.type}
          </span>
          {alert.isGoldenSweep && <Flame size={10} className="text-sweep" />}
          {alert.isSweep && !alert.isGoldenSweep && <Zap size={10} className="text-accent" />}
        </div>
        <span className={clsx('font-mono font-semibold', alert.isGoldenSweep ? 'text-sweep' : 'text-text-primary')}>
          {premiumLabel(alert.premium)}
        </span>
      </div>

      {/* Row 2: Strike / expiry / side */}
      <div className="flex items-center gap-2 text-text-secondary font-mono">
        <span>${alert.strike} {alert.expiry}</span>
        <span className={clsx(
          'text-[9px] px-1 rounded',
          alert.side === 'ask' ? 'bg-bull/20 text-bull' : alert.side === 'bid' ? 'bg-bear/20 text-bear' : 'bg-bg-elevated text-text-muted'
        )}>
          {alert.side.toUpperCase()}
        </span>
        <span className="text-text-muted">{(alert.iv * 100).toFixed(0)}% IV</span>
      </div>

      {/* Row 3: Volume / OI ratio + time */}
      <div className="flex items-center justify-between text-text-muted">
        <span>
          Vol <span className={clsx('font-mono', alert.volumeOIRatio > 2 ? 'text-warn' : 'text-text-secondary')}>
            {alert.volume.toLocaleString()}
          </span>
          {' / OI '}
          <span className="font-mono">{alert.openInterest.toLocaleString()}</span>
          {' '}
          <span className={clsx('font-mono text-[10px]', alert.volumeOIRatio > 3 ? 'text-warn font-semibold' : '')}>
            ({alert.volumeOIRatio.toFixed(1)}x)
          </span>
        </span>
        <span className="text-[10px]">{formatDistanceToNow(alert.timestamp, { addSuffix: true })}</span>
      </div>
    </div>
  )
}

export function UOAScanner() {
  const { uoaAlerts, isLoadingUOA, loadUOA, setSelectedSymbol } = useMarketStore()
  const [filter, setFilter] = useState<Filter>('all')
  const [minPremium, setMinPremium] = useState(0)

  useEffect(() => {
    loadUOA()
    const interval = setInterval(loadUOA, 60_000) // refresh every minute
    return () => clearInterval(interval)
  }, []) // eslint-disable-line

  const filtered = uoaAlerts.filter((a) => {
    if (filter === 'calls' && a.type !== 'call') return false
    if (filter === 'puts' && a.type !== 'put') return false
    if (filter === 'sweeps' && !a.isSweep) return false
    if (filter === 'golden' && !a.isGoldenSweep) return false
    if (a.premium < minPremium * 1000) return false
    return true
  })

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'calls', label: 'Calls' },
    { key: 'puts', label: 'Puts' },
    { key: 'sweeps', label: 'Sweeps' },
    { key: 'golden', label: '🔥 $1M+' },
  ]

  return (
    <div className="flex flex-col h-full bg-bg-secondary border-l border-border">
      {/* Header */}
      <div className="px-3 py-2 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-text-primary">Options Flow</span>
          <button
            onClick={loadUOA}
            disabled={isLoadingUOA}
            className="text-text-muted hover:text-accent transition-colors"
          >
            <RefreshCw size={12} className={isLoadingUOA ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={clsx(
                'px-2 py-0.5 text-[10px] rounded transition-colors',
                filter === f.key
                  ? 'bg-accent text-white'
                  : 'bg-bg-elevated text-text-muted hover:text-text-primary'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Min premium filter */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-[10px] text-text-muted">Min premium:</span>
          <input
            type="number"
            value={minPremium}
            onChange={(e) => setMinPremium(Number(e.target.value))}
            placeholder="0"
            className="bg-bg-elevated border border-border text-text-primary text-[10px] px-1.5 py-0.5 rounded w-16 font-mono focus:outline-none focus:border-accent"
          />
          <span className="text-[10px] text-text-muted">K</span>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center gap-4 px-3 py-1.5 border-b border-border bg-bg-tertiary text-[10px] font-mono text-text-secondary">
        <span>{filtered.length} alerts</span>
        <span className="text-bull">{filtered.filter((a) => a.type === 'call').length}C</span>
        <span className="text-bear">{filtered.filter((a) => a.type === 'put').length}P</span>
        <span className="text-sweep">{filtered.filter((a) => a.isGoldenSweep).length} golden</span>
      </div>

      {/* Alert list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-text-muted text-xs">
            No alerts match filters
          </div>
        ) : (
          filtered.map((alert) => (
            <AlertRow
              key={alert.id}
              alert={alert}
              onClick={() => setSelectedSymbol(alert.symbol)}
            />
          ))
        )}
      </div>
    </div>
  )
}
