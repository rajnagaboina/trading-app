import { useEffect } from 'react'
import clsx from 'clsx'
import { RefreshCw } from 'lucide-react'
import { usePortfolioStore } from '@/store/portfolioStore'

interface GreekCardProps {
  label: string
  value: number
  description: string
  color?: string
  format?: (v: number) => string
}

function GreekCard({ label, value, description, color, format }: GreekCardProps) {
  const fmt = format ?? ((v) => v.toFixed(2))
  const isPositive = value >= 0
  return (
    <div className="bg-bg-elevated rounded p-2 flex flex-col gap-0.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-text-muted font-medium">{label}</span>
        <span className="text-[8px] text-text-muted">{description}</span>
      </div>
      <span className={clsx('text-sm font-mono font-semibold', color ?? (isPositive ? 'text-bull' : 'text-bear'))}>
        {isPositive ? '+' : ''}{fmt(value)}
      </span>
    </div>
  )
}

export function GreeksDashboard() {
  const { positions, greeks, isLoading, loadPortfolio } = usePortfolioStore()

  useEffect(() => {
    loadPortfolio()
  }, []) // eslint-disable-line

  const dayPLPositive = (greeks?.dayPL ?? 0) >= 0

  return (
    <div className="flex flex-col bg-bg-secondary border-l border-border h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-semibold text-text-primary">Portfolio Greeks</span>
        <button onClick={loadPortfolio} disabled={isLoading} className="text-text-muted hover:text-accent transition-colors">
          <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      {greeks && (
        <>
          {/* P&L Summary */}
          <div className="px-3 py-2 border-b border-border">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-muted">Portfolio Value</span>
              <span className="text-sm font-mono font-semibold text-text-primary">
                ${greeks.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-text-muted">Day P&L</span>
              <span className={clsx('text-sm font-mono font-semibold', dayPLPositive ? 'text-bull' : 'text-bear')}>
                {dayPLPositive ? '+' : ''}${Math.abs(greeks.dayPL).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                <span className="text-xs ml-1">({dayPLPositive ? '+' : ''}{greeks.dayPLPercent.toFixed(2)}%)</span>
              </span>
            </div>
          </div>

          {/* Greeks grid */}
          <div className="grid grid-cols-2 gap-2 p-3">
            <GreekCard
              label="Net Delta (Δ)"
              value={greeks.netDelta}
              description="$/1pt move"
              color={greeks.netDelta >= 0 ? 'text-bull' : 'text-bear'}
            />
            <GreekCard
              label="Net Gamma (Γ)"
              value={greeks.netGamma}
              description="Δ change rate"
              color="text-accent"
              format={(v) => v.toFixed(4)}
            />
            <GreekCard
              label="Net Theta (Θ)"
              value={greeks.netTheta}
              description="$/day decay"
              color={greeks.netTheta >= 0 ? 'text-bull' : 'text-bear'}
            />
            <GreekCard
              label="Net Vega (V)"
              value={greeks.netVega}
              description="$/1% IV move"
              color={greeks.netVega >= 0 ? 'text-bull' : 'text-bear'}
            />
          </div>
        </>
      )}

      {/* Positions list */}
      <div className="flex-1 overflow-y-auto border-t border-border">
        <div className="px-3 py-1.5 text-[10px] text-text-muted font-medium border-b border-border">
          Positions ({positions.length})
        </div>
        {positions.length === 0 ? (
          <div className="px-3 py-4 text-xs text-text-muted text-center">
            {isLoading ? 'Loading...' : 'No open positions'}
          </div>
        ) : (
          positions.map((pos) => (
            <div key={pos.id} className="px-3 py-2 border-b border-border/50 hover:bg-bg-elevated transition-colors">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-medium text-text-primary">{pos.symbol}</span>
                  <span className={clsx('text-[9px] px-1 rounded', pos.quantity > 0 ? 'bg-bull/20 text-bull' : 'bg-bear/20 text-bear')}>
                    {pos.quantity > 0 ? 'LONG' : 'SHORT'} {Math.abs(pos.quantity)}
                  </span>
                </div>
                <span className={clsx('font-mono text-xs', pos.unrealizedPL >= 0 ? 'text-bull' : 'text-bear')}>
                  {pos.unrealizedPL >= 0 ? '+' : ''}${pos.unrealizedPL.toFixed(0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-text-muted font-mono mt-0.5">
                <span>avg ${pos.avgCost.toFixed(2)} → ${pos.currentPrice.toFixed(2)}</span>
                <span className={pos.unrealizedPLPercent >= 0 ? 'text-bull' : 'text-bear'}>
                  {pos.unrealizedPLPercent >= 0 ? '+' : ''}{pos.unrealizedPLPercent.toFixed(1)}%
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
