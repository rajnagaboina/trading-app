import axios from 'axios'
import type { Quote, OHLCV, OptionChain } from '@/types'
import { generateMockQuote, generateMockOptionChain } from './mockData'

const BASE = 'https://api.polygon.io'
const WS_BASE = 'wss://socket.polygon.io/stocks'

const api = axios.create({
  baseURL: BASE,
  params: { apiKey: import.meta.env.VITE_POLYGON_API_KEY },
})

// ── REST ──────────────────────────────────────────────────────────────────────

/**
 * fetchQuote — uses free-tier endpoints:
 *   /v2/aggs/ticker/{sym}/prev  → previous day OHLCV (always free)
 *   /v2/last/trade/{sym}        → last trade price   (free, best-effort)
 * Falls back to realistic mock data on any error.
 */
export async function fetchQuote(symbol: string): Promise<Quote> {
  try {
    const [prevRes, lastRes] = await Promise.allSettled([
      api.get(`/v2/aggs/ticker/${symbol}/prev`, { params: { adjusted: true } }),
      api.get(`/v2/last/trade/${symbol}`),
    ])

    const prev = prevRes.status === 'fulfilled'
      ? prevRes.value.data.results?.[0]
      : null

    if (!prev) return generateMockQuote(symbol)

    const prevClose = prev.c as number
    const lastPrice = lastRes.status === 'fulfilled'
      ? (lastRes.value.data.results?.p as number ?? prevClose)
      : prevClose

    return {
      symbol,
      price: lastPrice,
      change: lastPrice - prevClose,
      changePercent: ((lastPrice - prevClose) / prevClose) * 100,
      open: prev.o as number,
      high: prev.h as number,
      low: prev.l as number,
      close: prevClose,
      volume: prev.v as number,
      avgVolume: prev.v as number,
      timestamp: Date.now(),
    }
  } catch {
    return generateMockQuote(symbol)
  }
}

/**
 * fetchBars — free tier: historical daily/intraday aggregates (delayed ≥15min).
 * Falls back to mock bars on error.
 */
export async function fetchBars(
  symbol: string,
  multiplier: number,
  timespan: string,
  from: string,
  to: string
): Promise<OHLCV[]> {
  try {
    const res = await api.get(
      `/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}`,
      { params: { adjusted: true, sort: 'asc', limit: 50000 } }
    )
    const results = res.data.results ?? []
    if (results.length === 0) throw new Error('empty')
    return results.map((r: Record<string, number>) => ({
      time: Math.floor(r.t / 1000),
      open: r.o,
      high: r.h,
      low: r.l,
      close: r.c,
      volume: r.v,
    }))
  } catch {
    const { generateMockBars } = await import('./mockData')
    return generateMockBars(symbol, 365)
  }
}

/**
 * fetchOptionChain — requires Polygon Starter ($29/mo).
 * Returns mock chain on 403/error so the UI stays functional on free tier.
 */
export async function fetchOptionChain(underlying: string): Promise<OptionChain> {
  try {
    const [snapRes, quoteRes] = await Promise.all([
      api.get(`/v3/snapshot/options/${underlying}`, {
        params: { limit: 250 },
      }),
      fetchQuote(underlying),
    ])

    const { buildOptionChain } = await import('./mockData')
    const contracts = snapRes.data.results ?? []
    if (contracts.length === 0) throw new Error('empty')

    return buildOptionChain(underlying, quoteRes.price, contracts)
  } catch {
    // Free tier: generate realistic mock option chain
    const quote = await fetchQuote(underlying)
    return generateMockOptionChain(underlying, quote.price)
  }
}

// ── WebSocket (requires Starter plan) ────────────────────────────────────────

type QuoteHandler = (quote: Partial<Quote> & { symbol: string }) => void

export function createPolygonWS(symbols: string[], onQuote: QuoteHandler): WebSocket {
  const ws = new WebSocket(WS_BASE)

  ws.onopen = () => {
    ws.send(JSON.stringify({ action: 'auth', params: import.meta.env.VITE_POLYGON_API_KEY }))
  }

  ws.onmessage = (event) => {
    const msgs = JSON.parse(event.data) as Array<Record<string, unknown>>
    for (const msg of msgs) {
      if (msg.ev === 'status' && msg.status === 'auth_success') {
        ws.send(JSON.stringify({ action: 'subscribe', params: symbols.map((s) => `T.${s}`).join(',') }))
      }
      if (msg.ev === 'T') {
        onQuote({
          symbol: msg.sym as string,
          price: msg.p as number,
          volume: msg.s as number,
          timestamp: msg.t as number,
        })
      }
    }
  }

  return ws
}
