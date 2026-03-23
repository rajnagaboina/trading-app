/**
 * Mock data generators for development without a paid API plan.
 * Replace with real endpoints (Unusual Whales, Tradier, Polygon Starter+) in production.
 */
import type { UOAAlert, OHLCV, VolumeProfileBar, Quote, OptionChain, OptionContract } from '@/types'

// Realistic seed prices for well-known symbols
const SEED_PRICES: Record<string, number> = {
  AAPL: 213, TSLA: 248, NVDA: 875, AMD: 162, SPY: 548,
  QQQ: 468, AMZN: 198, META: 562, MSFT: 415, GOOGL: 172,
  IWM: 208, DIA: 422, GLD: 231, TLT: 89, SOXL: 31,
}

function seedPrice(symbol: string): number {
  return SEED_PRICES[symbol] ?? 100 + (symbol.charCodeAt(0) % 50) * 3
}

const SYMBOLS = ['AAPL', 'TSLA', 'NVDA', 'AMD', 'SPY', 'QQQ', 'AMZN', 'META', 'MSFT', 'GOOGL']

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max))
}

export async function generateMockUOA(): Promise<UOAAlert[]> {
  const alerts: UOAAlert[] = []
  const now = Date.now()

  for (let i = 0; i < 40; i++) {
    const symbol = SYMBOLS[randInt(0, SYMBOLS.length)]
    const type = Math.random() > 0.5 ? 'call' : 'put'
    const size = randInt(50, 5000)
    const price = rand(0.5, 25)
    const premium = size * price * 100
    const oi = randInt(100, 10000)
    const vol = randInt(size, size * 10)
    const isGoldenSweep = premium > 1_000_000

    alerts.push({
      id: `${now}-${i}`,
      timestamp: now - randInt(0, 3_600_000),
      symbol,
      expiry: getFutureExpiry(),
      strike: Math.round(rand(50, 500) / 5) * 5,
      type,
      side: Math.random() > 0.6 ? 'ask' : Math.random() > 0.5 ? 'bid' : 'mid',
      price,
      size,
      premium,
      volume: vol,
      openInterest: oi,
      volumeOIRatio: vol / oi,
      iv: rand(0.15, 1.2),
      sentiment: type === 'call' ? 'bullish' : 'bearish',
      isSweep: Math.random() > 0.7,
      isGoldenSweep,
    })
  }

  return alerts.sort((a, b) => b.timestamp - a.timestamp)
}

function getFutureExpiry(): string {
  const d = new Date()
  d.setDate(d.getDate() + [7, 14, 30, 60, 90][randInt(0, 5)])
  // Round to Friday
  while (d.getDay() !== 5) d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

// ── Quote ─────────────────────────────────────────────────────────────────────

export function generateMockQuote(symbol: string): Quote {
  const base = seedPrice(symbol)
  const change = (Math.random() - 0.48) * base * 0.02
  const price = base + change
  return {
    symbol,
    price: +price.toFixed(2),
    change: +change.toFixed(2),
    changePercent: +((change / base) * 100).toFixed(2),
    open: +(base * (1 + (Math.random() - 0.5) * 0.005)).toFixed(2),
    high: +(Math.max(base, price) * (1 + Math.random() * 0.008)).toFixed(2),
    low: +(Math.min(base, price) * (1 - Math.random() * 0.008)).toFixed(2),
    close: base,
    volume: randInt(20_000_000, 120_000_000),
    avgVolume: randInt(30_000_000, 90_000_000),
    timestamp: Date.now(),
  }
}

// ── Options Chain ─────────────────────────────────────────────────────────────

export function generateMockOptionChain(underlying: string, underlyingPrice: number): OptionChain {
  const expirations = getNextExpirations(6)
  const contracts: OptionContract[] = []

  for (const expiry of expirations) {
    const daysOut = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000)
    const baseIV = 0.25 + Math.random() * 0.3

    // Generate strikes ±15% around current price in $5 increments
    const strikeLow = Math.floor(underlyingPrice * 0.85 / 5) * 5
    const strikeHigh = Math.ceil(underlyingPrice * 1.15 / 5) * 5

    for (let strike = strikeLow; strike <= strikeHigh; strike += 5) {
      for (const type of ['call', 'put'] as const) {
        const moneyness = type === 'call'
          ? underlyingPrice / strike
          : strike / underlyingPrice
        const isITM = moneyness > 1

        // IV smile: higher IV for OTM options
        const ivSmile = baseIV * (1 + Math.max(0, (1 - moneyness) * 2))
        const iv = Math.min(2.0, ivSmile)

        // Delta approximation
        const delta = type === 'call'
          ? Math.min(0.99, Math.max(0.01, isITM ? 0.5 + moneyness * 0.3 : 0.5 - (1 - moneyness) * 2))
          : Math.min(-0.01, Math.max(-0.99, isITM ? -0.5 - moneyness * 0.3 : -0.5 + (1 - moneyness) * 2))

        // Option price approximation
        const intrinsic = Math.max(0, type === 'call' ? underlyingPrice - strike : strike - underlyingPrice)
        const timeValue = underlyingPrice * iv * Math.sqrt(daysOut / 365) * 0.4
        const mid = +(intrinsic + timeValue).toFixed(2)
        const spread = Math.max(0.05, mid * 0.04)

        const vol = randInt(10, isITM ? 8000 : 2000)
        const oi = randInt(vol * 2, vol * 20)
        const volumeOIRatio = vol / Math.max(oi, 1)

        contracts.push({
          symbol: `${underlying}${expiry.replace(/-/g, '')}${type === 'call' ? 'C' : 'P'}${String(strike * 1000).padStart(8, '0')}`,
          underlying,
          expiry,
          strike,
          type,
          bid: +(mid - spread / 2).toFixed(2),
          ask: +(mid + spread / 2).toFixed(2),
          last: mid,
          volume: vol,
          openInterest: oi,
          iv,
          greeks: {
            delta: +delta.toFixed(3),
            gamma: +(0.01 + Math.random() * 0.05).toFixed(4),
            theta: +(-(timeValue / daysOut) * 0.9).toFixed(3),
            vega: +(underlyingPrice * 0.01 * Math.sqrt(daysOut / 365)).toFixed(3),
            rho: +(delta * daysOut * 0.0001).toFixed(4),
          },
          volumeOIRatio,
          isSweep: vol > oi * 0.5 && vol > 500,
        })
      }
    }
  }

  return {
    underlying,
    underlyingPrice,
    ivRank: randInt(20, 80),
    ivPercentile: randInt(25, 75),
    expirations,
    contracts,
  }
}

/** Build OptionChain from raw Polygon API results (used when API succeeds) */
export function buildOptionChain(underlying: string, underlyingPrice: number, rawContracts: Record<string, unknown>[]): OptionChain {
  const contracts: OptionContract[] = rawContracts.map((r) => {
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
      greeks: { delta: g.delta ?? 0, gamma: g.gamma ?? 0, theta: g.theta ?? 0, vega: g.vega ?? 0, rho: g.rho ?? 0 },
      volumeOIRatio: vol / Math.max(oi, 1),
      isSweep: vol > oi * 3 && vol > 500,
    }
  })
  const ivValues = contracts.map((c) => c.iv).filter(Boolean).sort((a, b) => a - b)
  const currentIV = ivValues[Math.floor(ivValues.length / 2)] ?? 0
  return {
    underlying, underlyingPrice,
    ivRank: currentIV * 100,
    ivPercentile: 50,
    expirations: [...new Set(contracts.map((c) => c.expiry))].sort(),
    contracts,
  }
}

function getNextExpirations(count: number): string[] {
  const exps: string[] = []
  const d = new Date()
  while (exps.length < count) {
    d.setDate(d.getDate() + 1)
    if (d.getDay() === 5) exps.push(d.toISOString().split('T')[0])
  }
  return exps
}

// ── Bars ──────────────────────────────────────────────────────────────────────

export function generateMockBars(symbol: string, days = 365): OHLCV[] {
  const bars: OHLCV[] = []
  let price = seedPrice(symbol)
  const now = Math.floor(Date.now() / 1000)
  const DAY = 86400

  for (let i = days; i >= 0; i--) {
    const t = now - i * DAY
    const date = new Date(t * 1000)
    if (date.getDay() === 0 || date.getDay() === 6) continue

    const change = (Math.random() - 0.48) * price * 0.025
    const open = price
    price = Math.max(1, price + change)
    const high = Math.max(open, price) * (1 + Math.random() * 0.008)
    const low = Math.min(open, price) * (1 - Math.random() * 0.008)
    const volume = randInt(20_000_000, 120_000_000)

    bars.push({ time: t, open, high, low, close: price, volume })
  }
  return bars
}

export function calculateVolumeProfile(bars: OHLCV[], bins = 24): VolumeProfileBar[] {
  if (bars.length === 0) return []

  const priceMin = Math.min(...bars.map((b) => b.low))
  const priceMax = Math.max(...bars.map((b) => b.high))
  const binSize = (priceMax - priceMin) / bins

  const profile: VolumeProfileBar[] = Array.from({ length: bins }, (_, i) => ({
    price: priceMin + i * binSize + binSize / 2,
    buyVolume: 0,
    sellVolume: 0,
    totalVolume: 0,
    isPOC: false,
    isVAH: false,
    isVAL: false,
  }))

  for (const bar of bars) {
    const binIdx = Math.min(Math.floor((bar.close - priceMin) / binSize), bins - 1)
    const buyFraction = bar.close > bar.open ? 0.6 : 0.4
    profile[binIdx].buyVolume += bar.volume * buyFraction
    profile[binIdx].sellVolume += bar.volume * (1 - buyFraction)
    profile[binIdx].totalVolume += bar.volume
  }

  // Mark POC (highest volume bin)
  const pocIdx = profile.reduce((best, b, i) => (b.totalVolume > profile[best].totalVolume ? i : best), 0)
  profile[pocIdx].isPOC = true

  // Value Area = 70% of total volume centered around POC
  const totalVol = profile.reduce((sum, b) => sum + b.totalVolume, 0)
  const target = totalVol * 0.7
  let accumulated = profile[pocIdx].totalVolume
  let lo = pocIdx, hi = pocIdx

  while (accumulated < target && (lo > 0 || hi < bins - 1)) {
    const loVol = lo > 0 ? profile[lo - 1].totalVolume : 0
    const hiVol = hi < bins - 1 ? profile[hi + 1].totalVolume : 0
    if (loVol >= hiVol && lo > 0) { lo--; accumulated += profile[lo].totalVolume }
    else if (hi < bins - 1) { hi++; accumulated += profile[hi].totalVolume }
    else break
  }

  profile[hi].isVAH = true
  profile[lo].isVAL = true

  return profile
}

export function calculateVWAP(bars: OHLCV[]): Array<{ time: number; value: number }> {
  let cumTPV = 0 // typical price * volume
  let cumVol = 0
  return bars.map((b) => {
    const tp = (b.high + b.low + b.close) / 3
    cumTPV += tp * b.volume
    cumVol += b.volume
    return { time: b.time, value: cumTPV / cumVol }
  })
}
