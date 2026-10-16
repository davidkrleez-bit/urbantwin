import React, { useState } from 'react';
import { HorizonSummary, InterventionPatch, UserShopConfig } from '../types/simulation';
import { RotateCcw, Send } from 'lucide-react';

interface WhatIfBarProps {
  currentPatch: InterventionPatch;
  onApplyPatch: (patch: InterventionPatch, descriptionEn: string) => void;
  onReset: () => void;
  baselineHorizon: HorizonSummary;
  variantHorizon: HorizonSummary;
  activeDescriptionKo: string;
  hasBannerUploaded: boolean;
  onRequestUploadBanner: () => void;
  userConfig: UserShopConfig;
}

interface QuickChip {
  id: string;
  labelEn: string;
  patch: InterventionPatch;
  descEn: string;
  requiresBanner?: boolean;
}

export const WhatIfBar: React.FC<WhatIfBarProps> = ({
  currentPatch,
  onApplyPatch,
  onReset,
  baselineHorizon,
  variantHorizon,
  activeDescriptionKo,
  hasBannerUploaded,
  onRequestUploadBanner,
  userConfig,
}) => {
  const [inputText, setInputText] = useState('');
  const [stackTogether, setStackTogether] = useState(false);
  const [isParsing, setIsParsing] = useState(false);

  const QUICK_CHIPS: QuickChip[] = [
    {
      id: 'price_down',
      labelEn: '-15% Price Reduction',
      patch: { price_factor: 0.85 },
      descEn: 'Reduced price by 15% to test purchase elasticity and order volume.',
    },
    {
      id: 'weekday_discount',
      labelEn: '20% Weekday Discount',
      patch: { weekday_discount: 0.2 },
      descEn: 'Applied 20% discount on Mon-Fri; weekend pricing remains unchanged.',
    },
    {
      id: 'blade_sign',
      labelEn: 'Sidewalk Blade Sign',
      patch: { sign_type: 'blade' },
      descEn: 'Added perpendicular blade sign to capture long-distance sidewalk sightlines.',
    },
    {
      id: 'standing_poster',
      labelEn: 'Sidewalk Poster Stand',
      patch: { sign_type: 'standing_poster' },
      descEn: 'Placed street-level poster board to display seasonal offers.',
    },
    {
      id: 'flyer_person',
      labelEn: 'Corner Promotional Staff',
      patch: { flyer_person: true },
      descEn: 'Stationed staff member at street corner distributing promotional vouchers.',
    },
    {
      id: 'extra_staff',
      labelEn: 'Add 2nd Service Staff',
      patch: { extra_servers: 1 },
      descEn: 'Added second server to cut service queue time and eliminate balking.',
    },
    {
      id: 'rain_awning',
      labelEn: 'Weather Protection Awning',
      patch: { awning: true },
      descEn: 'Added deep fabric awning to shelter pedestrians and maintain dwell time.',
    },
  ];

  const handleChipClick = (chip: QuickChip) => {
    if (chip.requiresBanner && !hasBannerUploaded) {
      onRequestUploadBanner();
      return;
    }

    const nextPatch = stackTogether
      ? { ...currentPatch, ...chip.patch }
      : { ...chip.patch };

    onApplyPatch(nextPatch, chip.descEn);
  };

  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    setIsParsing(true);
    try {
      const res = await fetch('/api/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: inputText,
          currentPatch,
          hasBannerUploaded,
          shopFamily: userConfig.family,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const nextPatch = stackTogether
          ? { ...currentPatch, ...(data.patch || {}) }
          : (data.patch || {});
        onApplyPatch(nextPatch, data.understood_en || data.understood_ko || `Scenario: ${inputText}`);
      } else {
        const lower = inputText.toLowerCase();
        let fallbackPatch: InterventionPatch = {};
        let desc = `Simulated scenario: ${inputText}`;

        if (lower.includes('price') || lower.includes('discount')) {
          fallbackPatch.price_factor = 0.85;
          desc = 'Simulated 15% price adjustment across products.';
        } else if (lower.includes('staff') || lower.includes('server')) {
          fallbackPatch.extra_servers = 1;
          desc = 'Added 1 additional server to accelerate order fulfillment.';
        } else if (lower.includes('poster') || lower.includes('sign')) {
          fallbackPatch.sign_type = 'standing_poster';
          desc = 'Installed high-visibility sidewalk poster.';
        }

        const nextPatch = stackTogether ? { ...currentPatch, ...fallbackPatch } : fallbackPatch;
        onApplyPatch(nextPatch, desc);
      }
    } catch {
      onApplyPatch(
        stackTogether ? { ...currentPatch, price_factor: 0.9 } : { price_factor: 0.9 },
        'Applied 10% price test scenario.'
      );
    } finally {
      setIsParsing(false);
      setInputText('');
    }
  };

  const diffWon = variantHorizon.days30RevenueKRW - baselineHorizon.days30RevenueKRW;
  const pctChange = baselineHorizon.days30RevenueKRW > 0
    ? (diffWon / baselineHorizon.days30RevenueKRW) * 100
    : 0;

  const hasActivePatch = Object.keys(currentPatch).length > 0;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-3">
      {/* Header and Reset */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white">
            Scenario Modeling
          </span>
          <span className="text-neutral-500">·</span>
          <span className="text-xs text-neutral-400">
            Simulate operational adjustments, signage, or pricing changes
          </span>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-neutral-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={stackTogether}
              onChange={(e) => setStackTogether(e.target.checked)}
              className="accent-neutral-300 rounded"
            />
            <span>Combine scenarios</span>
          </label>

          {hasActivePatch && (
            <button
              onClick={onReset}
              className="flex items-center gap-1 px-2.5 py-1 bg-neutral-800 hover:bg-neutral-750 text-neutral-300 rounded text-xs transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to Baseline</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Scenario Chips */}
      <div className="flex flex-wrap gap-1.5">
        {QUICK_CHIPS.map((chip) => {
          const isSelected =
            (chip.patch.price_factor && currentPatch.price_factor === chip.patch.price_factor) ||
            (chip.patch.weekday_discount && currentPatch.weekday_discount === chip.patch.weekday_discount) ||
            (chip.patch.sign_type && currentPatch.sign_type === chip.patch.sign_type) ||
            (chip.patch.flyer_person && currentPatch.flyer_person === chip.patch.flyer_person) ||
            (chip.patch.extra_servers && currentPatch.extra_servers === chip.patch.extra_servers) ||
            (chip.patch.awning && currentPatch.awning === chip.patch.awning);

          return (
            <button
              key={chip.id}
              onClick={() => handleChipClick(chip)}
              className={`px-2.5 py-1 text-xs rounded transition-colors ${
                isSelected
                  ? 'bg-neutral-800 text-white font-medium border border-neutral-700'
                  : 'bg-neutral-950/60 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800/80'
              }`}
            >
              {chip.labelEn}
            </button>
          );
        })}
      </div>

      {/* Freeform Prompt Input */}
      <form onSubmit={handleCustomSubmit} className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Test a custom hypothesis (e.g., 'What if we add a 2nd cashier during morning peak and lower espresso prices by 10%?')"
          className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-neutral-600 rounded px-3 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none transition-colors"
          disabled={isParsing}
        />
        <button
          type="submit"
          disabled={isParsing || !inputText.trim()}
          className="px-3.5 py-2 bg-neutral-800 hover:bg-neutral-750 disabled:opacity-50 text-white rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
        >
          <Send className="w-3 h-3" />
          <span>{isParsing ? 'Calculating...' : 'Apply'}</span>
        </button>
      </form>

      {/* Active Scenario Impact */}
      {hasActivePatch && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded bg-neutral-950/80 border border-neutral-800 text-xs">
          <div className="text-neutral-300">
            <span className="font-medium text-white">Active Scenario:</span>{' '}
            <span className="text-neutral-400">{activeDescriptionKo || 'Custom operational parameters active.'}</span>
          </div>

          <div className="shrink-0 text-right">
            <span className="text-neutral-500 text-[11px] mr-2">30-Day Projected Impact:</span>
            <span
              className={`font-mono font-medium ${
                diffWon >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {diffWon >= 0 ? '+' : ''}₩{diffWon.toLocaleString()} ({diffWon >= 0 ? '+' : ''}
              {pctChange.toFixed(1)}%)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
