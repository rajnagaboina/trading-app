/**
 * Mock data generators for development without a paid API plan.
 * Replace with real endpoints (Unusual Whales, Tradier, Polygon Starter+) in production.
 */
import type { UOAAlert, OHLCV, VolumeProfileBar } from '@/types'

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

export function generateMockBars(symbol: string, days = 365): OHLCV[] {
  const bars: OHLCV[] = []
  let price = { AAPL: 185, TSLA: 250, NVDA: 800, SPY: 530, QQQ: 460 }[symbol] ?? 100
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
