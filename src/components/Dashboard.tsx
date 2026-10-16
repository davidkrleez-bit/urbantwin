import React, { useState } from 'react';
import {
  FullDayProjection,
  HorizonSummary,
  StepSimulationState,
  UserShopConfig,
} from '../types/simulation';
import {
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface DashboardProps {
  simState: StepSimulationState;
  fullDay: FullDayProjection;
  horizons: HorizonSummary;
  userConfig: UserShopConfig;
}

export const Dashboard: React.FC<DashboardProps> = ({
  simState,
  fullDay,
  horizons,
  userConfig,
}) => {
  const [activeTab, setActiveTab] = useState<'funnel' | '30d' | '365d'>('funnel');

  const conversionRate = simState.cumPassers > 0
    ? ((simState.cumServed / simState.cumPassers) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Core KPIs Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="text-[11px] text-neutral-400">Current Cumulative Revenue</div>
          <div className="text-xl font-semibold font-mono text-white mt-0.5">
            ₩{simState.cumRevenueKRW.toLocaleString()}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            Projected Day: ₩{fullDay.totalRevenueKRW.toLocaleString()}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="text-[11px] text-neutral-400">Conversion Rate</div>
          <div className="text-xl font-semibold font-mono text-white mt-0.5">
            {conversionRate}%
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            {simState.cumServed.toLocaleString()} orders completed
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="text-[11px] text-neutral-400">Queue & Wait Time</div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-xl font-semibold font-mono text-white">
              {simState.queueLength} in line
            </span>
            <span className="text-xs font-mono text-neutral-400">
              (~{simState.waitMinutes.toFixed(1)}m)
            </span>
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            {simState.effectiveServers} staff on duty
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="text-[11px] text-neutral-400">Lost Sales (Queue Balking)</div>
          <div className="text-xl font-semibold font-mono text-rose-400 mt-0.5">
            -₩{simState.cumBalkedLossKRW.toLocaleString()}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            {simState.cumBalked.toLocaleString()} walked away
          </div>
        </div>
      </div>

      {/* Spillover Warning */}
      {simState.isSpilling && (
        <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/60 flex items-start gap-2.5 text-rose-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
          <div>
            <div className="font-medium text-rose-200">Sidewalk Queue Spillover Detected</div>
            <div className="text-[11px] text-rose-300/80 mt-0.5">
              Queue exceeds physical sidewalk buffer. Consider increasing counter staff or accelerating service speed.
            </div>
          </div>
        </div>
      )}

      {/* 2. Structured Horizon Tabs */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
        {/* Segmented Control */}
        <div className="flex border-b border-neutral-800 p-1 bg-neutral-950/40">
          <button
            onClick={() => setActiveTab('funnel')}
            className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${
              activeTab === 'funnel'
                ? 'bg-neutral-800 text-white font-medium shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Live Funnel
          </button>
          <button
            onClick={() => setActiveTab('30d')}
            className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${
              activeTab === '30d'
                ? 'bg-neutral-800 text-white font-medium shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            30-Day Outlook
          </button>
          <button
            onClick={() => setActiveTab('365d')}
            className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${
              activeTab === '365d'
                ? 'bg-neutral-800 text-white font-medium shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Annual Viability
          </button>
        </div>

        {/* Tab 1: Live Foot-Traffic Conversion Funnel */}
        {activeTab === 'funnel' && (
          <div className="p-4 flex flex-col gap-3">
            <div className="text-xs font-medium text-neutral-300">
              Customer Journey & Conversion Flow
            </div>

            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-neutral-950/60 border border-neutral-800/80">
                <span className="text-neutral-400">1. Total Sidewalk Passersby</span>
                <span className="font-mono text-white font-medium">
                  {simState.cumPassers.toLocaleString()}
                </span>
              </div>

              {simState.cumFlyersTaken > 0 && (
                <div className="flex items-center justify-between p-2 rounded bg-neutral-950/60 border border-neutral-800/80">
                  <span className="text-neutral-400">2. Promotional Flyer Receivers</span>
                  <span className="font-mono text-sky-400 font-medium">
                    {simState.cumFlyersTaken.toLocaleString()}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between p-2 rounded bg-neutral-950/60 border border-neutral-800/80">
                <span className="text-neutral-400">
                  {simState.cumFlyersTaken > 0 ? '3.' : '2.'} Frontage Window & Sign Attention
                </span>
                <span className="font-mono text-white font-medium">
                  {simState.cumNoticed.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-neutral-950/60 border border-neutral-800/80">
                <span className="text-neutral-400">
                  {simState.cumFlyersTaken > 0 ? '4.' : '3.'} Completed Orders (Revenue Generated)
                </span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {simState.cumServed.toLocaleString()} (₩{simState.cumRevenueKRW.toLocaleString()})
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-rose-950/20 border border-rose-900/40">
                <span className="text-rose-300">Lost Sales (Long Queue Walkaways)</span>
                <span className="font-mono text-rose-400 font-medium">
                  {simState.cumBalked.toLocaleString()} (-₩{simState.cumBalkedLossKRW.toLocaleString()})
                </span>
              </div>
            </div>

            <div className="text-[11px] text-neutral-500 pt-2 border-t border-neutral-800">
              * Micro-simulation computes customer balking probability based on visible queue length and consumer time sensitivity.
            </div>
          </div>
        )}

        {/* Tab 2: 30-Day Projections */}
        {activeTab === '30d' && (
          <div className="p-4 flex flex-col gap-3">
            <div className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-800">
              <div className="text-[11px] text-neutral-400">30-Day Estimated Revenue</div>
              <div className="text-2xl font-semibold font-mono text-white mt-0.5">
                ₩{horizons.days30RevenueKRW.toLocaleString()}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                Estimated {horizons.days30Served.toLocaleString()} total customer orders
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-800">
                <div className="text-neutral-400 text-[11px]">Weekday Total (22 Days)</div>
                <div className="text-sm font-semibold font-mono text-white mt-1">
                  ₩{horizons.days30WeekdayRev.toLocaleString()}
                </div>
                <div className="text-[10px] text-neutral-500 mt-0.5">
                  Avg ₩{Math.round(horizons.days30WeekdayRev / 22).toLocaleString()}/day
                </div>
              </div>

              <div className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-800">
                <div className="text-neutral-400 text-[11px]">Weekend Total (8 Days)</div>
                <div className="text-sm font-semibold font-mono text-white mt-1">
                  ₩{horizons.days30WeekendRev.toLocaleString()}
                </div>
                <div className="text-[10px] text-neutral-500 mt-0.5">
                  Avg ₩{Math.round(horizons.days30WeekendRev / 8).toLocaleString()}/day
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Annual Viability & Break-Even Rent */}
        {activeTab === '365d' && (
          <div className="p-4 flex flex-col gap-3">
            <div className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-800">
              <div className="text-[11px] text-neutral-400">Annual Estimated Revenue</div>
              <div className="text-2xl font-semibold font-mono text-white mt-0.5">
                ₩{horizons.days365RevenueKRW.toLocaleString()}
              </div>
              <div className="text-[11px] text-neutral-500 mt-1">
                Sensitivity Range: ₩{horizons.days365Range[0].toLocaleString()} ~ ₩{horizons.days365Range[1].toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950/60 border border-neutral-800 flex flex-col gap-2 text-xs">
              <div className="font-medium text-neutral-300">Commercial Survival Thresholds</div>
              
              <div className="flex justify-between text-neutral-400">
                <span>Estimated Cost of Goods (COGS ~32%)</span>
                <span className="font-mono text-neutral-200">₩{horizons.cogsCostKRW.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-neutral-400">
                <span>Estimated Annual Labor</span>
                <span className="font-mono text-neutral-200">₩{(horizons.monthlyLaborCostKRW * 12).toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
                <span className="text-neutral-300 font-medium">Max Break-Even Monthly Rent</span>
                <span className="font-mono text-emerald-400 font-semibold text-sm">
                  ₩{horizons.breakEvenMonthlyRentKRW.toLocaleString()} /mo
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
