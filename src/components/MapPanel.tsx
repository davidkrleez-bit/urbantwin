import React, { useState, useEffect } from 'react';
import { DistrictInfo, PresetLocation } from '../types/simulation';
import { MapPin, Navigation, Store } from 'lucide-react';

interface MapPanelProps {
  preset: PresetLocation;
  districtInfo: DistrictInfo;
  shopName: string;
}

export const MapPanel: React.FC<MapPanelProps> = ({ preset, districtInfo, shopName }) => {
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    setMapError(false);
  }, [preset.address, preset.staticMapUrl]);

  const staticMapUrl = preset.staticMapUrl || `/api/static-map?lat=${preset.lat}&lng=${preset.lng}&address=${encodeURIComponent(preset.address)}`;

  return (
    <div className="flex flex-col gap-3.5">
      {/* Real Google Static Map */}
      <div className="relative w-full h-[200px] bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800 shadow-sm">
        {!mapError ? (
          <img
            src={staticMapUrl}
            alt={`Google Map of ${preset.address}`}
            onError={() => setMapError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-neutral-950 text-neutral-500 text-xs">
            Map preview available for {preset.address}
          </div>
        )}

        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-neutral-900/90 backdrop-blur-sm px-2.5 py-1 rounded text-xs text-neutral-200 border border-neutral-800 shadow-sm">
          <MapPin className="w-3.5 h-3.5 text-rose-500" />
          <span className="font-medium text-white">{preset.address.split(',')[0]}</span>
          <span className="text-neutral-600">·</span>
          <span className="text-neutral-400 text-[11px]">Google Maps</span>
        </div>

        <div className="absolute bottom-2 right-2 text-[9px] text-neutral-400 bg-neutral-900/80 backdrop-blur px-1.5 py-0.5 rounded border border-neutral-800">
          © Google Maps 2026
        </div>
      </div>

      {/* Real Adjacent Businesses Detected around Address */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-300">
            <Store className="w-3.5 h-3.5 text-neutral-400" />
            <span>Nearby Places on Block</span>
          </div>
          <span className="text-[11px] text-neutral-500">
            {preset.neighbors.length} venues found
          </span>
        </div>

        <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-0.5">
          {preset.neighbors.map((neighbor) => (
            <div
              key={neighbor.id}
              className="flex items-center justify-between p-2 rounded bg-neutral-950/60 border border-neutral-800/80 text-xs"
            >
              <div className="max-w-[200px]">
                <div className="font-medium text-neutral-200 truncate">
                  {neighbor.name}
                  <span className="text-neutral-500 font-normal ml-1.5 text-[11px]">
                    · {neighbor.distM}m
                  </span>
                </div>
                <div className="text-[11px] text-neutral-500 truncate">
                  {neighbor.kindEn || neighbor.kindKo} · ★ {neighbor.rating} ({neighbor.userRatingCount} reviews)
                </div>
              </div>

              <div className="text-right text-[11px] shrink-0">
                <div className="font-mono text-neutral-300">
                  ~{neighbor.estimatedDailyVisits} visits/day
                </div>
                <div className="text-[10px] text-neutral-500">
                  {neighbor.relation === '끌림' ? 'Synergy Anchor' : 'Split Flow'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transit & Walking Anchors */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 text-xs">
        <div className="flex items-center gap-1.5 font-medium text-neutral-300 mb-2">
          <Navigation className="w-3.5 h-3.5 text-neutral-400" />
          <span>Transit & Walking Accessibility</span>
        </div>

        <div className="flex flex-col gap-1.5 text-neutral-400">
          {preset.anchors.map((anchor) => (
            <div key={anchor.id} className="flex items-center justify-between py-1 border-b border-neutral-800/60 last:border-0">
              <span className="text-neutral-300">{anchor.name}</span>
              <span className="font-mono text-neutral-400">{anchor.walkMin} min walk</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
