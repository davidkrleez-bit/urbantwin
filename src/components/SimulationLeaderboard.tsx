import React, { useState } from 'react';
import { ExperimentRow } from '../types/simulation';
import { Award, BarChart3, Sparkles, TrendingUp } from 'lucide-react';

interface SimulationLeaderboardProps {
  rows: ExperimentRow[];
}

export const SimulationLeaderboard: React.FC<SimulationLeaderboardProps> = ({ rows }) => {
  const [metricTab, setMetricTab] = useState<'revenue' | 'conversion' | 'wait'>('revenue');

  // Find best performer
  const sortedByRev = [...rows].sort((a, b) => b.dailyRevenueKRW - a.dailyRevenueKRW);
  const bestRow = sortedByRev[0];
  const baselineRow = rows.find((r) => r.category === 'baseline') || rows[0];

  const maxRevenue = Math.max(...rows.map((r) => r.dailyRevenueKRW), 1);
  const maxConversion = Math.max(...rows.map((r) => r.conversionRatePct), 1);
  const maxWait = Math.max(...rows.map((r) => r.avgWaitMin), 1);

  const deltaAgainstBaseline = bestRow && baselineRow && bestRow.id !== baselineRow.id
    ? Math.round(bestRow.dailyRevenueKRW - baselineRow.dailyRevenueKRW)
    : 0;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
      {/* Top Banner: Direct Answer to "Which Simulation is Best?" */}
      <div className="p-3.5 sm:p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-neutral-900 to-neutral-950 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 mt-0.5">
            <Award className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 font-mono">
                Top Strategy Recommendation
              </span>
              <span className="text-neutral-600">·</span>
              <span className="text-xs text-neutral-400">
                Comparing {rows.length} simulations
              </span>
            </div>
            <h2 className="text-base font-semibold text-white mt-0.5">
              {bestRow?.name || 'Baseline Storefront'}
            </h2>
            <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
              {bestRow && bestRow.id !== baselineRow?.id ? (
                <>
                  Projected to deliver the highest return at{' '}
                  <strong className="text-white font-mono">₩{bestRow.dailyRevenueKRW.toLocaleString()}/day</strong>{' '}
                  (<strong className="text-emerald-400 font-mono">+{bestRow.revenueDeltaPct.toFixed(1)}%</strong> vs baseline / +₩{deltaAgainstBaseline.toLocaleString()} daily profit), serving{' '}
                  <strong className="text-white font-mono">{bestRow.dailyServed} customers</strong> with an average wait time of{' '}
                  <strong className="text-white font-mono">{bestRow.avgWaitMin.toFixed(1)}m</strong>.
                </>
              ) : (
                <>
                  Baseline model yields{' '}
                  <strong className="text-white font-mono">₩{baselineRow.dailyRevenueKRW.toLocaleString()}/day</strong>. Add what-if operational hypotheses below to test pricing discounts, extra staffing, and exterior signage to find higher profit strategies.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Quick Win Highlight */}
        {bestRow && bestRow.id !== baselineRow?.id && (
          <div className="sm:text-right shrink-0 bg-neutral-950/80 p-3 rounded-lg border border-neutral-800">
            <div className="text-[11px] text-neutral-400">Net Daily Uplift</div>
            <div className="text-lg font-bold font-mono text-emerald-400 mt-0.5">
              +₩{deltaAgainstBaseline.toLocaleString()}
            </div>
            <div className="text-[10px] text-neutral-400 mt-0.5">
              +{(bestRow.dailyServed - baselineRow.dailyServed)} more buyers / day
            </div>
          </div>
        )}
      </div>

      {/* Side-by-Side Visual Comparison Matrix */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-medium text-white">
            <BarChart3 className="w-4 h-4 text-neutral-400" />
            <span>Comparative Simulation Matrix</span>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800 text-xs">
            <button
              onClick={() => setMetricTab('revenue')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                metricTab === 'revenue'
                  ? 'bg-neutral-800 text-white font-medium'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Daily Revenue
            </button>
            <button
              onClick={() => setMetricTab('conversion')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                metricTab === 'conversion'
                  ? 'bg-neutral-800 text-white font-medium'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Conversion Rate
            </button>
            <button
              onClick={() => setMetricTab('wait')}
              className={`px-3 py-1 rounded transition-colors cursor-pointer ${
                metricTab === 'wait'
                  ? 'bg-neutral-800 text-white font-medium'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Wait Time
            </button>
          </div>
        </div>

        {/* Visual Comparison Rows */}
        <div className="flex flex-col gap-2">
          {rows.map((row) => {
            const isWinner = row.id === bestRow?.id;
            let barPct = 0;
            let displayVal = '';

            if (metricTab === 'revenue') {
              barPct = Math.round((row.dailyRevenueKRW / maxRevenue) * 100);
              displayVal = `₩${row.dailyRevenueKRW.toLocaleString()}`;
            } else if (metricTab === 'conversion') {
              barPct = Math.round((row.conversionRatePct / maxConversion) * 100);
              displayVal = `${row.conversionRatePct.toFixed(1)}%`;
            } else {
              barPct = Math.round((row.avgWaitMin / maxWait) * 100);
              displayVal = `${row.avgWaitMin.toFixed(1)} min`;
            }

            return (
              <div
                key={row.id}
                className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition-colors ${
                  isWinner
                    ? 'bg-neutral-950/80 border-emerald-500/40'
                    : 'bg-neutral-950/40 border-neutral-800/80'
                }`}
              >
                {/* Simulation Title & Tags */}
                <div className="sm:w-1/3 min-w-[200px]">
                  <div className="flex items-center gap-1.5">
                    {isWinner && <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                    <span className={`font-medium truncate ${isWinner ? 'text-white' : 'text-neutral-300'}`}>
                      {row.name}
                    </span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5 truncate">
                    {row.description}
                  </div>
                </div>

                {/* Relative Performance Bar */}
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 h-3 bg-neutral-800/60 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isWinner ? 'bg-emerald-500' : 'bg-neutral-400'
                      }`}
                      style={{ width: `${Math.max(8, barPct)}%` }}
                    />
                  </div>

                  <span className="font-mono text-xs font-semibold text-white w-24 text-right shrink-0">
                    {displayVal}
                  </span>
                </div>

                {/* Delta Pill */}
                <div className="sm:w-24 text-right shrink-0 font-mono text-[11px]">
                  {row.category === 'baseline' ? (
                    <span className="text-neutral-500">BASE</span>
                  ) : row.revenueDeltaPct >= 0 ? (
                    <span className="text-emerald-400 font-medium">
                      +{row.revenueDeltaPct.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-rose-400 font-medium">
                      {row.revenueDeltaPct.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
