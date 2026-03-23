import axios from 'axios'
import type { Position, PortfolioGreeks } from '@/types'

const ENV = import.meta.env.VITE_TRADIER_ENV ?? 'sandbox'
const BASE = ENV === 'sandbox'
  ? 'https://sandbox.tradier.com/v1'
  : 'https://api.tradier.com/v1'

const ACCOUNT_ID = import.meta.env.VITE_TRADIER_ACCOUNT_ID

const api = axios.create({
  baseURL: BASE,
  headers: {
    Authorization: `Bearer ${import.meta.env.VITE_TRADIER_TOKEN}`,
    Accept: 'application/json',
  },
})

// ── Account ───────────────────────────────────────────────────────────────────

export async function fetchPositions(): Promise<Position[]> {
  const res = await api.get(`/accounts/${ACCOUNT_ID}/positions`)
  const raw = res.data?.positions?.position
  if (!raw) return []

  const items = Array.isArray(raw) ? raw : [raw]
  return items.map((p: Record<string, unknown>) => {
    const qty = p.quantity as number
    const cost = p.cost_basis as number
    const current = (p as Record<string, Record<string, number>>).market?.last ?? 0
    const marketValue = current * Math.abs(qty)
    const unrealizedPL = marketValue - Math.abs(cost)
    return {
      id: String(p.id),
      symbol: p.symbol as string,
      type: String(p.symbol).includes(' ') ? 'option' : 'stock',
      quantity: qty,
      avgCost: Math.abs(cost) / Math.abs(qty),
      currentPrice: current,
      marketValue,
      unrealizedPL,
      unrealizedPLPercent: (unrealizedPL / Math.abs(cost)) * 100,
    }
  })
}

export async function fetchPortfolioGreeks(positions: Position[]): Promise<PortfolioGreeks> {
  // Aggregate Greeks from option positions
  let netDelta = 0, netGamma = 0, netTheta = 0, netVega = 0
  let totalValue = 0, dayPL = 0

  for (const pos of positions) {
    totalValue += pos.marketValue
    dayPL += pos.unrealizedPL
    if (pos.optionDetails?.greeks) {
      const multiplier = pos.quantity * 100
      netDelta += pos.optionDetails.greeks.delta * multiplier
      netGamma += pos.optionDetails.greeks.gamma * multiplier
      netTheta += pos.optionDetails.greeks.theta * multiplier
      netVega += pos.optionDetails.greeks.vega * multiplier
    }
  }

  return { netDelta, netGamma, netTheta, netVega, totalValue, dayPL, dayPLPercent: (dayPL / totalValue) * 100 }
}

// ── Orders ────────────────────────────────────────────────────────────────────

export interface OrderParams {
  symbol: string
  side: 'buy' | 'sell'
  quantity: number
  type: 'market' | 'limit' | 'stop' | 'stop_limit'
  duration: 'day' | 'gtc' | 'pre' | 'post'
  price?: number       // required for limit
  stop?: number        // required for stop
}

export async function placeOrder(params: OrderParams) {
  const res = await api.post(`/accounts/${ACCOUNT_ID}/orders`, {
    class: 'equity',
    symbol: params.symbol,
    side: params.side,
    quantity: params.quantity,
    type: params.type,
    duration: params.duration,
    price: params.price,
    stop: params.stop,
  })
  return res.data.order
}

export async function fetchOrders() {
  const res = await api.get(`/accounts/${ACCOUNT_ID}/orders`)
  const raw = res.data?.orders?.order
  if (!raw) return []
  return Array.isArray(raw) ? raw : [raw]
}

export async function cancelOrder(orderId: string) {
  const res = await api.delete(`/accounts/${ACCOUNT_ID}/orders/${orderId}`)
  return res.data
}

// ── Market Data (Tradier also provides quotes) ────────────────────────────────

export async function fetchTradierQuotes(symbols: string[]) {
  const res = await api.get('/markets/quotes', {
    params: { symbols: symbols.join(','), greeks: false },
  })
  const raw = res.data?.quotes?.quote
  if (!raw) return []
  return Array.isArray(raw) ? raw : [raw]
}
