import React from 'react';
import {
  DistrictInfo,
  ExperimentRow,
  InterventionPatch,
  NeighborShop,
  SceneGraph,
  StepSimulationState,
  UserShopConfig,
} from '../types/simulation';
import { SimulationRowVisualizer } from './SimulationRowVisualizer';
import {
  ArrowUpRight,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
} from 'lucide-react';

interface SimulationRowCardProps {
  row: ExperimentRow;
  simState: StepSimulationState;
  userConfig: UserShopConfig;
  sceneGraph: SceneGraph;
  neighbors?: NeighborShop[];
  districtInfo?: DistrictInfo;
  onDeleteRow?: (id: string) => void;
  onOpen3DModal?: (row: ExperimentRow) => void;
}

export const SimulationRowCard: React.FC<SimulationRowCardProps> = ({
  row,
  simState,
  userConfig,
  sceneGraph,
  neighbors = [],
  districtInfo,
  onDeleteRow,
  onOpen3DModal,
}) => {
  const isBaseline = row.category === 'baseline';
  const isBest = row.isBest;

  // Active intervention tags
  const tags: string[] = [];
  if (row.patch.price_factor && row.patch.price_factor !== 1.0) {
    const pct = Math.round((row.patch.price_factor - 1.0) * 100);
    tags.push(`Price: ${pct > 0 ? `+${pct}%` : `${pct}%`}`);
  }
  if (row.patch.weekday_discount) {
    tags.push(`${Math.round(row.patch.weekday_discount * 100)}% Weekday Discount`);
  }
  if (row.patch.extra_servers) {
    tags.push(`+${row.patch.extra_servers} Extra Server(s)`);
  }
  if (row.patch.sign_type) {
    tags.push(`Sign: ${row.patch.sign_type.replace(/_/g, ' ')}`);
  }
  if (row.patch.use_user_banner) {
    tags.push('Outdoor Banner Stand');
  }
  if (row.patch.awning) {
    tags.push('Weather Awning');
  }
  if (row.patch.flyer_person) {
    tags.push('Corner Flyer Promoter');
  }

  // Verdict calculation
  let verdictCopy = '';
  if (isBaseline) {
    verdictCopy = 'Reference baseline standardizing your proposed menu pricing and current staffing model.';
  } else if (isBest) {
    verdictCopy = `🏆 Best performing simulation: Drives +₩${Math.round(row.dailyRevenueKRW - (row.dailyRevenueKRW / (1 + row.revenueDeltaPct / 100))).toLocaleString()}/day higher revenue (+${row.revenueDeltaPct.toFixed(1)}%) with strong customer conversion.`;
  } else if (row.revenueDeltaPct > 0) {
    verdictCopy = `Positive uplift generating +${row.revenueDeltaPct.toFixed(1)}% revenue, though wait time averages ${row.avgWaitMin.toFixed(1)}m.`;
  } else {
    verdictCopy = `Generates lower daily sales (${row.revenueDeltaPct.toFixed(1)}%) due to price concession or insufficient throughput gains.`;
  }

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden shadow-sm ${
        isBest
          ? 'bg-neutral-900/90 border-emerald-500/70 shadow-emerald-950/20 shadow-md ring-1 ring-emerald-500/30'
          : isBaseline
          ? 'bg-neutral-900 border-neutral-800'
          : 'bg-neutral-900 border-neutral-800/90'
      }`}
    >
      {/* Row Header: Rank Badge, Title, Category, Intervention Tags */}
      <div className="p-3.5 sm:p-4 border-b border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Rank Badge */}
          {isBest ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[11px] font-semibold tracking-wide uppercase">
              <Award className="w-3.5 h-3.5" />
              <span>Rank #1 · Best Simulation</span>
            </span>
          ) : isBaseline ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 border border-neutral-700 text-[11px] font-mono">
              BASELINE
            </span>
          ) : row.rank ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 border border-neutral-700 text-[11px] font-mono">
              RANK #{row.rank}
            </span>
          ) : null}

          {/* Simulation Title */}
          <h3 className="text-sm font-semibold text-white tracking-tight">
            {row.name}
          </h3>

          {/* Category Tag */}
          <span className="text-[11px] px-2 py-0.5 rounded bg-neutral-950/80 text-neutral-400 border border-neutral-800 uppercase tracking-wider font-mono">
            {row.category}
          </span>
        </div>

        {/* Right Header: Tags & Delete */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-2 py-0.5 rounded bg-neutral-950 text-neutral-300 border border-neutral-800"
              >
                {tag}
              </span>
            ))}
          </div>

          {!isBaseline && onDeleteRow && (
            <button
              onClick={() => onDeleteRow(row.id)}
              className="p-1.5 rounded hover:bg-neutral-800 text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer ml-1"
              title="Delete this simulation row"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Row Body: 2 Columns (Left: Live Visual Simulation Canvas, Right: Performance Metrics) */}
      <div className="p-3.5 sm:p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Left Column (5 cols): Live Micro-Simulation of THIS specific scenario */}
        <div className="lg:col-span-5 flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-xs text-neutral-400 mb-0.5">
            <span className="font-medium text-neutral-300">Live Micro-Simulation</span>
            <span className="text-[11px] text-neutral-500">Curved Streetflow & Storefront</span>
          </div>

          <SimulationRowVisualizer
            patch={row.patch}
            simState={simState}
            userConfig={userConfig}
            sceneGraph={sceneGraph}
            neighbors={neighbors}
            districtInfo={districtInfo}
            onOpen3DModal={onOpen3DModal ? () => onOpen3DModal(row) : undefined}
          />
        </div>

        {/* Right Column (7 cols): Performance Metrics & Comparative Delta Grid */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Metric 1: Projected Daily Revenue */}
            <div className="p-2.5 rounded-lg bg-neutral-950/70 border border-neutral-800/80">
              <div className="text-[11px] text-neutral-400">Daily Projected Sales</div>
              <div className="text-base font-semibold font-mono text-white mt-0.5">
                ₩{row.dailyRevenueKRW.toLocaleString()}
              </div>
              <div className="mt-1">
                {isBaseline ? (
                  <span className="text-[10px] text-neutral-500 font-mono">Reference Base</span>
                ) : row.revenueDeltaPct >= 0 ? (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-mono text-emerald-400 font-medium">
                    <TrendingUp className="w-3 h-3" />
                    <span>+{row.revenueDeltaPct.toFixed(1)}%</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-mono text-rose-400 font-medium">
                    <TrendingDown className="w-3 h-3" />
                    <span>{row.revenueDeltaPct.toFixed(1)}%</span>
                  </span>
                )}
              </div>
            </div>

            {/* Metric 2: Customers Served */}
            <div className="p-2.5 rounded-lg bg-neutral-950/70 border border-neutral-800/80">
              <div className="text-[11px] text-neutral-400">Customers Served</div>
              <div className="text-base font-semibold font-mono text-white mt-0.5">
                {row.dailyServed.toLocaleString()}
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">
                ~{Math.round(row.dailyServed / 12)} buyers / hr
              </div>
            </div>

            {/* Metric 3: Conversion Rate */}
            <div className="p-2.5 rounded-lg bg-neutral-950/70 border border-neutral-800/80">
              <div className="text-[11px] text-neutral-400">Sidewalk Conversion</div>
              <div className="text-base font-semibold font-mono text-neutral-200 mt-0.5">
                {row.conversionRatePct.toFixed(1)}%
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">
                of passersby purchase
              </div>
            </div>

            {/* Metric 4: Average Wait Time */}
            <div className="p-2.5 rounded-lg bg-neutral-950/70 border border-neutral-800/80">
              <div className="text-[11px] text-neutral-400">Avg Customer Wait</div>
              <div className={`text-base font-semibold font-mono mt-0.5 ${
                row.avgWaitMin > 3.5 ? 'text-amber-400' : 'text-neutral-200'
              }`}>
                {row.avgWaitMin.toFixed(1)}m
              </div>
              <div className="text-[10px] text-neutral-400 mt-1">
                {row.balkedCustomers > 0 ? `${row.balkedCustomers} walkaways` : '0 walkaways'}
              </div>
            </div>
          </div>

          {/* Verdict Box */}
          <div className={`p-2.5 rounded-lg text-xs flex items-center justify-between gap-2 border ${
            isBest
              ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-200'
              : 'bg-neutral-950/50 border-neutral-800/80 text-neutral-300'
          }`}>
            <span className="leading-relaxed">{verdictCopy}</span>
            {isBest && (
              <span className="shrink-0 text-[10px] px-2 py-0.5 rounded bg-emerald-500 text-neutral-950 font-bold uppercase tracking-wider">
                Recommended
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
