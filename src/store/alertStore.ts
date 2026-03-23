import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface PriceAlert {
  id: string
  symbol: string
  condition: 'above' | 'below'
  targetPrice: number
  note: string
  createdAt: number
  triggeredAt?: number
  isActive: boolean
}

interface AlertState {
  alerts: PriceAlert[]
  addAlert: (alert: Omit<PriceAlert, 'id' | 'createdAt' | 'isActive'>) => void
  removeAlert: (id: string) => void
  dismissAlert: (id: string) => void
  checkAlerts: (symbol: string, price: number) => void
}

export const useAlertStore = create<AlertState>()(
  persist(
    (set, get) => ({
      alerts: [],

      addAlert: (alertData) => {
        const newAlert: PriceAlert = {
          ...alertData,
          id: `${alertData.symbol}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          createdAt: Date.now(),
          isActive: true,
        }
        set((s) => ({ alerts: [...s.alerts, newAlert] }))
      },

      removeAlert: (id) => {
        set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) }))
      },

      dismissAlert: (id) => {
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === id ? { ...a, isActive: false } : a
          ),
        }))
      },

      checkAlerts: (symbol, price) => {
        const { alerts } = get()
        const pending = alerts.filter(
          (a) =>
            a.symbol === symbol &&
            a.isActive &&
            a.triggeredAt === undefined
        )

        if (pending.length === 0) return

        const toFire: string[] = []

        for (const alert of pending) {
          const conditionMet =
            (alert.condition === 'above' && price >= alert.targetPrice) ||
            (alert.condition === 'below' && price <= alert.targetPrice)

          if (conditionMet) {
            toFire.push(alert.id)

            // Fire HTML5 Notification (works in Electron renderer)
            if (
              typeof Notification !== 'undefined' &&
              Notification.permission === 'granted'
            ) {
              const directionWord =
                alert.condition === 'above' ? 'above' : 'below'
              new Notification(`Price Alert: ${symbol}`, {
                body: `${symbol} is ${directionWord} $${alert.targetPrice.toFixed(2)} — now at $${price.toFixed(2)}`,
              })
            }
          }
        }

        if (toFire.length > 0) {
          const now = Date.now()
          set((s) => ({
            alerts: s.alerts.map((a) =>
              toFire.includes(a.id) ? { ...a, triggeredAt: now } : a
            ),
          }))
        }
      },
    }),
    { name: 'trading-alerts' }
  )
)
