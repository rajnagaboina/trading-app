import axios from 'axios'

const BASE = 'https://api.polygon.io'

const api = axios.create({
  baseURL: BASE,
  params: { apiKey: import.meta.env.VITE_POLYGON_API_KEY },
})

// ── Rate limit tracker ────────────────────────────────────────────────────────

const callTimestamps: number[] = []
const MAX_CALLS_PER_MINUTE = 4 // stay under free tier limit of 5

function canMakeApiCall(): boolean {
  const now = Date.now()
  const oneMinuteAgo = now - 60_000
  // Prune old entries
  while (callTimestamps.length > 0 && callTimestamps[0] < oneMinuteAgo) {
    callTimestamps.shift()
  }
  return callTimestamps.length < MAX_CALLS_PER_MINUTE
}

function recordApiCall(): void {
  callTimestamps.push(Date.now())
}

// ── Price fetching ────────────────────────────────────────────────────────────

export async function fetchLastPrice(symbol: string): Promise<number | null> {
  if (!canMakeApiCall()) return null
  try {
    recordApiCall()
    const res = await api.get(`/v2/last/trade/${symbol}`)
    const price = res.data?.results?.p as number | undefined
    return price ?? null
  } catch {
    return null
  }
}

// ── Price simulation ──────────────────────────────────────────────────────────

export function simulatePrice(currentPrice: number): number {
  // Small random walk ±0.2%
  const pct = (Math.random() - 0.5) * 0.004
  return Math.max(0.01, currentPrice * (1 + pct))
}

// ── Polling orchestrator ──────────────────────────────────────────────────────

export interface PollingOptions {
  activeSymbol: string
  allSymbols: string[]
  getCurrentPrice: (symbol: string) => number | undefined
  onUpdate: (symbol: string, price: number) => void
  activeIntervalMs?: number
  watchlistIntervalMs?: number
}

export function startPolling(options: PollingOptions): () => void {
  const {
    activeSymbol,
    allSymbols,
    getCurrentPrice,
    onUpdate,
    activeIntervalMs = 3_000,
    watchlistIntervalMs = 12_000,
  } = options

  const timers: ReturnType<typeof setInterval>[] = []

  // Poll the active (selected) symbol at higher frequency
  const activeTimer = setInterval(async () => {
    const fetched = await fetchLastPrice(activeSymbol)
    if (fetched !== null) {
      onUpdate(activeSymbol, fetched)
    } else {
      // Fallback: simulate
      const current = getCurrentPrice(activeSymbol)
      if (current !== undefined) {
        onUpdate(activeSymbol, simulatePrice(current))
      }
    }
  }, activeIntervalMs)

  timers.push(activeTimer)

  // Poll watchlist symbols in a rotating fashion to spread rate-limit budget
  const watchlistSymbols = allSymbols.filter((s) => s !== activeSymbol)
  if (watchlistSymbols.length > 0) {
    let rotationIndex = 0

    const watchlistTimer = setInterval(async () => {
      const symbol = watchlistSymbols[rotationIndex % watchlistSymbols.length]
      rotationIndex++

      const fetched = await fetchLastPrice(symbol)
      if (fetched !== null) {
        onUpdate(symbol, fetched)
      } else {
        const current = getCurrentPrice(symbol)
        if (current !== undefined) {
          onUpdate(symbol, simulatePrice(current))
        }
      }
    }, watchlistIntervalMs)

    timers.push(watchlistTimer)
  }

  return () => {
    timers.forEach((t) => clearInterval(t))
  }
}
