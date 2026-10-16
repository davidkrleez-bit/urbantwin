import React, { useEffect, useRef } from 'react';
import {
  DistrictInfo,
  InterventionPatch,
  NeighborShop,
  SceneGraph,
  StepSimulationState,
  UserShopConfig,
} from '../types/simulation';

interface SimulationRowVisualizerProps {
  patch: InterventionPatch;
  simState: StepSimulationState;
  userConfig: UserShopConfig;
  sceneGraph: SceneGraph;
  neighbors?: NeighborShop[];
  districtInfo?: DistrictInfo;
  onOpen3DModal?: () => void;
}

interface MiniPedestrian {
  id: number;
  x: number; // 0 to width
  yOffset: number;
  speed: number;
  dir: 1 | -1;
  color: string;
  walkPhase: number;
  state: 'walking' | 'noticing' | 'entering' | 'inside';
  stateTimer: number;
}

export const SimulationRowVisualizer: React.FC<SimulationRowVisualizerProps> = ({
  patch,
  simState,
  userConfig,
  sceneGraph,
  neighbors = [],
  districtInfo,
  onOpen3DModal,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pedestriansRef = useRef<MiniPedestrian[]>([]);

  // Initialize mini pedestrian pool
  useEffect(() => {
    const peds: MiniPedestrian[] = [];
    const coatColors = ['#38bdf8', '#fbbf24', '#f87171', '#34d399', '#a78bfa', '#e2e8f0', '#94a3b8'];

    for (let i = 0; i < 16; i++) {
      peds.push({
        id: i,
        x: Math.random() * 480,
        yOffset: (Math.random() - 0.5) * 16,
        speed: 35 + Math.random() * 25,
        dir: Math.random() > 0.5 ? 1 : -1,
        color: coatColors[i % coatColors.length],
        walkPhase: Math.random() * Math.PI * 2,
        state: 'walking',
        stateTimer: 0,
      });
    }
    pedestriansRef.current = peds;
  }, []);

  // Animation Loop on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const render = (time: number) => {
      animId = requestAnimationFrame(render);
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      const w = canvas.width;
      const h = canvas.height;

      // 1. Time-of-Day Lighting Background
      const hour = simState.minute / 60;
      let skyColor = '#0f172a';
      let ambientAlpha = 0.0;

      if (hour >= 6 && hour < 8) {
        skyColor = '#1e293b'; // Dawn
        ambientAlpha = 0.15;
      } else if (hour >= 8 && hour < 17) {
        skyColor = '#1e293b'; // Daytime
        ambientAlpha = 0.0;
      } else if (hour >= 17 && hour < 20) {
        skyColor = '#1c1917'; // Dusk
        ambientAlpha = 0.25;
      } else {
        skyColor = '#090d16'; // Night
        ambientAlpha = 0.45;
      }

      ctx.fillStyle = skyColor;
      ctx.fillRect(0, 0, w, h);

      // 2. Curving Sidewalk & Road Geometry
      const sidewalkY = h * 0.62;
      const roadY = h * 0.82;
      const rawCurv = typeof sceneGraph.streetCurvature === 'number' ? sceneGraph.streetCurvature : 0.25;
      const curvature = Math.max(-0.5, Math.min(0.5, rawCurv));

      const getSidewalkCurve = (x: number) => {
        return Math.sin((x / w) * Math.PI) * (curvature * 22);
      };

      // Draw Asphalt Road
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, roadY + getSidewalkCurve(0));
      for (let x = 0; x <= w; x += 20) {
        ctx.lineTo(x, roadY + getSidewalkCurve(x));
      }
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      ctx.fill();

      // Road Dash Line
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(0, roadY + 16 + getSidewalkCurve(0));
      for (let x = 0; x <= w; x += 20) {
        ctx.lineTo(x, roadY + 16 + getSidewalkCurve(x));
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Sidewalk
      ctx.fillStyle = '#cbd5e1';
      ctx.beginPath();
      ctx.moveTo(0, sidewalkY + getSidewalkCurve(0));
      for (let x = 0; x <= w; x += 20) {
        ctx.lineTo(x, sidewalkY + getSidewalkCurve(x));
      }
      for (let x = w; x >= 0; x -= 20) {
        ctx.lineTo(x, roadY + getSidewalkCurve(x));
      }
      ctx.closePath();
      ctx.fill();

      // Curb Stone Line
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, roadY + getSidewalkCurve(0));
      for (let x = 0; x <= w; x += 20) {
        ctx.lineTo(x, roadY + getSidewalkCurve(x));
      }
      ctx.stroke();

      // 3. Buildings & Storefronts
      const buildingBottom = sidewalkY + getSidewalkCurve(w / 2);
      const buildingTop = 16;
      const buildingHeight = buildingBottom - buildingTop;

      // Left Neighbor (Real Google Places venue)
      const leftNeighbor = neighbors[0] || { name: 'Local Cafe & Bakery', kindEn: 'Cafe' };
      const leftWidth = w * 0.28;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, buildingTop + 10, leftWidth, buildingHeight);

      // Left Signboard
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(8, buildingTop + 24, leftWidth - 16, 22);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(leftNeighbor.name.slice(0, 16), leftWidth / 2, buildingTop + 38);

      // Left Window & Warm Glow
      ctx.fillStyle = '#fef08a';
      ctx.globalAlpha = 0.55;
      ctx.fillRect(14, buildingTop + 54, leftWidth - 28, buildingHeight - 64);
      ctx.globalAlpha = 1.0;

      // Right Neighbor (Real Google Places venue)
      const rightNeighbor = neighbors[1] || { name: 'Retail Boutique', kindEn: 'Store' };
      const rightWidth = w * 0.28;
      const rightX = w - rightWidth;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(rightX, buildingTop + 10, rightWidth, buildingHeight);

      // Right Signboard
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(rightX + 8, buildingTop + 24, rightWidth - 16, 22);
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 10px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(rightNeighbor.name.slice(0, 16), rightX + rightWidth / 2, buildingTop + 38);

      // Right Window
      ctx.fillStyle = '#fef08a';
      ctx.globalAlpha = 0.55;
      ctx.fillRect(rightX + 14, buildingTop + 54, rightWidth - 28, buildingHeight - 64);
      ctx.globalAlpha = 1.0;

      // 4. Target Storefront (Center Focus)
      const targetX = leftWidth + 4;
      const targetWidth = rightX - targetX - 4;
      const doorX = targetX + targetWidth * 0.72;

      // Target Main Facade
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(targetX, buildingTop, targetWidth, buildingHeight);

      // Upper Windows
      ctx.fillStyle = '#38bdf8';
      ctx.globalAlpha = 0.4;
      ctx.fillRect(targetX + 10, buildingTop + 6, targetWidth - 20, 14);
      ctx.globalAlpha = 1.0;

      // Main Store Signboard
      ctx.fillStyle = '#090d16';
      ctx.fillRect(targetX + 6, buildingTop + 24, targetWidth - 12, 26);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((userConfig.shopName || 'STORE').slice(0, 24), targetX + targetWidth / 2, buildingTop + 40);

      // Store Interior Display Window
      ctx.fillStyle = '#fef08a';
      ctx.globalAlpha = 0.75;
      ctx.fillRect(targetX + 8, buildingTop + 56, targetWidth * 0.58, buildingHeight - 62);
      ctx.globalAlpha = 1.0;

      // Counter inside
      ctx.fillStyle = '#78350f';
      ctx.fillRect(targetX + 14, buildingBottom - 26, targetWidth * 0.45, 14);

      // Baristas/Servers behind counter
      const effectiveServers = Math.min(3, userConfig.serversCount + (patch.extra_servers || 0));
      for (let s = 0; s < effectiveServers; s++) {
        const sx = targetX + 22 + s * 14;
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.arc(sx, buildingBottom - 34, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#334155';
        ctx.fillRect(sx - 4, buildingBottom - 30, 8, 12);
      }

      // Glass Entrance Door
      ctx.fillStyle = '#38bdf8';
      ctx.globalAlpha = 0.5;
      ctx.fillRect(doorX - 10, buildingTop + 54, 24, buildingHeight - 58);
      ctx.globalAlpha = 1.0;
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(doorX - 10, buildingTop + 54, 24, buildingHeight - 58);

      // 5. Active Intervention Props (Banner, Awning, Blade Sign)
      // Awning
      if (patch.awning) {
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.moveTo(targetX + 4, buildingTop + 52);
        ctx.lineTo(targetX + targetWidth - 4, buildingTop + 52);
        ctx.lineTo(targetX + targetWidth + 2, buildingTop + 62);
        ctx.lineTo(targetX + 2, buildingTop + 62);
        ctx.closePath();
        ctx.fill();
      }

      // Outdoor Storefront Banner
      if (patch.use_user_banner) {
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(targetX + 10, buildingTop + 4, targetWidth * 0.6, 16);
        ctx.fillStyle = '#090d16';
        ctx.font = 'bold 8px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SPECIAL OFFER', targetX + 10 + targetWidth * 0.3, buildingTop + 15);
      }

      // Blade Sign
      if (patch.sign_type === 'blade') {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(targetX - 2, buildingTop + 36, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#090d16';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // 6. Outside Waiting Queue Line
      const queueCount = Math.min(6, simState.queueLength);
      for (let q = 0; q < queueCount; q++) {
        const qx = doorX - 6 - q * 8;
        const qy = buildingBottom - 4 + getSidewalkCurve(qx);
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(qx, qy, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(qx - 3, qy + 3, 6, 8);
      }

      // 7. Pedestrians on Sidewalk with Articulation & Reaction Cues
      const peds = pedestriansRef.current;
      const noticeChanceMultiplier = patch.use_user_banner || patch.sign_type === 'blade' ? 2.5 : 1.0;

      peds.forEach((ped) => {
        ped.walkPhase += dt * (ped.speed / 10);
        ped.stateTimer = Math.max(0, ped.stateTimer - dt);

        if (ped.state === 'walking') {
          ped.x += ped.dir * ped.speed * dt;

          // Notice store chance when walking past window
          const distToCenter = Math.abs(ped.x - (targetX + targetWidth * 0.4));
          if (distToCenter < 30 && ped.stateTimer <= 0 && Math.random() < 0.04 * noticeChanceMultiplier) {
            ped.state = 'noticing';
            ped.stateTimer = 1.8;
          }

          // Walk-in chance when near door
          const distToDoor = Math.abs(ped.x - doorX);
          if (distToDoor < 18 && ped.stateTimer <= 0 && Math.random() < 0.03 * noticeChanceMultiplier) {
            ped.state = 'entering';
            ped.stateTimer = 1.5;
          }

          // Wrap edges
          if (ped.dir === 1 && ped.x > w + 20) ped.x = -20;
          else if (ped.dir === -1 && ped.x < -20) ped.x = w + 20;
        } else if (ped.state === 'noticing') {
          if (ped.stateTimer <= 0) {
            if (Math.random() < 0.4) {
              ped.state = 'entering';
              ped.stateTimer = 1.5;
            } else {
              ped.state = 'walking';
              ped.stateTimer = 2.0;
            }
          }
        } else if (ped.state === 'entering') {
          ped.x += (doorX - ped.x) * dt * 3.0;
          if (ped.stateTimer <= 0) {
            ped.state = 'inside';
            ped.stateTimer = 3.0;
          }
        } else if (ped.state === 'inside') {
          if (ped.stateTimer <= 0) {
            ped.state = 'walking';
            ped.x = doorX;
            ped.dir = Math.random() > 0.5 ? 1 : -1;
            ped.stateTimer = 2.0;
          }
        }

        // Compute Y along sidewalk curve
        const curveY = sidewalkY + 12 + ped.yOffset + getSidewalkCurve(ped.x);

        // Draw Articulated Pedestrian
        ctx.save();
        ctx.translate(ped.x, curveY);

        // Walking leg swing
        const legSwing = ped.state === 'walking' || ped.state === 'entering'
          ? Math.sin(ped.walkPhase) * 4
          : 0;

        // Legs
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-2, 0);
        ctx.lineTo(-2 - legSwing, 8);
        ctx.moveTo(2, 0);
        ctx.lineTo(2 + legSwing, 8);
        ctx.stroke();

        // Torso / Coat
        ctx.fillStyle = ped.color;
        ctx.fillRect(-3.5, -8, 7, 8);

        // Head
        ctx.fillStyle = '#f5d0b5';
        ctx.beginPath();
        ctx.arc(0, -11, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Reaction Floating Badges
        if (ped.state === 'noticing') {
          ctx.fillStyle = '#d97706';
          ctx.beginPath();
          ctx.roundRect(-24, -28, 48, 14, 4);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('👀 Looking', 0, -18);
        } else if (ped.state === 'entering') {
          ctx.fillStyle = '#16a34a';
          ctx.beginPath();
          ctx.roundRect(-26, -28, 52, 14, 4);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 8px -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🚪 Walk In', 0, -18);
        }

        ctx.restore();
      });

      // Night/Dusk overlay tint
      if (ambientAlpha > 0) {
        ctx.fillStyle = `rgba(3, 7, 18, ${ambientAlpha})`;
        ctx.fillRect(0, 0, w, h);
      }
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [simState.minute, patch, userConfig.shopName, sceneGraph.streetCurvature, neighbors]);

  return (
    <div className="relative w-full h-[140px] sm:h-[155px] bg-neutral-950 rounded-lg overflow-hidden border border-neutral-800 shadow-inner group">
      <canvas
        ref={canvasRef}
        width={480}
        height={155}
        className="w-full h-full object-cover"
      />

      {/* Top Left Store & Flow Pill */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-neutral-950/85 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-neutral-300 border border-neutral-800">
        <span className="font-medium text-white">{userConfig.shopName.split(' ')[0]}</span>
        <span className="text-neutral-600">·</span>
        <span className="text-neutral-400">~{Math.round(simState.currentPassPerMin)} passers/min</span>
      </div>

      {/* Top Right Live Micro-Status */}
      <div className="absolute top-2 right-2 flex items-center gap-1 bg-neutral-950/85 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] border border-neutral-800">
        <span className="text-neutral-400">Queue:</span>
        <span className={`font-mono font-medium ${simState.queueLength > 3 ? 'text-amber-400' : 'text-neutral-200'}`}>
          {simState.queueLength} waiting
        </span>
      </div>

      {/* Bottom 3D Inspection Button */}
      {onOpen3DModal && (
        <button
          onClick={onOpen3DModal}
          className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 px-2 py-0.5 rounded text-[10px] border border-neutral-700 shadow-sm cursor-pointer"
        >
          360° 3D Stage
        </button>
      )}
    </div>
  );
};
