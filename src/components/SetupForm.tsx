import React, { useState } from 'react';
import { PriceBand, ShopFamily, StaffingMode, UserShopConfig } from '../types/simulation';
import { FAMILY_CONFIGS, evaluatePriceJudgement } from '../lib/priceBands';
import {
  ArrowRight,
  Compass,
  Loader2,
  MapPin,
  Upload,
  Users,
} from 'lucide-react';

interface SetupFormProps {
  initialConfig: UserShopConfig;
  onSubmit: (config: UserShopConfig) => void;
  isLoading?: boolean;
}

export const SetupForm: React.FC<SetupFormProps> = ({
  initialConfig,
  onSubmit,
  isLoading = false,
}) => {
  const [config, setConfig] = useState<UserShopConfig>(initialConfig);
  const [addressInput, setAddressInput] = useState(initialConfig.address || '152 Teheran-ro, Gangnam, Seoul');
  const [shopNameInput, setShopNameInput] = useState(initialConfig.shopName || 'Blue Harbor Espresso Bar');
  const [conceptDetail, setConceptDetail] = useState(initialConfig.kind || 'Specialty Coffee & Espresso Bar');

  const currentFamilyCfg = FAMILY_CONFIGS[config.family];

  const handleFamilyChange = (fam: ShopFamily) => {
    const fCfg = FAMILY_CONFIGS[fam];
    const defaultKind = fCfg.kinds[0].labelEn || fCfg.kinds[0].labelKo;
    const defaultPrice = fCfg.bands.typical.mid;
    setConfig((prev) => ({
      ...prev,
      family: fam,
      kind: defaultKind,
      priceBand: 'typical',
      exactPriceKRW: defaultPrice,
      serviceSeconds: fCfg.defaultServiceSeconds,
    }));
    setConceptDetail(defaultKind);
  };

  const handleBandSelect = (band: PriceBand) => {
    const midPrice = currentFamilyCfg.bands[band].mid;
    setConfig((prev) => ({
      ...prev,
      priceBand: band,
      exactPriceKRW: midPrice,
    }));
  };

  const handleStaffingSelect = (mode: StaffingMode) => {
    let servers = 1;
    let sec = currentFamilyCfg.defaultServiceSeconds;
    if (mode === 'solo') {
      servers = 1;
      sec = Math.round(currentFamilyCfg.defaultServiceSeconds * 1.35);
    } else if (mode === 'duo') {
      servers = 2;
    } else {
      servers = 3;
    }

    setConfig((prev) => ({
      ...prev,
      staffingMode: mode,
      serversCount: servers,
      serviceSeconds: sec,
    }));
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setConfig((prev) => ({
        ...prev,
        bannerUrl: result,
        bannerFileName: file.name,
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...config,
      address: addressInput,
      shopName: shopNameInput,
      kind: conceptDetail,
    });
  };

  const priceJudgement = evaluatePriceJudgement(config.family, config.exactPriceKRW);

  const quickAddressSuggestions = [
    {
      name: 'Times Square, New York (High Density Tourism)',
      addr: 'Times Square, Manhattan, NY 10036, USA',
      fam: 'cafe' as ShopFamily,
      kind: 'Artisan Espresso & Grab-and-Go',
      price: 6500,
    },
    {
      name: 'Gangnam Teheran-ro (Corporate Corridor)',
      addr: '152 Teheran-ro, Gangnam-gu, Seoul',
      fam: 'cafe' as ShopFamily,
      kind: 'Specialty Espresso & Artisan Bakery',
      price: 4800,
    },
    {
      name: 'Champs-Élysées, Paris (Iconic Boulevard)',
      addr: '102 Av. des Champs-Élysées, 75008 Paris, France',
      fam: 'dessert' as ShopFamily,
      kind: 'French Patisserie & Specialty Coffee',
      price: 7500,
    },
    {
      name: 'Shibuya Crossing, Tokyo (Youth & Transit)',
      addr: '2-chome Shibuya, Shibuya City, Tokyo, Japan',
      fam: 'clothing' as ShopFamily,
      kind: 'Streetwear & Lifestyle Apparel',
      price: 32000,
    },
    {
      name: 'SoHo Broadway, New York (Fashion Boutique)',
      addr: '500 Broadway, New York, NY 10012, USA',
      fam: 'clothing' as ShopFamily,
      kind: 'Designer Apparel & Accessories',
      price: 45000,
    },
    {
      name: 'Seongsu Yeonmujang-gil (Youth Pop-up Corridor)',
      addr: '45 Yeonmujang-gil, Seongdong-gu, Seoul',
      fam: 'dessert' as ShopFamily,
      kind: 'Artisan Pastry & Dessert Boutique',
      price: 6800,
    },
  ];

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 max-w-3xl mx-auto w-full py-4">
      {/* Title */}
      <div className="flex flex-col gap-1.5 text-center">
        <h1 className="text-2xl font-semibold text-white tracking-tight">
          Storefront Location & Foot-Traffic Simulator
        </h1>
        <p className="text-xs text-neutral-400 max-w-lg mx-auto">
          Enter any global or local street address. Google Maps Platform reconstructs the real physical street view, surrounding venues, and simulates customer foot traffic in real time.
        </p>
      </div>

      {/* Step 1: Address Input */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col gap-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-neutral-800 text-neutral-300 flex items-center justify-center font-mono text-xs">
              1
            </span>
            <span className="text-xs font-medium text-white">Target Storefront Address</span>
          </div>
          <span className="text-[11px] text-neutral-400">Accepts any street or landmark worldwide</span>
        </div>

        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-4 h-4 text-rose-500" />
          <input
            type="text"
            required
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            placeholder="e.g. Times Square New York, or 152 Teheran-ro Seoul, or Champs-Élysées Paris..."
            className="w-full bg-neutral-950 border border-neutral-800 focus:border-neutral-600 rounded-lg pl-9 pr-3.5 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none transition-colors"
          />
        </div>

        {/* Quick Inspiration Addresses */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] text-neutral-500">Quick suggestions:</span>
          {quickAddressSuggestions.map((sug) => (
            <button
              key={sug.name}
              type="button"
              onClick={() => {
                setAddressInput(sug.addr);
                handleFamilyChange(sug.fam);
                setConceptDetail(sug.kind);
                setConfig((prev) => ({
                  ...prev,
                  exactPriceKRW: sug.price,
                }));
              }}
              className="px-2 py-1 rounded bg-neutral-950 hover:bg-neutral-800 border border-neutral-800/80 text-[11px] text-neutral-400 hover:text-white transition-colors cursor-pointer"
            >
              {sug.name.split(' (')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Step 2: Store Concept & Category */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col gap-3.5">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-neutral-800 text-neutral-300 flex items-center justify-center font-mono text-xs">
            2
          </span>
          <span className="text-xs font-medium text-white">Store Concept & Category</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Store Name</label>
            <input
              type="text"
              required
              value={shopNameInput}
              onChange={(e) => setShopNameInput(e.target.value)}
              placeholder="e.g. UrbanTwin Artisan Cafe"
              className="w-full bg-neutral-950 border border-neutral-800 focus:border-neutral-600 rounded-lg px-3 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs text-neutral-400 mb-1">Business Category</label>
            <div className="grid grid-cols-5 gap-1.5">
              {(['cafe', 'restaurant', 'clothing', 'popup', 'other'] as ShopFamily[]).map((fam) => {
                const isSelected = config.family === fam;
                const labels: Record<ShopFamily, string> = {
                  cafe: 'Cafe',
                  restaurant: 'Dining',
                  clothing: 'Apparel',
                  popup: 'Popup',
                  other: 'Retail',
                };
                return (
                  <button
                    key={fam}
                    type="button"
                    onClick={() => handleFamilyChange(fam)}
                    className={`py-2 text-xs rounded transition-colors ${
                      isSelected
                        ? 'bg-neutral-800 text-white font-medium border border-neutral-700'
                        : 'bg-neutral-950/60 hover:bg-neutral-850 text-neutral-400 border border-neutral-800/80'
                    }`}
                  >
                    {labels[fam]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs text-neutral-400 mb-1">Specific Sub-Concept</label>
          <div className="flex flex-wrap gap-1.5">
            {currentFamilyCfg.kinds.map((k) => {
              const label = k.labelEn || k.labelKo;
              const isSelected = conceptDetail === label;
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => {
                    setConceptDetail(label);
                    setConfig((prev) => ({ ...prev, kind: label }));
                  }}
                  className={`px-2.5 py-1 text-xs rounded transition-colors ${
                    isSelected
                      ? 'bg-neutral-800 text-white font-medium border border-neutral-700'
                      : 'bg-neutral-950/60 hover:bg-neutral-850 text-neutral-400 border border-neutral-800/80'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step 3: Pricing & Staffing */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col gap-3.5">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded bg-neutral-800 text-neutral-300 flex items-center justify-center font-mono text-xs">
            3
          </span>
          <span className="text-xs font-medium text-white">Pricing & Counter Staffing</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Price */}
          <div>
            <div className="flex items-center justify-between mb-1 text-xs">
              <span className="text-neutral-400">Target Ticket Price</span>
              <span className="font-mono text-white font-medium">
                ₩{config.exactPriceKRW.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={currentFamilyCfg.bands.budget.min}
              max={currentFamilyCfg.bands.luxury.max}
              step={100}
              value={config.exactPriceKRW}
              onChange={(e) => {
                const val = Number(e.target.value);
                setConfig((prev) => ({ ...prev, exactPriceKRW: val }));
              }}
              className="w-full accent-neutral-300 h-1 bg-neutral-800 rounded cursor-pointer mt-1"
            />
            <div className="text-[11px] text-neutral-500 mt-1">
              Position: <strong className="text-neutral-300 font-normal">{priceJudgement.categoryLabelEn}</strong> ({priceJudgement.areaComparisonEn})
            </div>
          </div>

          {/* Staffing */}
          <div>
            <label className="block text-xs text-neutral-400 mb-1">Counter Staffing Model</label>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { mode: 'solo' as StaffingMode, label: 'Solo (1 Staff)' },
                { mode: 'duo' as StaffingMode, label: 'Standard (2 Staff)' },
                { mode: 'full' as StaffingMode, label: 'Full Team (3+ Staff)' },
              ].map((st) => {
                const isSelected = config.staffingMode === st.mode;
                return (
                  <button
                    key={st.mode}
                    type="button"
                    onClick={() => handleStaffingSelect(st.mode)}
                    className={`py-2 text-xs rounded transition-colors ${
                      isSelected
                        ? 'bg-neutral-800 text-white font-medium border border-neutral-700'
                        : 'bg-neutral-950/60 hover:bg-neutral-850 text-neutral-400 border border-neutral-800/80'
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-5 rounded-lg bg-white hover:bg-neutral-200 text-neutral-950 font-medium text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Analyzing catchment and running micro-simulation...</span>
          </>
        ) : (
          <>
            <span>Launch Simulation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </>
        )}
      </button>
    </form>
  );
};
