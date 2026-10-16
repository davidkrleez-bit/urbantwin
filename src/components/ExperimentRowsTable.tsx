import React, { useState } from 'react';
import { ExperimentRow, InterventionPatch, UserShopConfig } from '../types/simulation';
import {
  ArrowUpRight,
  Check,
  Eye,
  Loader2,
  Play,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

interface ExperimentRowsTableProps {
  rows: ExperimentRow[];
  activeRowId: string;
  onSelectRow: (rowId: string) => void;
  onAddCustomScenario: (prompt: string) => Promise<void>;
  onGenerate5Suggestions: () => Promise<void>;
  isLoadingSuggestions?: boolean;
}

export const ExperimentRowsTable: React.FC<ExperimentRowsTableProps> = ({
  rows,
  activeRowId,
  onSelectRow,
  onAddCustomScenario,
  onGenerate5Suggestions,
  isLoadingSuggestions = false,
}) => {
  const [customPrompt, setCustomPrompt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddCustomScenario(customPrompt);
      setCustomPrompt('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">
              Simulation Experiments & Interventions
            </h2>
            <span className="text-[11px] text-neutral-400 font-mono">
              ({rows.length} scenario{rows.length > 1 ? 's' : ''})
            </span>
          </div>
          <p className="text-xs text-neutral-400 mt-0.5">
            Each simulation compares operational levers against the baseline. Click any row to load into the 3D scene.
          </p>
        </div>

        {/* Suggest 5 Button */}
        <button
          onClick={onGenerate5Suggestions}
          disabled={isLoadingSuggestions}
          className="flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-white text-xs font-medium transition-colors border border-neutral-700 shrink-0 disabled:opacity-60 cursor-pointer"
        >
          {isLoadingSuggestions ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-400" />
              <span>Analyzing Catchment...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Generate 5 Suggested Simulations</span>
            </>
          )}
        </button>
      </div>

      {/* Freeform Scenario Input */}
      <form onSubmit={handleCustomSubmit} className="flex gap-2">
        <input
          type="text"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="Test any new idea (e.g., '20% discount on weekends', 'hire 2nd barista during lunch', 'mount storefront banner', 'lower price by 15%')"
          className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-neutral-600 rounded-lg px-3.5 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none transition-colors"
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting || !customPrompt.trim()}
          className="px-4 py-2 bg-white hover:bg-neutral-200 disabled:opacity-40 text-neutral-950 font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
        >
          {isSubmitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Plus className="w-3.5 h-3.5" />
          )}
          <span>Run Simulation</span>
        </button>
      </form>

      {/* The Experiments Table (Each simulation as a row on the page!) */}
      <div className="overflow-x-auto rounded-lg border border-neutral-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-950 text-neutral-400 border-b border-neutral-800">
            <tr>
              <th className="py-2.5 px-3.5 font-medium">Scenario & Hypothesis</th>
              <th className="py-2.5 px-3 font-medium">Category</th>
              <th className="py-2.5 px-3 font-medium text-right">Projected Daily Sales</th>
              <th className="py-2.5 px-3 font-medium text-right">Revenue Delta</th>
              <th className="py-2.5 px-3 font-medium text-right">Conversion</th>
              <th className="py-2.5 px-3 font-medium text-right">Wait Time</th>
              <th className="py-2.5 px-3.5 font-medium text-center">3D Scene</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/70 bg-neutral-900/60">
            {rows.map((row) => {
              const isActive = row.id === activeRowId;
              const isBaseline = row.category === 'baseline';

              return (
                <tr
                  key={row.id}
                  onClick={() => onSelectRow(row.id)}
                  className={`cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-neutral-800/80 text-white'
                      : 'hover:bg-neutral-800/40 text-neutral-300'
                  }`}
                >
                  {/* Scenario Info */}
                  <td className="py-3 px-3.5 max-w-[280px]">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isActive ? 'text-white' : 'text-neutral-200'}`}>
                        {row.name}
                      </span>
                      {isBaseline && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-400 font-mono">
                          BASELINE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-400 line-clamp-1 mt-0.5">
                      {row.description}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-3 text-neutral-400 capitalize">
                    {row.category}
                  </td>

                  {/* Projected Daily Revenue */}
                  <td className="py-3 px-3 text-right font-mono font-medium text-neutral-200">
                    ₩{row.dailyRevenueKRW.toLocaleString()}
                  </td>

                  {/* Revenue Delta vs Baseline */}
                  <td className="py-3 px-3 text-right font-mono font-medium">
                    {isBaseline ? (
                      <span className="text-neutral-500">—</span>
                    ) : row.revenueDeltaPct >= 0 ? (
                      <span className="text-emerald-400 flex items-center justify-end gap-0.5">
                        <TrendingUp className="w-3 h-3" />
                        <span>+{row.revenueDeltaPct.toFixed(1)}%</span>
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center justify-end gap-0.5">
                        <TrendingDown className="w-3 h-3" />
                        <span>{row.revenueDeltaPct.toFixed(1)}%</span>
                      </span>
                    )}
                  </td>

                  {/* Conversion */}
                  <td className="py-3 px-3 text-right font-mono text-neutral-300">
                    {row.conversionRatePct.toFixed(1)}%
                  </td>

                  {/* Wait Time */}
                  <td className="py-3 px-3 text-right font-mono text-neutral-300">
                    {row.avgWaitMin.toFixed(1)}m
                  </td>

                  {/* 3D Action */}
                  <td className="py-3 px-3.5 text-center">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-700 text-white font-medium text-[11px]">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRow(row.id);
                        }}
                        className="px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] transition-colors border border-neutral-700"
                      >
                        Load in 3D
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
