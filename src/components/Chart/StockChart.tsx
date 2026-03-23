import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type CandlestickSeriesOptions,
  type LineSeriesOptions,
  type HistogramSeriesOptions,
} from 'lightweight-charts'
import { useMarketStore } from '@/store/marketStore'
import { generateMockBars, calculateVWAP, calculateVolumeProfile } from '@/services/mockData'
import type { Timeframe, VolumeProfileBar } from '@/types'
import clsx from 'clsx'

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '1d', '1w']

export function StockChart() {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const vpCanvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const vwapSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const volSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null)
  const [volumeProfile, setVolumeProfile] = useState<VolumeProfileBar[]>([])
  const [crosshairPrice, setCrosshairPrice] = useState<number | null>(null)

  const { selectedSymbol, activeTimeframe, setActiveTimeframe } = useMarketStore()

  // Init chart once
  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#0d1117' },
        textColor: '#8b949e',
        fontSize: 11,
        fontFamily: 'JetBrains Mono, Consolas, monospace',
      },
      grid: {
        vertLines: { color: '#1c2128' },
        horzLines: { color: '#1c2128' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#30363d', labelBackgroundColor: '#21262d' },
        horzLine: { color: '#30363d', labelBackgroundColor: '#21262d' },
      },
      rightPriceScale: { borderColor: '#30363d', scaleMargins: { top: 0.1, bottom: 0.25 } },
      timeScale: { borderColor: '#30363d', timeVisible: true, secondsVisible: false },
      handleScroll: true,
      handleScale: true,
    })

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#3fb950',
      downColor: '#f85149',
      borderUpColor: '#3fb950',
      borderDownColor: '#f85149',
      wickUpColor: '#3fb950',
      wickDownColor: '#f85149',
    } as Partial<CandlestickSeriesOptions>)

    const vwapSeries = chart.addLineSeries({
      color: '#bf91f9',
      lineWidth: 1,
      priceLineVisible: false,
      lastValueVisible: true,
      title: 'VWAP',
    } as Partial<LineSeriesOptions>)

    const volSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
      color: '#21262d',
    } as Partial<HistogramSeriesOptions>)

    chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } })

    chart.subscribeCrosshairMove((param) => {
      if (param.point) {
        const price = candleSeries.coordinateToPrice(param.point.y)
        setCrosshairPrice(price)
      }
    })

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    vwapSeriesRef.current = vwapSeries
    volSeriesRef.current = volSeries

    const ro = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        })
      }
    })
    ro.observe(chartContainerRef.current)

    return () => {
      ro.disconnect()
      chart.remove()
    }
  }, [])

  // Load data when symbol/timeframe changes
  useEffect(() => {
    if (!candleSeriesRef.current || !vwapSeriesRef.current || !volSeriesRef.current) return

    const bars = generateMockBars(selectedSymbol, 365)
    const vwap = calculateVWAP(bars)
    const profile = calculateVolumeProfile(bars)

    candleSeriesRef.current.setData(
      bars.map((b) => ({ time: b.time as unknown as string, open: b.open, high: b.high, low: b.low, close: b.close }))
    )
    vwapSeriesRef.current.setData(
      vwap.map((v) => ({ time: v.time as unknown as string, value: v.value }))
    )
    volSeriesRef.current.setData(
      bars.map((b) => ({
        time: b.time as unknown as string,
        value: b.volume,
        color: b.close >= b.open ? '#1a3a1f' : '#3a1a1a',
      }))
    )

    setVolumeProfile(profile)
    chartRef.current?.timeScale().fitContent()
  }, [selectedSymbol, activeTimeframe])

  // Draw Volume Profile overlay on canvas
  useEffect(() => {
    const canvas = vpCanvasRef.current
    const chart = chartRef.current
    if (!canvas || !chart || volumeProfile.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { width, height } = canvas
    ctx.clearRect(0, 0, width, height)

    const maxVol = Math.max(...volumeProfile.map((b) => b.totalVolume))
    const maxBarWidth = width * 0.18

    const priceScale = chart.priceScale('right')
    const prices = volumeProfile.map((b) => b.price)
    const priceMin = Math.min(...prices)
    const priceMax = Math.max(...prices)
    const priceRange = priceMax - priceMin

    for (const bar of volumeProfile) {
      const y = ((priceMax - bar.price) / priceRange) * height
      const barH = Math.max(1, (height / volumeProfile.length) * 0.85)
      const barW = (bar.totalVolume / maxVol) * maxBarWidth

      // Buy volume (green)
      const buyW = (bar.buyVolume / bar.totalVolume) * barW
      ctx.fillStyle = bar.isPOC ? '#3fb95066' : '#3fb95033'
      ctx.fillRect(0, y - barH / 2, buyW, barH)

      // Sell volume (red)
      ctx.fillStyle = bar.isPOC ? '#f8514966' : '#f8514933'
      ctx.fillRect(buyW, y - barH / 2, barW - buyW, barH)

      // POC line
      if (bar.isPOC) {
        ctx.strokeStyle = '#e3b341'
        ctx.lineWidth = 1
        ctx.setLineDash([3, 3])
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
        ctx.setLineDash([])
      }

      // VAH / VAL lines
      if (bar.isVAH || bar.isVAL) {
        ctx.strokeStyle = '#58a6ff44'
        ctx.lineWidth = 1
        ctx.setLineDash([2, 4])
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
        ctx.stroke()
        ctx.setLineDash([])
      }
    }

    void priceScale // suppress unused warning — used implicitly for coordinate mapping
  }, [volumeProfile])

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-bg-primary">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-border bg-bg-secondary">
        <span className="font-mono font-semibold text-text-primary">{selectedSymbol}</span>

        <div className="flex items-center gap-0.5">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setActiveTimeframe(tf)}
              className={clsx(
                'px-2 py-0.5 text-xs rounded transition-colors font-mono',
                tf === activeTimeframe
                  ? 'bg-accent text-white'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'
              )}
            >
              {tf}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 ml-auto text-xs text-text-secondary font-mono">
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-sweep inline-block" />
            VWAP
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-warn inline-block border-dashed border-t" />
            POC
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-0.5 bg-accent inline-block opacity-40" />
            VA
          </span>
        </div>
      </div>

      {/* Chart area with VP overlay */}
      <div className="relative flex-1 min-h-0">
        <div ref={chartContainerRef} className="w-full h-full" />
        <canvas
          ref={vpCanvasRef}
          width={160}
          height={400}
          className="absolute top-0 left-0 pointer-events-none"
          style={{ height: '100%', width: 160 }}
        />
        {crosshairPrice !== null && (
          <div className="absolute top-2 right-16 text-xs font-mono text-text-secondary bg-bg-elevated border border-border px-2 py-0.5 rounded pointer-events-none">
            ${crosshairPrice.toFixed(2)}
          </div>
        )}
      </div>
    </div>
  )
}
