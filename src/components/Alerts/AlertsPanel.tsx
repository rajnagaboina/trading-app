import { useState } from 'react'
import { Bell, Trash2, ChevronDown, X } from 'lucide-react'
import clsx from 'clsx'
import { useAlertStore } from '@/store/alertStore'
import type { PriceAlert } from '@/store/alertStore'

function formatPrice(n: number): string {
  return n.toFixed(2)
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

interface AlertRowProps {
  alert: PriceAlert
  onRemove: (id: string) => void
  onDismiss: (id: string) => void
  triggered?: boolean
}

function AlertRow({ alert, onRemove, onDismiss, triggered }: AlertRowProps) {
  return (
    <div
      className={clsx(
        'flex items-center gap-2 px-2 py-1.5 rounded border transition-colors',
        triggered
          ? 'border-border bg-bg-elevated/40 opacity-60'
          : 'border-border bg-bg-elevated'
      )}
    >
      {/* Symbol badge */}
      <span className="font-mono font-semibold text-[10px] text-accent bg-accent/10 px-1.5 py-0.5 rounded shrink-0">
        {alert.symbol}
      </span>

      {/* Condition pill */}
      <span
        className={clsx(
          'text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0',
          alert.condition === 'above'
            ? 'text-bull bg-bull/20'
            : 'text-bear bg-bear/20'
        )}
      >
        {alert.condition === 'above' ? '▲' : '▼'} {alert.condition}
      </span>

      {/* Target price */}
      <span className="font-mono text-[10px] text-text-primary flex-1 truncate">
        ${formatPrice(alert.targetPrice)}
        {alert.note && (
          <span className="text-text-muted ml-1 font-sans">· {alert.note}</span>
        )}
      </span>

      {/* Triggered time */}
      {triggered && alert.triggeredAt && (
        <span className="text-[10px] text-text-muted shrink-0">
          {formatTime(alert.triggeredAt)}
        </span>
      )}

      {/* Actions */}
      {triggered ? (
        <button
          onClick={() => onDismiss(alert.id)}
          className="text-text-muted hover:text-text-secondary transition-colors shrink-0"
          title="Dismiss"
        >
          <X size={10} />
        </button>
      ) : (
        <button
          onClick={() => onRemove(alert.id)}
          className="text-text-muted hover:text-bear transition-colors shrink-0"
          title="Delete alert"
        >
          <Trash2 size={10} />
        </button>
      )}
    </div>
  )
}

export function AlertsPanel() {
  const { alerts, removeAlert, dismissAlert } = useAlertStore()
  const [triggeredOpen, setTriggeredOpen] = useState(false)

  const activeAlerts = alerts.filter((a) => a.isActive && a.triggeredAt === undefined)
  const triggeredAlerts = alerts.filter((a) => a.triggeredAt !== undefined)
  const totalCount = activeAlerts.length + triggeredAlerts.length

  return (
    <div className="flex flex-col h-full text-xs overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
        <Bell size={12} className="text-warn shrink-0" />
        <span className="text-text-primary font-semibold flex-1">Price Alerts</span>
        {totalCount > 0 && (
          <span className="bg-warn/20 text-warn text-[10px] font-mono px-1.5 py-0.5 rounded-full">
            {totalCount}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 flex flex-col gap-1">
        {/* Empty state */}
        {activeAlerts.length === 0 && triggeredAlerts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-text-muted px-4 text-center">
            <Bell size={18} className="opacity-30" />
            <span className="text-[10px] leading-snug">
              No alerts set — click the bell icon on any watchlist item
            </span>
          </div>
        )}

        {/* Active alerts */}
        {activeAlerts.length > 0 && (
          <div className="flex flex-col gap-1">
            {activeAlerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                onRemove={removeAlert}
                onDismiss={dismissAlert}
              />
            ))}
          </div>
        )}

        {/* Triggered alerts (collapsible) */}
        {triggeredAlerts.length > 0 && (
          <div className="flex flex-col gap-1 mt-1">
            <button
              onClick={() => setTriggeredOpen((v) => !v)}
              className="flex items-center gap-1 text-[10px] text-text-muted hover:text-text-secondary transition-colors py-0.5"
            >
              <ChevronDown
                size={10}
                className={clsx('transition-transform', triggeredOpen ? '' : '-rotate-90')}
              />
              Triggered ({triggeredAlerts.length})
            </button>
            {triggeredOpen && (
              <div className="flex flex-col gap-1">
                {triggeredAlerts.map((alert) => (
                  <AlertRow
                    key={alert.id}
                    alert={alert}
                    onRemove={removeAlert}
                    onDismiss={dismissAlert}
                    triggered
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
