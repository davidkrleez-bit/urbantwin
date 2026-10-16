import React, { useState } from 'react';
import { DistrictInfo, PresetLocation, UserShopConfig } from '../types/simulation';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Compass,
  Layers,
  MapPin,
  Store,
  Users,
} from 'lucide-react';

interface StreetReconViewProps {
  location: PresetLocation;
  userConfig: UserShopConfig;
  onProceedToSimulation: () => void;
  onBackToAddress: () => void;
}

export const StreetReconView: React.FC<StreetReconViewProps> = ({
  location,
  userConfig,
  onProceedToSimulation,
  onBackToAddress,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [mapError, setMapError] = useState(false);

  const streetViewUrl = location.stillSvg || `/api/streetview-image?lat=${location.lat}&lng=${location.lng}&address=${encodeURIComponent(location.address)}`;
  const staticMapUrl = location.staticMapUrl || `/api/static-map?lat=${location.lat}&lng=${location.lng}&address=${encodeURIComponent(location.address)}`;

  return (
    <div className="flex flex-col gap-5 max-w-5xl mx-auto w-full py-4 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div>
          <div className="text-xs text-neutral-400">Step 2 of 3 · Street Reconnaissance</div>
          <h1 className="text-lg font-semibold text-white mt-0.5">
            Physical Street View & Google Maps Catchment
          </h1>
        </div>

        <button
          onClick={onBackToAddress}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs transition-colors border border-neutral-800 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Edit Address</span>
        </button>
      </div>

      {/* Dual Real Google Maps Imagery: Wide Street View Panorama + Static Cartography */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Real Wide Google Street View Panorama (7 cols) */}
        <div className="lg:col-span-8 relative rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-sm flex flex-col">
          <div className="relative aspect-[16/9] sm:aspect-[2/1] w-full bg-neutral-950 flex items-center justify-center overflow-hidden">
            <img
              src={imageError ? '/storefront_facade.jpg' : streetViewUrl}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageError(true);
                setImageLoaded(true);
              }}
              alt={`Street View of ${location.address}`}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoaded ? 'opacity-100' : 'opacity-20'
              }`}
            />

            {/* Top Overlays */}
            <div className="absolute top-3 left-3 flex items-center gap-2 bg-neutral-950/85 backdrop-blur-sm px-3 py-1.5 rounded-lg text-xs text-neutral-200 border border-neutral-800 shadow-sm">
              <MapPin className="w-3.5 h-3.5 text-rose-500" />
              <span className="font-medium text-white truncate max-w-[280px]">{location.address}</span>
              <span className="text-neutral-600">·</span>
              <span className="text-neutral-400 text-[11px]">110° Street View</span>
            </div>

            <div className="absolute bottom-3 right-3 text-[10px] text-neutral-400 bg-neutral-950/85 backdrop-blur-sm px-2.5 py-1 rounded border border-neutral-800">
              Google Street View Imagery © 2026
            </div>
          </div>
        </div>

        {/* Real Google Static Map of Location (4 cols) */}
        <div className="lg:col-span-4 relative rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-sm flex flex-col">
          <div className="relative aspect-[16/9] sm:aspect-[2/1] lg:aspect-auto lg:h-full w-full bg-neutral-950 flex items-center justify-center overflow-hidden">
            {!mapError ? (
              <img
                src={staticMapUrl}
                onError={() => setMapError(true)}
                alt={`Map of ${location.address}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-neutral-500 p-4 text-center">
                Cartographic map view for {location.address}
              </div>
            )}

            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-neutral-950/85 backdrop-blur-sm px-2.5 py-1 rounded text-xs text-neutral-200 border border-neutral-800 shadow-sm">
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-medium text-white">Roadmap Cartography</span>
            </div>

            <div className="absolute bottom-3 right-3 text-[10px] text-neutral-400 bg-neutral-950/85 backdrop-blur-sm px-2 py-0.5 rounded border border-neutral-800">
              © Google Maps 2026
            </div>
          </div>
        </div>
      </div>

      {/* Real Detected Surrounding Places (Google Places API) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-medium text-white">
            <Store className="w-4 h-4 text-neutral-400" />
            <span>Nearby Places on Street (Google Places API)</span>
          </div>
          <span className="text-[11px] text-neutral-400">
            {location.neighbors.length} adjacent venues analyzed for pedestrian draw
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {location.neighbors.slice(0, 6).map((neighbor) => (
            <div
              key={neighbor.id}
              className="p-2.5 rounded-lg bg-neutral-950/60 border border-neutral-800/80 text-xs flex flex-col justify-between gap-1.5"
            >
              <div>
                <div className="font-medium text-neutral-200 truncate">{neighbor.name}</div>
                <div className="text-[11px] text-neutral-400 truncate mt-0.5">
                  {neighbor.kindEn || neighbor.kindKo} · ★ {neighbor.rating} ({neighbor.userRatingCount} reviews)
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-1 border-t border-neutral-800/60">
                <span>~{neighbor.distM}m away</span>
                <span className="font-mono text-neutral-300">~{neighbor.estimatedDailyVisits} visits/day</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reconstruction Analysis Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center gap-2 text-xs font-medium text-white mb-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Pedestrian Clearance</span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Static passersby and transient vehicles isolated from streetview imagery, yielding a clean 3D physical stage for live simulation.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center gap-2 text-xs font-medium text-white mb-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Curved Sidewalk Geometry</span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Reconstructed sidewalk with natural street curvature. Pedestrians follow the curving sidewalk path with smooth head swivel and walk kinematics.
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="flex items-center gap-2 text-xs font-medium text-white mb-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Storefront Frontage Bay</span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Target store bay scaled to 6.0m frontage with architectural door, panoramic glass display window, and active signboard mounting.
          </p>
        </div>
      </div>

      {/* Location Catchment Specs & Action */}
      <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div>
          <div className="text-neutral-400">
            District: <strong className="text-white font-medium">{location.districtInfo.district_name_en}</strong>
          </div>
          <div className="text-neutral-500 mt-0.5">
            Estimated ~{(location.districtInfo.daily_passers_estimate || 24000).toLocaleString()} sidewalk passers/day · Peak: {location.districtInfo.peak_hours_en}
          </div>
        </div>

        <button
          onClick={onProceedToSimulation}
          className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-white hover:bg-neutral-200 text-neutral-950 font-medium text-xs transition-colors flex items-center justify-center gap-2 shrink-0 cursor-pointer shadow-sm"
        >
          <span>Launch 3D Simulation & Experiments</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
