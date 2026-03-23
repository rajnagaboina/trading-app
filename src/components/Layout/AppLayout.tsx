import { TopBar } from './TopBar'
import { WatchlistPanel } from '@/components/Watchlist/WatchlistPanel'
import { StockChart } from '@/components/Chart/StockChart'
import { OptionsChain } from '@/components/OptionsChain/OptionsChain'
import { UOAScanner } from '@/components/UOAScanner/UOAScanner'
import { GreeksDashboard } from '@/components/Portfolio/GreeksDashboard'

/**
 * Main terminal layout:
 *
 * ┌────────────────── TopBar ───────────────────────┐
 * │ Watchlist │   Chart (top 60%)   │  UOA Scanner  │
 * │           ├────────────────────┤               │
 * │           │  Options Chain     │  Greeks Dash  │
 * └───────────┴────────────────────┴───────────────┘
 */
export function AppLayout() {
  return (
    <div className="flex flex-col h-screen bg-bg-primary text-text-primary overflow-hidden">
      <TopBar />

      <div className="flex flex-1 min-h-0">
        {/* Left: Watchlist */}
        <WatchlistPanel />

        {/* Center: Chart + Options Chain */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Chart — takes 60% of center height */}
          <div className="flex-[3] min-h-0">
            <StockChart />
          </div>

          {/* Options Chain — takes 40% */}
          <div className="flex-[2] min-h-0">
            <OptionsChain />
          </div>
        </div>

        {/* Right: UOA + Greeks — fixed width, split vertically */}
        <div className="flex flex-col w-72 min-h-0">
          <div className="flex-1 min-h-0">
            <UOAScanner />
          </div>
          <div className="flex-1 min-h-0 border-t border-border">
            <GreeksDashboard />
          </div>
        </div>
      </div>
    </div>
  )
}
