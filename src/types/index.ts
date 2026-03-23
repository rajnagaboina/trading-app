// ── Market Data ───────────────────────────────────────────────────────────────

export interface Quote {
  symbol: string
  price: number
  change: number
  changePercent: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  avgVolume: number
  marketCap?: number
  timestamp: number
}

export interface OHLCV {
  time: number   // Unix seconds
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface VWAPPoint {
  time: number
  value: number
}

// ── Options ───────────────────────────────────────────────────────────────────

export interface Greeks {
  delta: number
  gamma: number
  theta: number
  vega: number
  rho: number
}

export interface OptionContract {
  symbol: string          // OCC symbol e.g. AAPL240119C00150000
  underlying: string
  expiry: string          // YYYY-MM-DD
  strike: number
  type: 'call' | 'put'
  bid: number
  ask: number
  last: number
  volume: number
  openInterest: number
  iv: number              // implied volatility 0-1
  ivRank?: number         // 0-100
  greeks: Greeks
  volumeOIRatio: number   // key differentiator metric
  isSweep?: boolean       // flagged unusual activity
}

export interface OptionChain {
  underlying: string
  underlyingPrice: number
  ivRank: number
  ivPercentile: number
  expirations: string[]
  contracts: OptionContract[]
}

// ── UOA (Unusual Options Activity) ───────────────────────────────────────────

export type FlowSentiment = 'bullish' | 'bearish' | 'neutral'

export interface UOAAlert {
  id: string
  timestamp: number
  symbol: string
  expiry: string
  strike: number
  type: 'call' | 'put'
  side: 'ask' | 'bid' | 'mid'   // filled above ask = aggressive buy
  price: number
  size: number                   // contracts
  premium: number                // total $ value
  volume: number
  openInterest: number
  volumeOIRatio: number
  iv: number
  sentiment: FlowSentiment
  isSweep: boolean               // single large fill vs multi-exchange sweep
  isGoldenSweep: boolean         // premium > $1M
}

// ── Portfolio & Positions ─────────────────────────────────────────────────────

export interface Position {
  id: string
  symbol: string
  type: 'stock' | 'option'
  quantity: number               // negative = short
  avgCost: number
  currentPrice: number
  marketValue: number
  unrealizedPL: number
  unrealizedPLPercent: number
  // Options-specific
  optionDetails?: {
    expiry: string
    strike: number
    contractType: 'call' | 'put'
    greeks: Greeks
  }
}

export interface PortfolioGreeks {
  netDelta: number
  netGamma: number
  netTheta: number
  netVega: number
  totalValue: number
  dayPL: number
  dayPLPercent: number
}

// ── Watchlist ─────────────────────────────────────────────────────────────────

export interface WatchlistItem {
  symbol: string
  name?: string
  quote?: Quote
  alertPrice?: number
  tags?: string[]
}

// ── Chart ─────────────────────────────────────────────────────────────────────

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w'

export interface VolumeProfileBar {
  price: number
  buyVolume: number
  sellVolume: number
  totalVolume: number
  isPOC: boolean     // Point of Control
  isVAH: boolean     // Value Area High
  isVAL: boolean     // Value Area Low
}
