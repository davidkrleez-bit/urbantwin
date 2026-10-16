import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  DistrictInfo,
  ExperimentRow,
  InterventionPatch,
  NeighborShop,
  PresetLocation,
  SceneGraph,
  ShopFamily,
  StaffingMode,
  StepSimulationState,
  UserShopConfig,
} from './types/simulation';
import { SEOUL_PRESETS } from './lib/districts';
import {
  simulateFullDay,
  simulateHorizons,
} from './lib/sim/engine';
import { SetupForm } from './components/SetupForm';
import { StreetReconView } from './components/StreetReconView';
import { StreetScene } from './components/StreetScene';
import { SimulationRowCard } from './components/SimulationRowCard';
import { SimulationLeaderboard } from './components/SimulationLeaderboard';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Compass,
  Layers,
  Loader2,
  MapPin,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';

export default function App() {
  // 3 Distinct Steps: 'setup' -> 'recon' -> 'simulation'
  const [step, setStep] = useState<'setup' | 'recon' | 'simulation'>('setup');
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [analysisStep, setAnalysisStep] = useState<string>('');

  // User shop configuration
  const [userConfig, setUserConfig] = useState<UserShopConfig>({
    address: 'Times Square, Manhattan, NY 10036, USA',
    shopName: 'UrbanTwin Espresso & Bakery',
    family: 'cafe',
    kind: 'Artisan Espresso & Grab-and-Go',
    priceBand: 'typical',
    exactPriceKRW: 6500,
    staffingMode: 'solo',
    serversCount: 1,
    openHour: 8,
    closeHour: 20,
    serviceSeconds: 220,
    operatingNote: 'Rapid grab-and-go morning service targeting commute and tourism flow.',
  });

  // Dynamic location resolved from Google Maps Geocoding & Places
  const [resolvedLocation, setResolvedLocation] = useState<PresetLocation>({
    ...SEOUL_PRESETS[1],
    stillSvg: '/api/streetview-image?lat=40.7580&lng=-73.9855',
    staticMapUrl: '/api/static-map?lat=40.7580&lng=-73.9855',
  });

  // Simulation Rows state (Each simulation is its own row on the page!)
  const [experimentRows, setExperimentRows] = useState<ExperimentRow[]>([]);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isAddingScenario, setIsAddingScenario] = useState<boolean>(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);

  // Active 3D Modal inspection
  const [modal3DRow, setModal3DRow] = useState<ExperimentRow | null>(null);

  // Clock & playback state (Synchronizes all simulation rows)
  const [currentMinute, setCurrentMinute] = useState<number>(510); // 08:30 by default
  const [currentDow, setCurrentDow] = useState<number>(1); // Monday
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  // Address analysis handler
  const handleAnalyzeAddress = async (config: UserShopConfig) => {
    setUserConfig(config);
    setIsAnalyzing(true);
    setAnalysisStep('Geocoding street address with Google Maps API...');

    try {
      const stepTimer1 = setTimeout(() => {
        setAnalysisStep('Fetching authentic Google Street View panorama & nearby places...');
      }, 500);

      const stepTimer2 = setTimeout(() => {
        setAnalysisStep('Synthesizing pedestrian catchment dynamics & building geometry...');
      }, 1000);

      const res = await fetch('/api/resolve-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: config.address,
          shopFamily: config.family,
          shopKind: config.kind,
          exactPriceKRW: config.exactPriceKRW,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (res.ok) {
        const data = await res.json();
        const customLocation: PresetLocation = {
          id: 'loc-' + Date.now(),
          nameKo: data.districtInfo.district_name_ko,
          nameEn: data.districtInfo.district_name_en,
          address: data.address,
          lat: data.lat || 40.7580,
          lng: data.lng || -73.9855,
          districtClass: data.districtInfo.district_class,
          stillSvg: data.stillSvg || `/api/streetview-image?lat=${data.lat}&lng=${data.lng}&address=${encodeURIComponent(data.address)}`,
          staticMapUrl: data.staticMapUrl || `/api/static-map?lat=${data.lat}&lng=${data.lng}`,
          sceneGraph: data.sceneGraph || SEOUL_PRESETS[1].sceneGraph,
          districtInfo: data.districtInfo,
          neighbors: data.neighbors || SEOUL_PRESETS[1].neighbors,
          anchors: data.anchors || SEOUL_PRESETS[1].anchors,
        };

        setResolvedLocation(customLocation);
      } else {
        const fallback = SEOUL_PRESETS.find((p) =>
          config.address.toLowerCase().includes(p.nameEn.toLowerCase().split(' ')[0])
        ) || SEOUL_PRESETS[0];
        setResolvedLocation({
          ...fallback,
          stillSvg: `/api/streetview-image?lat=${fallback.lat}&lng=${fallback.lng}`,
          staticMapUrl: `/api/static-map?lat=${fallback.lat}&lng=${fallback.lng}`,
        });
      }
    } catch (err) {
      console.error('Address analysis error:', err);
    } finally {
      setIsAnalyzing(false);
      setExperimentRows([]);
      setStep('recon'); // Step 2: Show Street View photo & reconstructed street specs

      if (config.family === 'cafe' || config.address.toLowerCase().includes('gangnam') || config.address.toLowerCase().includes('manhattan')) {
        setCurrentMinute(510); // 08:30
        setCurrentDow(1); // Monday
      } else {
        setCurrentMinute(930); // 15:30
        setCurrentDow(6); // Saturday
      }
    }
  };

  // Full-Day Simulation Engine Runs for Baseline
  const baselineFullDay = useMemo(() => {
    return simulateFullDay(
      currentDow,
      userConfig,
      {},
      resolvedLocation.sceneGraph,
      resolvedLocation.districtInfo,
      resolvedLocation.anchors,
      resolvedLocation.neighbors
    );
  }, [currentDow, userConfig, resolvedLocation]);

  // Current minute step state
  const currentStepState: StepSimulationState = useMemo(() => {
    return (
      baselineFullDay.minuteStates[currentMinute] || {
        minute: currentMinute,
        clockString: `${String(Math.floor(currentMinute / 60)).padStart(2, '0')}:${String(
          currentMinute % 60
        ).padStart(2, '0')}`,
        hour: Math.floor(currentMinute / 60),
        dow: currentDow,
        isWeekend: currentDow === 0 || currentDow === 6,
        activeArchetype: 'commuter',
        currentPassPerMin: 22,
        queueLength: 0,
        waitMinutes: 0,
        serversBusy: 0,
        effectiveServers: 1,
        isSpilling: false,
        regime: 'classic_balk',
        regimeCopy: '운영 중',
        regimeCopyEn: 'Store Open for Service',
        timeInsightEn: 'Active business operations.',
        minutePassers: 22,
        minuteFlyersTaken: 0,
        minuteNoticed: 4,
        minuteIntended: 2,
        minuteJoined: 2,
        minuteBalked: 0,
        minuteReneged: 0,
        minuteServed: 2,
        minuteRevenueKRW: 9600,
        cumPassers: 1200,
        cumFlyersTaken: 0,
        cumNoticed: 340,
        cumIntended: 120,
        cumJoined: 110,
        cumServed: 105,
        cumBalked: 5,
        cumReneged: 0,
        cumRevenueKRW: 504000,
        cumBalkedLossKRW: 24000,
        peakQueue: 4,
        spillMinutes: 0,
      }
    );
  }, [baselineFullDay, currentMinute, currentDow]);

  // Construct Base Experiment Row
  const baselineRow: ExperimentRow = useMemo(() => {
    const dailyRev = baselineFullDay.projection.totalRevenueKRW;
    const dailyServed = baselineFullDay.projection.totalServed;
    const totalPass = baselineFullDay.projection.totalPassers || 24000;
    const convRate = totalPass > 0 ? (dailyServed / totalPass) * 100 : 0;
    const avgWait = baselineFullDay.projection.peakQueue * 0.45;

    return {
      id: 'baseline',
      name: 'Baseline Storefront (Standard Hours & Pricing)',
      category: 'baseline',
      description: 'Reference operational model with proposed base menu pricing and standard solo staffing.',
      patch: {},
      dailyRevenueKRW: dailyRev,
      revenueDeltaPct: 0,
      dailyServed: dailyServed,
      conversionRatePct: parseFloat(convRate.toFixed(1)),
      avgWaitMin: parseFloat(avgWait.toFixed(1)),
      balkedCustomers: baselineFullDay.projection.totalBalked,
      activeIn3D: false,
    };
  }, [baselineFullDay]);

  // Helper to calculate simulation metrics for a patch
  const calculateRowForPatch = useCallback((
    id: string,
    name: string,
    category: any,
    description: string,
    patch: InterventionPatch
  ): ExperimentRow => {
    const sim = simulateFullDay(
      currentDow,
      userConfig,
      patch,
      resolvedLocation.sceneGraph,
      resolvedLocation.districtInfo,
      resolvedLocation.anchors,
      resolvedLocation.neighbors
    );

    const baseRev = baselineFullDay.projection.totalRevenueKRW;
    const scenRev = sim.projection.totalRevenueKRW;
    const deltaPct = baseRev > 0 ? ((scenRev - baseRev) / baseRev) * 100 : 0;
    const totalPass = sim.projection.totalPassers || 24000;
    const convRate = totalPass > 0 ? (sim.projection.totalServed / totalPass) * 100 : 0;
    const avgWait = sim.projection.peakQueue * 0.45;

    return {
      id,
      name,
      category,
      description,
      patch,
      dailyRevenueKRW: scenRev,
      revenueDeltaPct: parseFloat(deltaPct.toFixed(1)),
      dailyServed: sim.projection.totalServed,
      conversionRatePct: parseFloat(convRate.toFixed(1)),
      avgWaitMin: parseFloat(avgWait.toFixed(1)),
      balkedCustomers: sim.projection.totalBalked,
      activeIn3D: false,
    };
  }, [currentDow, userConfig, resolvedLocation, baselineFullDay]);

  // Combined Rows: Baseline + Scenarios
  const allRows: ExperimentRow[] = useMemo(() => {
    return [baselineRow, ...experimentRows];
  }, [baselineRow, experimentRows]);

  // Ranked Rows: Answers "Which simulation is best?"
  const rankedRows: ExperimentRow[] = useMemo(() => {
    const sorted = [...allRows].sort((a, b) => b.dailyRevenueKRW - a.dailyRevenueKRW);
    const bestId = sorted[0]?.id;

    return allRows.map((row) => {
      const rankIdx = sorted.findIndex((r) => r.id === row.id);
      return {
        ...row,
        rank: rankIdx + 1,
        isBest: row.id === bestId && row.dailyRevenueKRW > baselineRow.dailyRevenueKRW,
      };
    });
  }, [allRows, baselineRow]);

  // Add custom scenario from user prompt (creates a new row!)
  const handleAddCustomScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim() || isAddingScenario) return;

    setIsAddingScenario(true);
    try {
      const res = await fetch('/api/what-if', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: customPrompt,
          currentPatch: {},
          hasBannerUploaded: !!userConfig.bannerUrl,
          shopFamily: userConfig.family,
        }),
      });

      let patch: InterventionPatch = {};
      let desc = customPrompt;

      if (res.ok) {
        const data = await res.json();
        patch = data.patch || {};
        desc = data.understood_en || data.understood_ko || customPrompt;
      } else {
        const lower = customPrompt.toLowerCase();
        if (lower.includes('discount') || lower.includes('price')) {
          patch = { price_factor: 0.85 };
        } else if (lower.includes('staff') || lower.includes('barista') || lower.includes('server')) {
          patch = { extra_servers: 1 };
        } else if (lower.includes('banner') || lower.includes('sign')) {
          patch = { sign_type: 'blade', use_user_banner: true };
        } else if (lower.includes('weekend')) {
          patch = { weekday_discount: 0, price_factor: 0.80 };
        }
      }

      const newId = `scen-${Date.now()}`;
      const newRow = calculateRowForPatch(
        newId,
        customPrompt.slice(0, 48),
        'operations',
        desc,
        patch
      );

      setExperimentRows((prev) => [newRow, ...prev]);
      setCustomPrompt('');
    } catch (err) {
      console.error('Error adding custom scenario:', err);
    } finally {
      setIsAddingScenario(false);
    }
  };

  // Delete a scenario row
  const handleDeleteRow = (id: string) => {
    setExperimentRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Generate 5 Suggested Simulations
  const handleGenerate5Suggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const res = await fetch('/api/suggest-scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: userConfig.address,
          shopFamily: userConfig.family,
          shopKind: userConfig.kind,
          exactPriceKRW: userConfig.exactPriceKRW,
          districtInfo: resolvedLocation.districtInfo,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.scenarios)) {
          const rows: ExperimentRow[] = data.scenarios.map((scen: any) =>
            calculateRowForPatch(
              scen.id || `scen-${Math.random()}`,
              scen.name,
              scen.category || 'operations',
              scen.description,
              scen.patch || {}
            )
          );
          setExperimentRows(rows);
        }
      }
    } catch (err) {
      console.error('Error generating 5 suggestions:', err);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Clock animation ticker
  useEffect(() => {
    if (!isPlaying || step !== 'simulation') return;

    const interval = setInterval(() => {
      setCurrentMinute((prev) => {
        const next = prev + 1;
        return next >= 1440 ? 0 : next;
      });
    }, 450);

    return () => clearInterval(interval);
  }, [isPlaying, step]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans antialiased selection:bg-neutral-800 selection:text-white">
      {/* 1. Sleek Minimal Header */}
      <header className="border-b border-neutral-800 bg-neutral-950 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-medium text-sm tracking-tight text-white">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>UrbanTwin</span>
          </div>
          <span className="text-neutral-700">/</span>
          <span className="text-xs text-neutral-400">
            {step === 'setup'
              ? 'Step 1 · Address & Store Setup'
              : step === 'recon'
              ? 'Step 2 · Street Reconnaissance'
              : 'Step 3 · Simulation Experiments Studio'}
          </span>
        </div>

        {/* Right Header: Active Location or Change Action */}
        <div className="flex items-center gap-2.5">
          {step === 'simulation' && (
            <div className="hidden lg:flex items-center gap-2 text-xs text-neutral-400 mr-2">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-white font-medium truncate max-w-[240px]">
                {userConfig.address}
              </span>
              <span className="text-neutral-600">·</span>
              <span className="font-mono text-neutral-300">₩{userConfig.exactPriceKRW.toLocaleString()}</span>
            </div>
          )}

          {step !== 'setup' && (
            <button
              onClick={() => setStep('setup')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-750 text-neutral-200 rounded-lg text-xs font-medium transition-colors border border-neutral-700 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-neutral-400" />
              <span>New Address</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Main Step Workspace */}
      <main className="flex-1 max-w-[1480px] w-full mx-auto p-4 sm:p-5 flex flex-col gap-5">
        {/* STEP 1: Address Input & Store Concept (Clean, isolated, easy) */}
        {step === 'setup' && (
          <div className="py-2">
            <SetupForm
              initialConfig={userConfig}
              onSubmit={handleAnalyzeAddress}
              isLoading={isAnalyzing}
            />

            {/* Analysis Loading Overlay */}
            {isAnalyzing && (
              <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 max-w-sm w-full shadow-lg flex flex-col items-center text-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-neutral-300" />
                  <div>
                    <h3 className="text-sm font-medium text-white">Reconstructing Location</h3>
                    <p className="text-xs text-neutral-400 mt-1">{analysisStep}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Physical Street View & Geometry Reconnaissance */}
        {step === 'recon' && (
          <StreetReconView
            location={resolvedLocation}
            userConfig={userConfig}
            onProceedToSimulation={() => setStep('simulation')}
            onBackToAddress={() => setStep('setup')}
          />
        )}

        {/* STEP 3: Multi-Row Simulation Studio (Each simulation is its own row on the page!) */}
        {step === 'simulation' && (
          <div className="flex flex-col gap-5 animate-in fade-in duration-200">
            {/* Top Minimal Location Indicator */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="font-medium text-white">{userConfig.address}</span>
                <span className="text-neutral-600">·</span>
                <span className="text-neutral-400">
                  {resolvedLocation.districtInfo.district_name_en} (~{(resolvedLocation.districtInfo.daily_passers_estimate || 24000).toLocaleString()} passers/day)
                </span>
              </div>

              <div className="flex items-center gap-3 text-neutral-400">
                <span>Shop: <strong className="text-white font-medium">{userConfig.shopName}</strong></span>
                <span className="text-neutral-600">·</span>
                <span>Active Simulations: <strong className="text-emerald-400 font-mono">{rankedRows.length}</strong></span>
              </div>
            </div>

            {/* Unified Synchronized Time-of-Day Bar (Controls all rows simultaneously) */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 sm:p-4 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-750 flex items-center justify-center text-white transition-colors cursor-pointer"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-semibold text-white tracking-tight">
                      {currentStepState.clockString}
                    </span>
                    <span className="text-xs text-neutral-400">
                      {currentStepState.isWeekend ? 'Weekend' : 'Weekday'}
                    </span>
                  </div>
                </div>

                {/* Time Presets */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    onClick={() => setCurrentMinute(510)}
                    className={`px-2.5 py-1 rounded transition-colors text-xs cursor-pointer ${
                      Math.abs(currentMinute - 510) < 45
                        ? 'bg-neutral-800 text-white font-medium border border-neutral-700'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Morning (08:30)
                  </button>
                  <button
                    onClick={() => setCurrentMinute(750)}
                    className={`px-2.5 py-1 rounded transition-colors text-xs cursor-pointer ${
                      Math.abs(currentMinute - 750) < 45
                        ? 'bg-neutral-800 text-white font-medium border border-neutral-700'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Lunch (12:30)
                  </button>
                  <button
                    onClick={() => setCurrentMinute(930)}
                    className={`px-2.5 py-1 rounded transition-colors text-xs cursor-pointer ${
                      Math.abs(currentMinute - 930) < 45
                        ? 'bg-neutral-800 text-white font-medium border border-neutral-700'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Afternoon (15:30)
                  </button>
                  <button
                    onClick={() => setCurrentMinute(1110)}
                    className={`px-2.5 py-1 rounded transition-colors text-xs cursor-pointer ${
                      Math.abs(currentMinute - 1110) < 45
                        ? 'bg-neutral-800 text-white font-medium border border-neutral-700'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Evening (18:30)
                  </button>
                  <button
                    onClick={() => setCurrentMinute(1260)}
                    className={`px-2.5 py-1 rounded transition-colors text-xs cursor-pointer ${
                      Math.abs(currentMinute - 1260) < 45
                        ? 'bg-neutral-800 text-white font-medium border border-neutral-700'
                        : 'text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    Night (21:00)
                  </button>

                  <div className="flex items-center bg-neutral-950 p-0.5 rounded border border-neutral-800 ml-1">
                    <button
                      onClick={() => setCurrentDow(1)}
                      className={`px-2 py-0.5 text-xs rounded transition-colors cursor-pointer ${
                        !currentStepState.isWeekend ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      Weekday
                    </button>
                    <button
                      onClick={() => setCurrentDow(6)}
                      className={`px-2 py-0.5 text-xs rounded transition-colors cursor-pointer ${
                        currentStepState.isWeekend ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      Weekend
                    </button>
                  </div>
                </div>
              </div>

              {/* Time Slider */}
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-neutral-500 shrink-0">00:00</span>
                <input
                  type="range"
                  min="0"
                  max="1439"
                  step="5"
                  value={currentMinute}
                  onChange={(e) => setCurrentMinute(parseInt(e.target.value, 10))}
                  className="w-full accent-neutral-300 h-1 bg-neutral-800 rounded cursor-pointer"
                />
                <span className="text-[11px] font-mono text-neutral-500 shrink-0">23:59</span>
              </div>
            </div>

            {/* TOP COMPARISON LEADERBOARD: Answers "Which simulation is best?" */}
            <SimulationLeaderboard rows={rankedRows} />

            {/* Add New Simulation Row & Suggest 5 */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <form onSubmit={handleAddCustomScenario} className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Test any new idea (e.g. '20% discount on weekends', 'add 2nd barista during lunch', 'mount storefront banner')"
                  className="flex-1 bg-neutral-950 border border-neutral-800 focus:border-neutral-600 rounded-lg px-3.5 py-2 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none transition-colors"
                  disabled={isAddingScenario}
                />
                <button
                  type="submit"
                  disabled={isAddingScenario || !customPrompt.trim()}
                  className="px-4 py-2 bg-white hover:bg-neutral-200 disabled:opacity-40 text-neutral-950 font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-sm"
                >
                  {isAddingScenario ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Run Simulation</span>
                </button>
              </form>

              <button
                onClick={handleGenerate5Suggestions}
                disabled={isLoadingSuggestions}
                className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-750 text-white text-xs font-medium transition-colors border border-neutral-700 shrink-0 disabled:opacity-60 cursor-pointer"
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

            {/* THE SIMULATION ROWS (Each simulation is its own row on the page!) */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-1 text-xs text-neutral-400">
                <span className="font-medium text-neutral-300">
                  Simulation Experiments ({rankedRows.length} Active Runs)
                </span>
                <span>Sorted by performance uplift</span>
              </div>

              {rankedRows.map((row) => (
                <SimulationRowCard
                  key={row.id}
                  row={row}
                  simState={currentStepState}
                  userConfig={userConfig}
                  sceneGraph={resolvedLocation.sceneGraph}
                  neighbors={resolvedLocation.neighbors}
                  districtInfo={resolvedLocation.districtInfo}
                  onDeleteRow={handleDeleteRow}
                  onOpen3DModal={(r) => setModal3DRow(r)}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Optional Full 360° 3D Inspection Modal */}
      {modal3DRow && (
        <div className="fixed inset-0 z-50 bg-neutral-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">{modal3DRow.name}</h3>
                <p className="text-xs text-neutral-400 mt-0.5">360° Interactive OrbitControls Stage</p>
              </div>
              <button
                onClick={() => setModal3DRow(null)}
                className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 flex-1">
              <StreetScene
                sceneGraph={resolvedLocation.sceneGraph}
                userConfig={userConfig}
                patch={modal3DRow.patch}
                simState={currentStepState}
                stillSvgUrl={resolvedLocation.stillSvg}
                neighbors={resolvedLocation.neighbors}
                districtInfo={resolvedLocation.districtInfo}
                address={resolvedLocation.address}
                onTimeChange={(m) => setCurrentMinute(m)}
                onDowChange={(dow) => setCurrentDow(dow)}
                isPlaying={isPlaying}
                onTogglePlay={() => setIsPlaying(!isPlaying)}
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. Global Minimal Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 px-4 py-3 text-center text-[11px] text-neutral-500">
        UrbanTwin · Storefront foot-traffic & micro-simulation comparison engine powered by Google Maps Platform APIs.
      </footer>
    </div>
  );
}
