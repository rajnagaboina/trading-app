import { useState } from 'react'
import { X } from 'lucide-react'
import clsx from 'clsx'
import { useAlertStore } from '@/store/alertStore'

interface Props {
  symbol: string
  currentPrice: number
  onClose: () => void
}

export function SetAlertModal({ symbol, currentPrice, onClose }: Props) {
  const { addAlert } = useAlertStore()
  const [condition, setCondition] = useState<'above' | 'below'>('above')
  const [targetPrice, setTargetPrice] = useState(currentPrice.toFixed(2))
  const [note, setNote] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseFloat(targetPrice)
    if (isNaN(parsed) || parsed <= 0) return
    addAlert({
      symbol,
      condition,
      targetPrice: parsed,
      note: note.trim(),
      triggeredAt: undefined,
    })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-bg-secondary border border-border rounded-lg p-5 w-80 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-text-primary">Set Price Alert</span>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Symbol + current price */}
        <div className="flex items-center justify-between mb-4 px-3 py-2 bg-bg-elevated rounded border border-border">
          <span className="text-xs font-mono font-semibold text-text-primary">{symbol}</span>
          <span className="text-xs font-mono text-text-secondary">
            ${currentPrice.toFixed(2)}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Condition toggle */}
          <div className="flex rounded overflow-hidden border border-border text-xs">
            <button
              type="button"
              onClick={() => setCondition('above')}
              className={clsx(
                'flex-1 py-1.5 transition-colors font-medium',
                condition === 'above'
                  ? 'bg-accent text-white'
                  : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
              )}
            >
              Above
            </button>
            <button
              type="button"
              onClick={() => setCondition('below')}
              className={clsx(
                'flex-1 py-1.5 transition-colors font-medium',
                condition === 'below'
                  ? 'bg-accent text-white'
                  : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
              )}
            >
              Below
            </button>
          </div>

          {/* Price input */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-text-muted uppercase tracking-wide">
              Target Price
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              className="bg-bg-elevated border border-border text-text-primary px-2 py-1.5 rounded text-xs font-mono focus:outline-none focus:border-accent placeholder:text-text-muted"
              required
            />
          </div>

          {/* Note input */}
          <div className="flex flex-col gap-1">
            <label className="text-[10px] text-text-muted uppercase tracking-wide">
              Note (optional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. earnings play"
              className="bg-bg-elevated border border-border text-text-primary px-2 py-1.5 rounded text-xs focus:outline-none focus:border-accent placeholder:text-text-muted"
            />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-1.5 text-xs border border-border text-text-secondary hover:text-text-primary hover:border-text-muted rounded transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-1.5 text-xs bg-accent hover:bg-accent-hover text-white rounded transition-colors font-medium"
            >
              Set Alert
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
