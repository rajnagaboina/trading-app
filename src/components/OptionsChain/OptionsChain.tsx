import { useEffect, useMemo } from 'react'
import clsx from 'clsx'
import { useMarketStore } from '@/store/marketStore'
import type { OptionContract } from '@/types'

function pct(v: number) { return (v * 100).toFixed(1) + '%' }
function money(v: number) { return v.toFixed(2) }

function VolumeOIBar({ ratio, isSweep }: { ratio: number; isSweep?: boolean }) {
  const fill = Math.min(ratio / 5, 1) * 100 // cap at 5x for display
  return (
    <div className="relative w-16 h-3 bg-bg-elevated rounded overflow-hidden">
      <div
        className={clsx('absolute inset-y-0 left-0 rounded transition-all', isSweep ? 'bg-sweep' : 'bg-accent')}
        style={{ width: `${fill}%`, opacity: 0.7 }}
      />
      <span className={clsx('absolute inset-0 flex items-center justify-center text-[9px] font-mono', isSweep ? 'text-sweep' : 'text-text-secondary')}>
        {ratio.toFixed(1)}x
      </span>
    </div>
  )
}

function OptionRow({ contract, underlyingPrice }: { contract: OptionContract; underlyingPrice: number }) {
  const isITM = contract.type === 'call'
    ? contract.strike < underlyingPrice
    : contract.strike > underlyingPrice

  return (
    <tr
      className={clsx(
        'border-b border-border/50 text-xs font-mono hover:bg-bg-elevated transition-colors cursor-pointer',
        isITM ? 'bg-bg-tertiary/40' : ''
      )}
    >
      <td className={clsx('px-2 py-1', contract.isSweep ? 'text-sweep font-semibold' : 'text-text-secondary')}>
        {contract.volume.toLocaleString()}
      </td>
      <td className="px-2 py-1 text-text-muted">{contract.openInterest.toLocaleString()}</td>
      <td className="px-2 py-1">
        <VolumeOIBar ratio={contract.volumeOIRatio} isSweep={contract.isSweep} />
      </td>
      <td className="px-2 py-1 text-text-secondary">{pct(contract.iv)}</td>
      <td className={clsx('px-2 py-1', contract.greeks.delta >= 0 ? 'text-bull' : 'text-bear')}>
        {contract.greeks.delta.toFixed(3)}
      </td>
      <td className="px-2 py-1 text-text-secondary">{contract.greeks.gamma.toFixed(4)}</td>
      <td className="px-2 py-1 text-bear">{contract.greeks.theta.toFixed(3)}</td>
      <td className="px-2 py-1 text-text-secondary">{contract.greeks.vega.toFixed(3)}</td>
      <td className={clsx('px-2 py-1 font-semibold', isITM ? 'text-accent' : 'text-text-primary')}>
        {contract.strike.toFixed(0)}
      </td>
    </tr>
  )
}

export function OptionsChain() {
  const {
    selectedSymbol, optionChain, selectedExpiry,
    isLoadingChain, loadOptionChain, setSelectedExpiry,
  } = useMarketStore()

  useEffect(() => {
    loadOptionChain(selectedSymbol)
  }, [selectedSymbol]) // eslint-disable-line

  const { calls, puts } = useMemo(() => {
    if (!optionChain || !selectedExpiry) return { calls: [], puts: [] }
    const filtered = optionChain.contracts.filter((c) => c.expiry === selectedExpiry)
    const calls = filtered.filter((c) => c.type === 'call').sort((a, b) => a.strike - b.strike)
    const puts = filtered.filter((c) => c.type === 'put').sort((a, b) => a.strike - b.strike)
    return { calls, puts }
  }, [optionChain, selectedExpiry])

  const underlyingPrice = optionChain?.underlyingPrice ?? 0

  function headerRow(side: 'call' | 'put') {
    const base = ['Vol', 'OI', 'Vol/OI', 'IV', 'Δ', 'Γ', 'Θ', 'V', 'Strike']
    return side === 'call' ? base : [...base].reverse()
  }

  if (isLoadingChain) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted text-sm">
        Loading options chain...
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-bg-secondary border-t border-border">
      {/* Header */}
      <div className="flex items-center gap-4 px-3 py-1.5 border-b border-border bg-bg-secondary">
        <span className="text-xs font-semibold text-text-primary">{selectedSymbol} Options</span>
        {optionChain && (
          <>
            <span className="text-xs text-text-secondary font-mono">
              IV Rank: <span className={clsx('font-semibold', optionChain.ivRank > 50 ? 'text-warn' : 'text-text-primary')}>
                {optionChain.ivRank.toFixed(0)}
              </span>
            </span>
            <span className="text-xs text-text-secondary font-mono">
              Price: <span className="text-text-primary">${money(optionChain.underlyingPrice)}</span>
            </span>
          </>
        )}

        {/* Expiry selector */}
        <div className="flex items-center gap-1 ml-auto overflow-x-auto">
          {(optionChain?.expirations ?? []).slice(0, 8).map((exp) => (
            <button
              key={exp}
              onClick={() => setSelectedExpiry(exp)}
              className={clsx(
                'px-2 py-0.5 text-[10px] rounded font-mono whitespace-nowrap transition-colors',
                exp === selectedExpiry
                  ? 'bg-accent text-white'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
              )}
            >
              {exp}
            </button>
          ))}
        </div>
      </div>

      {/* Chain table */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Calls */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-bg-secondary z-10">
              <tr>
                {headerRow('call').map((h) => (
                  <th key={h} className="px-2 py-1 text-left text-[10px] text-text-muted font-medium border-b border-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calls.map((c) => <OptionRow key={c.symbol} contract={c} underlyingPrice={underlyingPrice} />)}
            </tbody>
          </table>
        </div>

        <div className="w-px bg-border" />

        {/* Puts */}
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-bg-secondary z-10">
              <tr>
                {headerRow('put').map((h, i) => (
                  <th key={`${h}-${i}`} className="px-2 py-1 text-left text-[10px] text-text-muted font-medium border-b border-border">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {puts.map((c) => <OptionRow key={c.symbol} contract={c} underlyingPrice={underlyingPrice} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
