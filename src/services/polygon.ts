import axios from 'axios'
import type { Quote, OHLCV, OptionChain, OptionContract } from '@/types'

const BASE = 'https://api.polygon.io'
const WS_BASE = 'wss://socket.polygon.io/stocks'

const api = axios.create({
  baseURL: BASE,
  params: { apiKey: import.meta.env.VITE_POLYGON_API_KEY },
})

// ── REST ──────────────────────────────────────────────────────────────────────

export async function fetchQuote(symbol: string): Promise<Quote> {
  const [snap, details] = await Promise.all([
    api.get(`/v2/snapshot/locale/us/markets/stocks/tickers/${symbol}`),
    api.get(`/v3/reference/tickers/${symbol}`).catch(() => ({ data: {} })),
  ])

  const d = snap.data.ticker
  return {
    symbol,
    price: d.day.c,
    change: d.day.c - d.prevDay.c,
    changePercent: ((d.day.c - d.prevDay.c) / d.prevDay.c) * 100,
    open: d.day.o,
    high: d.day.h,
    low: d.day.l,
    close: d.prevDay.c,
    volume: d.day.v,
    avgVolume: d.prevDay.v,
    marketCap: details.data?.results?.market_cap,
    timestamp: Date.now(),
  }
}

export async function fetchBars(
  symbol: string,
  multiplier: number,
  timespan: string,
  from: string,
  to: string
): Promise<OHLCV[]> {
  const res = await api.get(
    `/v2/aggs/ticker/${symbol}/range/${multiplier}/${timespan}/${from}/${to}`,
    { params: { adjusted: true, sort: 'asc', limit: 50000 } }
  )
  return (res.data.results ?? []).map((r: Record<string, number>) => ({
    time: Math.floor(r.t / 1000),
    open: r.o,
    high: r.h,
    low: r.l,
    close: r.c,
    volume: r.v,
  }))
}

export async function fetchOptionChain(underlying: string): Promise<OptionChain> {
  const [snapRes, quoteRes] = await Promise.all([
    api.get(`/v3/snapshot/options/${underlying}`, {
      params: { limit: 250, 'contract_type': 'call,put' },
    }),
    fetchQuote(underlying),
  ])

  const contracts: OptionContract[] = (snapRes.data.results ?? []).map(
    (r: Record<string, unknown>) => {
      const d = r.details as Record<string, unknown>
      const g = (r.greeks as Record<string, number>) ?? {}
      const vol = (r.day as Record<string, number>)?.volume ?? 0
      const oi = (r.open_interest as number) ?? 1
      return {
        symbol: d.ticker as string,
        underlying,
        expiry: d.expiration_date as string,
        strike: d.strike_price as number,
        type: d.contract_type as 'call' | 'put',
        bid: (r.last_quote as Record<string, number>)?.bid ?? 0,
        ask: (r.last_quote as Record<string, number>)?.ask ?? 0,
        last: (r.last_trade as Record<string, number>)?.price ?? 0,
        volume: vol,
        openInterest: oi,
        iv: (r.implied_volatility as number) ?? 0,
        greeks: {
          delta: g.delta ?? 0,
          gamma: g.gamma ?? 0,
          theta: g.theta ?? 0,
          vega: g.vega ?? 0,
          rho: g.rho ?? 0,
        },
        volumeOIRatio: vol / Math.max(oi, 1),
        isSweep: vol > oi * 3 && vol > 500,
      }
    }
  )

  const ivValues = contracts.map((c) => c.iv).filter(Boolean).sort((a, b) => a - b)
  const currentIV = ivValues[Math.floor(ivValues.length / 2)] ?? 0

  return {
    underlying,
    underlyingPrice: quoteRes.price,
    ivRank: currentIV * 100, // simplified — real IVRank needs 52-week range
    ivPercentile: 50,
    expirations: [...new Set(contracts.map((c) => c.expiry))].sort(),
    contracts,
  }
}

// ── WebSocket ─────────────────────────────────────────────────────────────────

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
