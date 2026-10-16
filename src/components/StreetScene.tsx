import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {
  ArchetypeId,
  DistrictInfo,
  InterventionPatch,
  NeighborShop,
  SceneGraph,
  StepSimulationState,
  UserShopConfig,
} from '../types/simulation';
import { ARCHETYPE_PROFILES } from '../lib/sim/engine';
import {
  Clock,
  Play,
  Pause,
  Sun,
  Moon,
  Users,
} from 'lucide-react';

interface StreetSceneProps {
  sceneGraph: SceneGraph;
  userConfig: UserShopConfig;
  patch: InterventionPatch;
  simState: StepSimulationState;
  stillSvgUrl: string;
  neighbors?: NeighborShop[];
  districtInfo?: DistrictInfo;
  address?: string;
  onTimeChange?: (minute: number) => void;
  onDowChange?: (dow: number) => void;
  isPlaying?: boolean;
  onTogglePlay?: () => void;
}

interface PedestrianActor {
  id: number;
  archetype: ArchetypeId;
  group: THREE.Group;
  
  // Articulated Limbs
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  headGroup: THREE.Group;
  torsoMesh: THREE.Mesh;
  
  // Reaction Badges
  noticeBadge: THREE.Sprite;
  enteringBadge: THREE.Sprite;
  
  // Kinematics & Coordinates
  x: number;
  baseZ: number;
  speed: number;
  direction: 1 | -1;
  walkPhase: number;
  
  // State
  state: 'walking' | 'noticing' | 'entering' | 'queuing' | 'inside';
  queueIndex?: number;
  noticeTimer?: number;
  enterTimer?: number;
}

// Reaction Sprite Generator
function createReactionSprite(text: string, bgColor: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 72;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 12);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(1.4, 0.4, 1);
  sprite.position.y = 2.05;
  sprite.visible = false;
  return sprite;
}

export const StreetScene: React.FC<StreetSceneProps> = ({
  sceneGraph,
  userConfig,
  patch,
  simState,
  stillSvgUrl,
  neighbors = [],
  districtInfo,
  address,
  onTimeChange,
  onDowChange,
  isPlaying = true,
  onTogglePlay,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  // Dynamic Scene Refs
  const dirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const sunMeshRef = useRef<THREE.Mesh | null>(null);
  const moonMeshRef = useRef<THREE.Mesh | null>(null);
  const storeInteriorLightRef = useRef<THREE.PointLight | null>(null);
  const streetLamp1Ref = useRef<THREE.PointLight | null>(null);
  const streetLamp2Ref = useRef<THREE.PointLight | null>(null);
  const bladeSignRef = useRef<THREE.Group | null>(null);
  const awningMeshRef = useRef<THREE.Mesh | null>(null);
  const bannerMeshRef = useRef<THREE.Mesh | null>(null);
  const doorPivotRef = useRef<THREE.Group | null>(null);
  const actorsRef = useRef<PedestrianActor[]>([]);

  const [activeCamPreset, setActiveCamPreset] = useState<'street' | 'facade' | 'overview'>('street');

  const latestProps = useRef({ sceneGraph, userConfig, patch, simState, neighbors });
  useEffect(() => {
    latestProps.current = { sceneGraph, userConfig, patch, simState, neighbors };
  }, [sceneGraph, userConfig, patch, simState, neighbors]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const height = container.clientHeight || 520;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#38bdf8');
    scene.fog = new THREE.FogExp2('#38bdf8', 0.015);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.85, 7.6);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = 2.8;
    controls.maxDistance = 16.0;
    controls.target.set(0, 1.35, 0);
    controlsRef.current = controls;

    // 2. Texture Loader
    const textureLoader = new THREE.TextureLoader();
    const storefrontTexture = textureLoader.load(
      stillSvgUrl || '/storefront_facade.jpg',
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
      },
      undefined,
      () => {
        textureLoader.load('/storefront_facade.jpg', (tex) => {
          tex.colorSpace = THREE.SRGBColorSpace;
        });
      }
    );

    // 3. Dynamic Sun, Sky & Illumination Rig
    const ambientLight = new THREE.AmbientLight('#ffffff', 0.65);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const hemiLight = new THREE.HemisphereLight('#bae6fd', '#334155', 0.55);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight('#fffbeb', 1.5);
    dirLight.position.set(6, 12, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.bias = -0.0003;
    scene.add(dirLight);
    dirLightRef.current = dirLight;

    const sunGeo = new THREE.SphereGeometry(0.65, 20, 20);
    const sunMat = new THREE.MeshBasicMaterial({ color: '#fef08a' });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.position.set(6, 12, -4);
    scene.add(sunMesh);
    sunMeshRef.current = sunMesh;

    const moonGeo = new THREE.SphereGeometry(0.48, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: '#e0f2fe' });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(-6, 10, -4);
    moonMesh.visible = false;
    scene.add(moonMesh);
    moonMeshRef.current = moonMesh;

    const interiorLight = new THREE.PointLight('#f59e0b', 3.0, 7.5);
    interiorLight.position.set(0, 2.1, -1.8);
    interiorLight.castShadow = true;
    scene.add(interiorLight);
    storeInteriorLightRef.current = interiorLight;

    const streetLamp1 = new THREE.PointLight('#fef08a', 0.0, 6.0);
    streetLamp1.position.set(-4.2, 3.1, 1.0);
    scene.add(streetLamp1);
    streetLamp1Ref.current = streetLamp1;

    const streetLamp2 = new THREE.PointLight('#fef08a', 0.0, 6.0);
    streetLamp2.position.set(4.2, 3.1, 1.0);
    scene.add(streetLamp2);
    streetLamp2Ref.current = streetLamp2;

    // 4. Dynamic Curved Sidewalk & Road Geometry (Derived from address streetCurvature)
    const rawCurvature = typeof sceneGraph.streetCurvature === 'number' ? sceneGraph.streetCurvature : 0.35;
    const curvature = Math.max(-0.6, Math.min(0.6, rawCurvature));

    const getCurvedZ = (x: number) => {
      return Math.sin(x * 0.14) * (curvature * 1.3);
    };

    const getTangentAngle = (x: number) => {
      return Math.cos(x * 0.14) * 0.14 * (curvature * 1.3);
    };

    const segmentsX = 48;
    const roadWidthZ = 8.0;
    const sidewalkWidthZ = sceneGraph.sidewalk?.width_m || 3.2;
    const totalX = 36.0;

    // Curved Sidewalk Mesh
    const sidewalkGeo = new THREE.PlaneGeometry(totalX, sidewalkWidthZ, segmentsX, 4);
    sidewalkGeo.rotateX(-Math.PI / 2);
    const swPos = sidewalkGeo.attributes.position;
    for (let i = 0; i < swPos.count; i++) {
      const vx = swPos.getX(i);
      const vz = swPos.getZ(i);
      swPos.setZ(i, vz + getCurvedZ(vx));
    }
    sidewalkGeo.computeVertexNormals();
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: '#cbd5e1', roughness: 0.72 });
    const sidewalkMesh = new THREE.Mesh(sidewalkGeo, sidewalkMat);
    sidewalkMesh.position.set(0, 0.16, 0.0);
    sidewalkMesh.receiveShadow = true;
    scene.add(sidewalkMesh);

    // Curved Curb Stone
    const curbGeo = new THREE.PlaneGeometry(totalX, 0.28, segmentsX, 1);
    curbGeo.rotateX(-Math.PI / 2);
    const cbPos = curbGeo.attributes.position;
    for (let i = 0; i < cbPos.count; i++) {
      const vx = cbPos.getX(i);
      const vz = cbPos.getZ(i);
      cbPos.setZ(i, vz + getCurvedZ(vx));
    }
    curbGeo.computeVertexNormals();
    const curbMat = new THREE.MeshStandardMaterial({ color: '#64748b', roughness: 0.7 });
    const curbMesh = new THREE.Mesh(curbGeo, curbMat);
    curbMesh.position.set(0, 0.18, sidewalkWidthZ / 2);
    curbMesh.receiveShadow = true;
    scene.add(curbMesh);

    // Curved Asphalt Road
    const roadGeo = new THREE.PlaneGeometry(totalX, roadWidthZ, segmentsX, 4);
    roadGeo.rotateX(-Math.PI / 2);
    const rdPos = roadGeo.attributes.position;
    for (let i = 0; i < rdPos.count; i++) {
      const vx = rdPos.getX(i);
      const vz = rdPos.getZ(i);
      rdPos.setZ(i, vz + getCurvedZ(vx));
    }
    roadGeo.computeVertexNormals();
    const roadMat = new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.88 });
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.position.set(0, 0, sidewalkWidthZ / 2 + roadWidthZ / 2);
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    // 5. Architectural Building Model (Dynamically tailored by address & architecture style)
    const archStyle = sceneGraph.architectureStyle || 'modern_highrise';
    const buildingStories = sceneGraph.buildingHeightStories || (archStyle === 'modern_highrise' ? 10 : 4);
    const totalBlockWidth = 26.0;
    const groundFloorHeight = 3.2;
    const upperFloorHeight = Math.min(14.0, 2.4 * Math.min(6, buildingStories - 1));
    const totalBuildingHeight = groundFloorHeight + upperFloorHeight;

    const buildingCoreGeo = new THREE.BoxGeometry(totalBlockWidth, totalBuildingHeight, 3.2);
    const buildingCoreMat = new THREE.MeshStandardMaterial({
      color: sceneGraph.facadeColor || '#1e293b',
      roughness: 0.75,
    });
    const buildingCore = new THREE.Mesh(buildingCoreGeo, buildingCoreMat);
    buildingCore.position.set(0, totalBuildingHeight / 2 + 0.16, -2.6);
    buildingCore.castShadow = true;
    buildingCore.receiveShadow = true;
    scene.add(buildingCore);

    // Upper Facade Architectural Treatments (Skyscraper glass / boutique brick / classic boulevard)
    let upperFacadeColor = sceneGraph.facadeColor || '#334155';
    if (archStyle === 'boutique_brick') upperFacadeColor = '#7f1d1d';
    else if (archStyle === 'classic_boulevard') upperFacadeColor = '#94a3b8';
    else if (archStyle === 'neighborhood_commercial') upperFacadeColor = '#475569';

    const upperWallGeo = new THREE.BoxGeometry(totalBlockWidth, upperFloorHeight, 0.35);
    const upperWallMat = new THREE.MeshStandardMaterial({
      color: upperFacadeColor,
      roughness: archStyle === 'modern_highrise' ? 0.3 : 0.75,
      metalness: archStyle === 'modern_highrise' ? 0.6 : 0.1,
    });
    const upperWall = new THREE.Mesh(upperWallGeo, upperWallMat);
    upperWall.position.set(0, groundFloorHeight + upperFloorHeight / 2 + 0.16, -1.05);
    scene.add(upperWall);

    // Architectural Upper Windows
    const windowCols = archStyle === 'modern_highrise' ? 10 : 7;
    const winWidth = archStyle === 'modern_highrise' ? 1.6 : 1.3;
    const winHeight = archStyle === 'modern_highrise' ? 1.8 : 1.4;

    for (let wx = -10.0; wx <= 10.0; wx += 2.4) {
      for (let wy = groundFloorHeight + 1.2; wy < totalBuildingHeight - 1.0; wy += 2.2) {
        const uWinGeo = new THREE.PlaneGeometry(winWidth, winHeight);
        const uWinMat = new THREE.MeshPhysicalMaterial({
          color: archStyle === 'modern_highrise' ? '#60a5fa' : '#93c5fd',
          transmission: 0.45,
          roughness: 0.15,
          metalness: 0.3,
        });
        const uWin = new THREE.Mesh(uWinGeo, uWinMat);
        uWin.position.set(wx, wy + 0.16, -0.86);
        scene.add(uWin);
      }
    }

    // Architectural Cornice
    const corniceGeo = new THREE.BoxGeometry(totalBlockWidth + 0.4, 0.24, 0.45);
    const corniceMat = new THREE.MeshStandardMaterial({ color: '#0f172a', roughness: 0.35, metalness: 0.5 });
    const cornice = new THREE.Mesh(corniceGeo, corniceMat);
    cornice.position.set(0, groundFloorHeight + 0.16, -0.92);
    cornice.castShadow = true;
    scene.add(cornice);

    // 6. REAL ADJACENT BUSINESSES DETECTED VIA GOOGLE PLACES API
    const leftNeighborData = neighbors[0] || {
      name: sceneGraph.bays.find((b) => b.id.includes('left'))?.name || 'Local Venue A',
      kindEn: 'Cafe & Bakery',
      family: 'cafe',
    };

    const rightNeighborData = neighbors[1] || {
      name: sceneGraph.bays.find((b) => b.id.includes('right'))?.name || 'Local Venue B',
      kindEn: 'Retail & Fashion',
      family: 'clothing',
    };

    // A. Left Neighbor Storefront (Real Name, Real Signboard, Real Display Window)
    const leftNeighborGroup = new THREE.Group();
    leftNeighborGroup.position.set(-7.0, 0, 0);

    const leftWallGeo = new THREE.BoxGeometry(7.2, groundFloorHeight, 0.25);
    const leftWallMat = new THREE.MeshStandardMaterial({
      color: leftNeighborData.family === 'cafe' ? '#451a03' : '#1e293b',
      roughness: 0.65,
    });
    const leftWall = new THREE.Mesh(leftWallGeo, leftWallMat);
    leftWall.position.set(0, groundFloorHeight / 2 + 0.16, -1.02);
    leftNeighborGroup.add(leftWall);

    // Left Signboard with Canvas Rendering
    const leftSignCanvas = document.createElement('canvas');
    leftSignCanvas.width = 512;
    leftSignCanvas.height = 128;
    const lCtx = leftSignCanvas.getContext('2d');
    if (lCtx) {
      lCtx.fillStyle = '#0f172a';
      lCtx.fillRect(0, 0, 512, 128);
      lCtx.fillStyle = '#f8fafc';
      lCtx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      lCtx.textAlign = 'center';
      lCtx.textBaseline = 'middle';
      lCtx.fillText(leftNeighborData.name, 256, 46);
      lCtx.fillStyle = '#94a3b8';
      lCtx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      lCtx.fillText((leftNeighborData.kindEn || 'STORE').toUpperCase(), 256, 92);
    }
    const leftSignTex = new THREE.CanvasTexture(leftSignCanvas);
    const leftSignPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(4.8, 0.55),
      new THREE.MeshBasicMaterial({ map: leftSignTex })
    );
    leftSignPlate.position.set(0, groundFloorHeight - 0.42 + 0.16, -0.86);
    leftNeighborGroup.add(leftSignPlate);

    // Left Window
    const leftWin = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 2.05),
      new THREE.MeshPhysicalMaterial({ color: '#fef08a', transmission: 0.75, roughness: 0.15 })
    );
    leftWin.position.set(0, 1.45 + 0.16, -0.92);
    leftNeighborGroup.add(leftWin);

    // Left Warm Interior Glow
    const leftGlow = new THREE.PointLight('#fef08a', 1.8, 5.0);
    leftGlow.position.set(0, 1.8, -1.8);
    leftNeighborGroup.add(leftGlow);

    scene.add(leftNeighborGroup);

    // B. Right Neighbor Storefront (Real Name, Real Signboard, Real Display Window)
    const rightNeighborGroup = new THREE.Group();
    rightNeighborGroup.position.set(7.0, 0, 0);

    const rightWallGeo = new THREE.BoxGeometry(7.2, groundFloorHeight, 0.25);
    const rightWallMat = new THREE.MeshStandardMaterial({
      color: rightNeighborData.family === 'clothing' ? '#0f172a' : '#1f2937',
      roughness: 0.65,
    });
    const rightWall = new THREE.Mesh(rightWallGeo, rightWallMat);
    rightWall.position.set(0, groundFloorHeight / 2 + 0.16, -1.02);
    rightNeighborGroup.add(rightWall);

    // Right Signboard
    const rightSignCanvas = document.createElement('canvas');
    rightSignCanvas.width = 512;
    rightSignCanvas.height = 128;
    const rCtx = rightSignCanvas.getContext('2d');
    if (rCtx) {
      rCtx.fillStyle = '#0f172a';
      rCtx.fillRect(0, 0, 512, 128);
      rCtx.fillStyle = '#f8fafc';
      rCtx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      rCtx.textAlign = 'center';
      rCtx.textBaseline = 'middle';
      rCtx.fillText(rightNeighborData.name, 256, 46);
      rCtx.fillStyle = '#94a3b8';
      rCtx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      rCtx.fillText((rightNeighborData.kindEn || 'STORE').toUpperCase(), 256, 92);
    }
    const rightSignTex = new THREE.CanvasTexture(rightSignCanvas);
    const rightSignPlate = new THREE.Mesh(
      new THREE.PlaneGeometry(4.8, 0.55),
      new THREE.MeshBasicMaterial({ map: rightSignTex })
    );
    rightSignPlate.position.set(0, groundFloorHeight - 0.42 + 0.16, -0.86);
    rightNeighborGroup.add(rightSignPlate);

    // Right Window
    const rightWin = new THREE.Mesh(
      new THREE.PlaneGeometry(3.6, 2.05),
      new THREE.MeshPhysicalMaterial({ color: '#fef08a', transmission: 0.75, roughness: 0.15 })
    );
    rightWin.position.set(0, 1.45 + 0.16, -0.92);
    rightNeighborGroup.add(rightWin);

    // Right Warm Interior Glow
    const rightGlow = new THREE.PointLight('#fef08a', 1.8, 5.0);
    rightGlow.position.set(0, 1.8, -1.8);
    rightNeighborGroup.add(rightGlow);

    scene.add(rightNeighborGroup);

    // 7. TARGET STOREFRONT BAY (Central Architectural Focus)
    const targetWidth = 6.0;
    const doorX = 1.6;
    const doorWidth = 1.05;
    const doorHeight = 2.15;
    const windowWidth = 3.6;
    const windowHeight = 2.05;

    const portalGeo = new THREE.BoxGeometry(targetWidth, groundFloorHeight, 0.15);
    const portalMat = new THREE.MeshStandardMaterial({
      color: '#0f172a',
      roughness: 0.4,
      metalness: 0.6,
    });
    const portalMesh = new THREE.Mesh(portalGeo, portalMat);
    portalMesh.position.set(0, groundFloorHeight / 2 + 0.16, -1.02);
    scene.add(portalMesh);

    // Target Signboard
    const signGeo = new THREE.BoxGeometry(targetWidth - 0.4, 0.58, 0.12);
    const signMat = new THREE.MeshStandardMaterial({ color: '#090d16', roughness: 0.3, metalness: 0.7 });
    const targetSignMesh = new THREE.Mesh(signGeo, signMat);
    targetSignMesh.position.set(0, groundFloorHeight - 0.42 + 0.16, -0.84);
    targetSignMesh.castShadow = true;
    scene.add(targetSignMesh);

    const signCanvas = document.createElement('canvas');
    signCanvas.width = 1024;
    signCanvas.height = 128;
    const signCtx = signCanvas.getContext('2d');
    if (signCtx) {
      signCtx.fillStyle = '#090d16';
      signCtx.fillRect(0, 0, signCanvas.width, signCanvas.height);
      signCtx.fillStyle = '#f8fafc';
      signCtx.font = 'bold 50px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      signCtx.textAlign = 'center';
      signCtx.textBaseline = 'middle';
      signCtx.fillText(userConfig.shopName || 'URBAN TWIN CAFE', signCanvas.width / 2, 48);
      signCtx.fillStyle = '#94a3b8';
      signCtx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
      signCtx.fillText(userConfig.kind?.toUpperCase() || 'SPECIALTY ESPRESSO & ARTISAN BAKERY', signCanvas.width / 2, 94);
    }
    const signTex = new THREE.CanvasTexture(signCanvas);
    const signPlateGeo = new THREE.PlaneGeometry(targetWidth - 0.5, 0.52);
    const signPlateMat = new THREE.MeshBasicMaterial({ map: signTex });
    const signPlate = new THREE.Mesh(signPlateGeo, signPlateMat);
    signPlate.position.set(0, groundFloorHeight - 0.42 + 0.16, -0.77);
    scene.add(signPlate);

    // Front Display Window
    const displayWinGeo = new THREE.PlaneGeometry(windowWidth, windowHeight);
    const displayWinMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      transmission: 0.92,
      transparent: true,
      roughness: 0.08,
      ior: 1.5,
      reflectivity: 0.5,
    });
    const displayWin = new THREE.Mesh(displayWinGeo, displayWinMat);
    displayWin.position.set(-0.95, windowHeight / 2 + 0.42 + 0.16, -0.92);
    scene.add(displayWin);

    // Entrance Glass Door with Pivot Hinge (Opens when pedestrians enter!)
    const doorPivot = new THREE.Group();
    doorPivot.position.set(doorX - doorWidth / 2, 0.16, -0.91);
    const doorGlassGeo = new THREE.PlaneGeometry(doorWidth, doorHeight);
    const doorGlassMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      transmission: 0.88,
      transparent: true,
      roughness: 0.1,
    });
    const doorGlassMesh = new THREE.Mesh(doorGlassGeo, doorGlassMat);
    doorGlassMesh.position.set(doorWidth / 2, doorHeight / 2, 0);
    doorPivot.add(doorGlassMesh);

    const handleGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.65, 8);
    const handleMat = new THREE.MeshStandardMaterial({ color: '#d97706', metalness: 0.85, roughness: 0.2 });
    const doorHandle = new THREE.Mesh(handleGeo, handleMat);
    doorHandle.position.set(doorWidth - 0.1, 1.05, 0.04);
    doorPivot.add(doorHandle);

    scene.add(doorPivot);
    doorPivotRef.current = doorPivot;

    // Interior Counter & Barista
    const counterGeo = new THREE.BoxGeometry(2.8, 0.95, 0.85);
    const counterMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.45 });
    const counterMesh = new THREE.Mesh(counterGeo, counterMat);
    counterMesh.position.set(-0.8, 0.95 / 2 + 0.16, -2.1);
    scene.add(counterMesh);

    // Exterior Banner Mesh
    const bannerGeo = new THREE.PlaneGeometry(3.6, 0.85);
    const bannerMat = new THREE.MeshBasicMaterial({ color: '#f59e0b', side: THREE.DoubleSide });
    const bannerMesh = new THREE.Mesh(bannerGeo, bannerMat);
    bannerMesh.position.set(-0.95, groundFloorHeight + 0.5 + 0.16, -0.82);
    bannerMesh.visible = false;
    scene.add(bannerMesh);
    bannerMeshRef.current = bannerMesh;

    // Blade Sign
    const bladeSignGroup = new THREE.Group();
    bladeSignGroup.position.set(-2.8, groundFloorHeight - 0.7 + 0.16, -0.75);
    const bladeArmGeo = new THREE.BoxGeometry(0.05, 0.05, 0.95);
    const bladeArmMat = new THREE.MeshStandardMaterial({ color: '#090d16', metalness: 0.8 });
    const bladeArm = new THREE.Mesh(bladeArmGeo, bladeArmMat);
    bladeArm.position.set(0, 0, 0.47);
    bladeSignGroup.add(bladeArm);

    const bladeDiskGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.08, 24);
    const bladeDiskMat = new THREE.MeshStandardMaterial({ color: '#f59e0b', roughness: 0.3 });
    const bladeDisk = new THREE.Mesh(bladeDiskGeo, bladeDiskMat);
    bladeDisk.rotation.z = Math.PI / 2;
    bladeDisk.position.set(0, -0.25, 0.75);
    bladeSignGroup.add(bladeDisk);
    bladeSignGroup.visible = false;
    scene.add(bladeSignGroup);
    bladeSignRef.current = bladeSignGroup;

    // Awning
    const awningGeo = new THREE.BoxGeometry(targetWidth - 0.2, 0.08, 1.4);
    const awningMat = new THREE.MeshStandardMaterial({ color: '#78350f', roughness: 0.5 });
    const awning = new THREE.Mesh(awningGeo, awningMat);
    awning.position.set(0, groundFloorHeight - 0.2 + 0.16, -0.2);
    awning.rotation.x = 0.12;
    awning.visible = false;
    scene.add(awning);
    awningMeshRef.current = awning;

    // Street Trees (Positioned along curved curb)
    const addTree = (tx: number) => {
      const treeGroup = new THREE.Group();
      const tz = sidewalkWidthZ / 2 - 0.3 + getCurvedZ(tx);
      treeGroup.position.set(tx, 0.16, tz);

      const trunkGeo = new THREE.CylinderGeometry(0.08, 0.11, 2.0, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: '#451a03', roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 1.0;
      treeGroup.add(trunk);

      const foliageGeo = new THREE.DodecahedronGeometry(0.85);
      const foliageMat = new THREE.MeshStandardMaterial({ color: '#15803d', roughness: 0.8 });
      const foliage = new THREE.Mesh(foliageGeo, foliageMat);
      foliage.position.y = 2.4;
      treeGroup.add(foliage);

      scene.add(treeGroup);
    };

    addTree(-8.5);
    addTree(8.5);

    // 8. REALISTIC 3D HUMAN GENERATOR WITH ARTICULATED LIMBS & CLEAR REACTIONS
    function createRealisticHuman(coatColor: string = '#334155') {
      const char = new THREE.Group();

      const skinTones = ['#f5d0b5', '#e8b89a', '#d49b78', '#fce2d0'];
      const skinMat = new THREE.MeshStandardMaterial({
        color: skinTones[Math.floor(Math.random() * skinTones.length)],
        roughness: 0.6,
      });

      const pantsColors = ['#1e293b', '#334155', '#0f172a', '#475569'];
      const pantsMat = new THREE.MeshStandardMaterial({
        color: pantsColors[Math.floor(Math.random() * pantsColors.length)],
        roughness: 0.8,
      });

      const shoeMat = new THREE.MeshStandardMaterial({ color: '#090d16', roughness: 0.4 });

      // Head
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 1.62, 0);
      const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), skinMat);
      headGroup.add(headMesh);

      const hairMat = new THREE.MeshStandardMaterial({
        color: ['#0f172a', '#3e2723', '#1c1917'][Math.floor(Math.random() * 3)],
        roughness: 0.85,
      });
      const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.118, 12, 8), hairMat);
      hairMesh.position.set(0, 0.03, -0.015);
      headGroup.add(hairMesh);
      char.add(headGroup);

      // Torso
      const torsoMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.7 });
      const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.58, 0.22), torsoMat);
      torsoMesh.position.set(0, 1.25, 0);
      char.add(torsoMesh);

      // Pelvis & Legs
      const leftLeg = new THREE.Group();
      leftLeg.position.set(-0.1, 0.94, 0);
      const leftLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.72, 0.14), pantsMat);
      leftLegMesh.position.y = -0.36;
      leftLeg.add(leftLegMesh);

      const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.22), shoeMat);
      leftShoe.position.set(0, -0.74, 0.04);
      leftLeg.add(leftShoe);
      char.add(leftLeg);

      const rightLeg = new THREE.Group();
      rightLeg.position.set(0.1, 0.94, 0);
      const rightLegMesh = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.72, 0.14), pantsMat);
      rightLegMesh.position.y = -0.36;
      rightLeg.add(rightLegMesh);

      const rightShoe = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.08, 0.22), shoeMat);
      rightShoe.position.set(0, -0.74, 0.04);
      rightLeg.add(rightShoe);
      char.add(rightLeg);

      // Arms
      const armMat = new THREE.MeshStandardMaterial({ color: coatColor, roughness: 0.7 });
      const leftArm = new THREE.Group();
      leftArm.position.set(-0.24, 1.34, 0);
      const leftArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.58, 0.1), armMat);
      leftArmMesh.position.y = -0.29;
      leftArm.add(leftArmMesh);
      char.add(leftArm);

      const rightArm = new THREE.Group();
      rightArm.position.set(0.24, 1.34, 0);
      const rightArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.58, 0.1), armMat);
      rightArmMesh.position.y = -0.29;
      rightArm.add(rightArmMesh);

      // Phone or cup prop
      if (Math.random() > 0.4) {
        const cup = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.03, 0.11, 8),
          new THREE.MeshBasicMaterial({ color: '#f8fafc' })
        );
        cup.position.set(0, -0.56, 0.1);
        rightArm.add(cup);
      }
      char.add(rightArm);

      // Reaction Icons above head (Clear notice 👀 & walk in 🚪 cues)
      const noticeBadge = createReactionSprite('👀 Looking', '#d97706');
      char.add(noticeBadge);

      const enteringBadge = createReactionSprite('🚪 Walk In', '#16a34a');
      char.add(enteringBadge);

      return {
        group: char,
        leftLeg,
        rightLeg,
        leftArm,
        rightArm,
        headGroup,
        torsoMesh,
        noticeBadge,
        enteringBadge,
      };
    }

    // 9. Pedestrian Pool (22 realistic human actors)
    const pedestrianPool: PedestrianActor[] = [];
    const archetypesList: ArchetypeId[] = ['commuter', 'lunch', 'stroller', 'trendsetter', 'tourist', 'resident'];

    for (let i = 0; i < 22; i++) {
      const archId = archetypesList[i % archetypesList.length];
      const arch = ARCHETYPE_PROFILES[archId];
      const charData = createRealisticHuman(arch.coatColor);

      const startX = (Math.random() - 0.5) * 18;
      const baseZ = -0.2 + Math.random() * 1.4;
      const dir: 1 | -1 = Math.random() > 0.5 ? 1 : -1;

      charData.group.position.set(startX, 0.16, baseZ + getCurvedZ(startX));
      scene.add(charData.group);

      pedestrianPool.push({
        id: i,
        archetype: archId,
        group: charData.group,
        leftLeg: charData.leftLeg,
        rightLeg: charData.rightLeg,
        leftArm: charData.leftArm,
        rightArm: charData.rightArm,
        headGroup: charData.headGroup,
        torsoMesh: charData.torsoMesh,
        noticeBadge: charData.noticeBadge,
        enteringBadge: charData.enteringBadge,
        x: startX,
        baseZ,
        speed: arch.speedMS * (0.85 + Math.random() * 0.3),
        direction: dir,
        walkPhase: Math.random() * Math.PI * 2,
        state: 'walking',
      });
    }
    actorsRef.current = pedestrianPool;

    // 10. Kinematics & Animation Loop
    let lastTime = performance.now();
    let animId: number;

    const animate = (time: number) => {
      animId = requestAnimationFrame(animate);
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      controls.update();

      const { patch: curPatch, simState: curSim } = latestProps.current;

      // Time & Lighting Dynamics (Smooth Sun/Moon Curve across the sky)
      const hour = curSim.minute / 60;
      const sunAngle = ((curSim.minute - 360) / 720) * Math.PI;

      let skyColor = new THREE.Color('#38bdf8');
      let sunIntensity = 1.45;
      let sunColor = new THREE.Color('#fffbeb');

      if (hour < 5.5 || hour > 20.5) {
        skyColor = new THREE.Color('#030712');
        sunIntensity = 0.05;
        sunColor = new THREE.Color('#1e293b');
        if (ambientLightRef.current) ambientLightRef.current.intensity = 0.28;
        if (storeInteriorLightRef.current) storeInteriorLightRef.current.intensity = 3.6;
        if (streetLamp1Ref.current) streetLamp1Ref.current.intensity = 2.4;
        if (streetLamp2Ref.current) streetLamp2Ref.current.intensity = 2.4;
        if (sunMeshRef.current) sunMeshRef.current.visible = false;
        if (moonMeshRef.current) moonMeshRef.current.visible = true;
      } else if (hour >= 5.5 && hour < 7.8) {
        skyColor = new THREE.Color('#fb923c');
        sunIntensity = 0.85;
        sunColor = new THREE.Color('#f97316');
        if (ambientLightRef.current) ambientLightRef.current.intensity = 0.48;
        if (storeInteriorLightRef.current) storeInteriorLightRef.current.intensity = 2.4;
        if (streetLamp1Ref.current) streetLamp1Ref.current.intensity = 0.8;
        if (streetLamp2Ref.current) streetLamp2Ref.current.intensity = 0.8;
        if (sunMeshRef.current) sunMeshRef.current.visible = true;
        if (moonMeshRef.current) moonMeshRef.current.visible = false;
      } else if (hour >= 17.5 && hour <= 20.5) {
        skyColor = new THREE.Color('#ea580c');
        sunIntensity = 0.95;
        sunColor = new THREE.Color('#f59e0b');
        if (ambientLightRef.current) ambientLightRef.current.intensity = 0.48;
        if (storeInteriorLightRef.current) storeInteriorLightRef.current.intensity = 3.0;
        if (streetLamp1Ref.current) streetLamp1Ref.current.intensity = 1.8;
        if (streetLamp2Ref.current) streetLamp2Ref.current.intensity = 1.8;
        if (sunMeshRef.current) sunMeshRef.current.visible = true;
        if (moonMeshRef.current) moonMeshRef.current.visible = false;
      } else {
        skyColor = new THREE.Color('#38bdf8');
        sunIntensity = 1.45;
        sunColor = new THREE.Color('#fffbeb');
        if (ambientLightRef.current) ambientLightRef.current.intensity = 0.65;
        if (storeInteriorLightRef.current) storeInteriorLightRef.current.intensity = 1.8;
        if (streetLamp1Ref.current) streetLamp1Ref.current.intensity = 0.0;
        if (streetLamp2Ref.current) streetLamp2Ref.current.intensity = 0.0;
        if (sunMeshRef.current) sunMeshRef.current.visible = true;
        if (moonMeshRef.current) moonMeshRef.current.visible = false;
      }

      scene.background = skyColor;
      if (scene.fog) scene.fog.color = skyColor;

      const sunX = Math.cos(sunAngle) * 15;
      const sunY = Math.max(0.5, Math.sin(sunAngle) * 13);
      if (dirLightRef.current) {
        dirLightRef.current.intensity = sunIntensity;
        dirLightRef.current.color = sunColor;
        dirLightRef.current.position.set(sunX, sunY, 8);
      }
      if (sunMeshRef.current) sunMeshRef.current.position.set(sunX, sunY, -4);

      // Intervention Props Visibility
      if (bladeSignRef.current) bladeSignRef.current.visible = curPatch.sign_type === 'blade';
      if (awningMeshRef.current) awningMeshRef.current.visible = !!curPatch.awning;
      if (bannerMeshRef.current) bannerMeshRef.current.visible = !!curPatch.use_user_banner;

      // Notice boost from banners or blade signs
      const hasNoticeBoost = !!curPatch.use_user_banner || curPatch.sign_type === 'blade';
      const noticeChanceMultiplier = hasNoticeBoost ? 2.5 : 1.0;

      // Pedestrian Kinematics
      const currentQueueCount = curSim.queueLength;
      const insideTargetCount = Math.min(3, curSim.serversBusy);

      let anyEntering = false;

      pedestrianPool.forEach((actor, index) => {
        actor.walkPhase += dt * actor.speed * 4.8;

        if (index < insideTargetCount) {
          actor.state = 'inside';
        } else if (index < insideTargetCount + Math.min(currentQueueCount, 6)) {
          actor.state = 'queuing';
          actor.queueIndex = index - insideTargetCount;
        } else if (actor.state === 'inside') {
          actor.state = 'walking';
          actor.x = doorX;
          actor.direction = Math.random() > 0.5 ? 1 : -1;
        }

        // Reactions visibility
        actor.noticeBadge.visible = actor.state === 'noticing';
        actor.enteringBadge.visible = actor.state === 'entering';

        if (actor.state === 'entering') anyEntering = true;

        switch (actor.state) {
          case 'walking': {
            actor.x += actor.direction * actor.speed * dt;

            // Follow curved sidewalk!
            const curvedZ = actor.baseZ + getCurvedZ(actor.x);
            actor.group.position.x = actor.x;
            actor.group.position.z = curvedZ;

            // Align rotation with sidewalk curvature tangent!
            const tangent = getTangentAngle(actor.x);
            actor.group.rotation.y = (actor.direction === 1 ? Math.PI / 2 : -Math.PI / 2) - tangent;

            // Leg & Arm Swing
            const legSwing = Math.sin(actor.walkPhase) * 0.48;
            actor.leftLeg.rotation.x = legSwing;
            actor.rightLeg.rotation.x = -legSwing;
            actor.leftArm.rotation.x = -legSwing * 0.5;
            actor.rightArm.rotation.x = legSwing * 0.5;
            actor.headGroup.rotation.y = 0;
            actor.headGroup.rotation.x = 0;

            // Check notice store window & banner chance
            const distToWindow = Math.abs(actor.x - (-0.95));
            if (distToWindow < 2.0 && !actor.noticeTimer && Math.random() < 0.035 * noticeChanceMultiplier) {
              actor.state = 'noticing';
              actor.noticeTimer = 2.4;
            }

            // Check enter store chance (pedestrians near door deciding to enter!)
            const distToDoor = Math.abs(actor.x - doorX);
            if (distToDoor < 1.4 && !actor.enterTimer && Math.random() < 0.025 * noticeChanceMultiplier) {
              actor.state = 'entering';
              actor.enterTimer = 1.8;
            }

            // Wrap boundaries
            if (actor.direction === 1 && actor.x > 8.5) {
              actor.x = -8.5;
            } else if (actor.direction === -1 && actor.x < -8.5) {
              actor.x = 8.5;
            }
            break;
          }

          case 'noticing': {
            // Stops and turns head toward storefront/banner!
            actor.noticeTimer = (actor.noticeTimer || 2.4) - dt;

            // Faces storefront
            actor.group.rotation.y = Math.PI;
            actor.headGroup.rotation.y = Math.sin(time * 0.003) * 0.25;
            actor.headGroup.rotation.x = -0.15; // Looks up at signage

            actor.leftLeg.rotation.x = 0;
            actor.rightLeg.rotation.x = 0;

            // Floating bounce on notice badge
            actor.noticeBadge.position.y = 2.05 + Math.sin(time * 0.006) * 0.05;

            if ((actor.noticeTimer || 0) <= 0) {
              // 40% chance to decide to enter after looking!
              if (Math.random() < 0.4) {
                actor.state = 'entering';
                actor.enterTimer = 1.8;
              } else {
                actor.state = 'walking';
                actor.noticeTimer = 0;
              }
            }
            break;
          }

          case 'entering': {
            // Steps directly toward the glass entrance door!
            actor.enterTimer = (actor.enterTimer || 1.8) - dt;

            // Steer towards door threshold
            actor.x = THREE.MathUtils.damp(actor.x, doorX, 3.5, dt);
            const targetDoorZ = -0.9 + getCurvedZ(doorX);
            const curZ = THREE.MathUtils.damp(actor.group.position.z, targetDoorZ, 3.5, dt);

            actor.group.position.set(actor.x, 0.16, curZ);
            actor.group.rotation.y = 0; // Faces directly into the store!

            // Walking into store
            const legSwing = Math.sin(actor.walkPhase) * 0.35;
            actor.leftLeg.rotation.x = legSwing;
            actor.rightLeg.rotation.x = -legSwing;

            actor.enteringBadge.position.y = 2.05 + Math.sin(time * 0.008) * 0.05;

            if ((actor.enterTimer || 0) <= 0) {
              actor.state = 'inside';
              actor.enterTimer = 0;
            }
            break;
          }

          case 'queuing': {
            const qIdx = Math.max(0, actor.queueIndex || 0);
            const targetQx = doorX - (qIdx % 5) * 0.55;
            const targetQz = 0.25 + Math.floor(qIdx / 5) * 0.45 + getCurvedZ(targetQx);

            actor.x = THREE.MathUtils.damp(actor.x, targetQx, 4.0, dt);
            const curZ = THREE.MathUtils.damp(actor.group.position.z, targetQz, 4.0, dt);
            actor.group.position.set(actor.x, 0.16, curZ);
            actor.group.rotation.y = 0;

            actor.leftLeg.rotation.x = 0;
            actor.rightLeg.rotation.x = 0;
            break;
          }

          case 'inside': {
            actor.group.position.set(-0.8 + (index % 3) * 0.4, 0.16, -1.8);
            actor.group.rotation.y = 0;
            actor.leftLeg.rotation.x = 0;
            actor.rightLeg.rotation.x = 0;
            break;
          }
        }
      });

      // Door Swing Pivot (Opens outward smoothly when someone is entering)
      if (doorPivotRef.current) {
        const targetDoorAngle = anyEntering ? -0.85 : 0;
        doorPivotRef.current.rotation.y = THREE.MathUtils.damp(
          doorPivotRef.current.rotation.y,
          targetDoorAngle,
          6.0,
          dt
        );
      }

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [
    userConfig.address,
    userConfig.shopName,
    userConfig.kind,
    stillSvgUrl,
    sceneGraph.architectureStyle,
    sceneGraph.streetCurvature,
    neighbors,
  ]);

  const setCameraView = (view: 'street' | 'facade' | 'overview') => {
    setActiveCamPreset(view);
    const cam = cameraRef.current;
    const ctrl = controlsRef.current;
    if (!cam || !ctrl) return;

    if (view === 'street') {
      cam.position.set(0, 1.85, 7.6);
      ctrl.target.set(0, 1.35, 0);
    } else if (view === 'facade') {
      cam.position.set(0, 1.6, 4.2);
      ctrl.target.set(0, 1.45, -0.9);
    } else if (view === 'overview') {
      cam.position.set(0, 7.5, 9.5);
      ctrl.target.set(0, 0.6, 0.5);
    }
    ctrl.update();
  };

  const queueCount = Math.min(6, simState.queueLength);
  const insideCount = Math.min(3, simState.serversBusy);
  const windowCount = Math.min(4, Math.round(simState.minuteNoticed * 0.7));
  const walkingCount = Math.max(0, 22 - queueCount - insideCount - windowCount);

  return (
    <div className="flex flex-col bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden shadow-sm">
      {/* 3D WebGL Canvas Viewport */}
      <div className="relative w-full h-[460px] sm:h-[500px] bg-neutral-950 overflow-hidden">
        <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

        {/* Top-Right Camera Controls */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-neutral-900/90 backdrop-blur-sm p-1 rounded-lg border border-neutral-800 text-xs shadow-sm">
          <button
            onClick={() => setCameraView('street')}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              activeCamPreset === 'street'
                ? 'bg-neutral-800 text-white font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Street View
          </button>
          <button
            onClick={() => setCameraView('facade')}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              activeCamPreset === 'facade'
                ? 'bg-neutral-800 text-white font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Storefront
          </button>
          <button
            onClick={() => setCameraView('overview')}
            className={`px-2.5 py-1 text-xs rounded transition-colors ${
              activeCamPreset === 'overview'
                ? 'bg-neutral-800 text-white font-medium'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Overview
          </button>
        </div>

        {/* Bottom Status Bar */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 bg-neutral-900/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-neutral-800 text-xs text-neutral-300 shadow-sm pointer-events-auto">
            <span className="text-neutral-400">Curved Sidewalk Flow:</span>
            <span>{walkingCount} Walking</span>
            <span className="text-neutral-600">·</span>
            <span className="text-amber-400">{windowCount} Noticing Store (👀)</span>
            <span className="text-neutral-600">·</span>
            <span className={queueCount > 3 ? 'text-amber-400 font-medium' : ''}>{queueCount} In Queue</span>
            <span className="text-neutral-600">·</span>
            <span className="text-emerald-400 font-medium">{insideCount} Entering / Inside (🚪)</span>
          </div>

          <div className="hidden md:flex items-center gap-2 bg-neutral-900/90 backdrop-blur-sm px-2.5 py-1.5 rounded-lg border border-neutral-800 text-[11px] text-neutral-400 pointer-events-auto">
            <span>Drag to rotate</span>
            <span className="text-neutral-600">·</span>
            <span>Scroll to zoom</span>
          </div>
        </div>
      </div>

      {/* Unified Time-of-Day Bar */}
      <div className="p-4 border-t border-neutral-800 flex flex-col gap-3.5 bg-neutral-900">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {onTogglePlay && (
              <button
                onClick={onTogglePlay}
                className="w-8 h-8 rounded-lg bg-neutral-800 hover:bg-neutral-750 flex items-center justify-center text-white transition-colors cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-semibold text-white tracking-tight">
                {simState.clockString}
              </span>
              <span className="text-xs text-neutral-400">
                {simState.isWeekend ? 'Weekend' : 'Weekday'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => onTimeChange?.(510)}
              className={`px-2.5 py-1 rounded transition-colors text-xs cursor-pointer ${
                Math.abs(simState.minute - 510) < 45
                  ? 'bg-neutral-800 text-white font-medium border border-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Morning (08:30)
            </button>
            <button
              onClick={() => onTimeChange?.(750)}
              className={`px-2.5 py-1 rounded transition-colors text-xs cursor-pointer ${
                Math.abs(simState.minute - 750) < 45
                  ? 'bg-neutral-800 text-white font-medium border border-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Lunch (12:30)
            </button>
            <button
              onClick={() => onTimeChange?.(930)}
              className={`px-2.5 py-1 rounded transition-colors text-xs cursor-pointer ${
                Math.abs(simState.minute - 930) < 45
                  ? 'bg-neutral-800 text-white font-medium border border-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Afternoon (15:30)
            </button>
            <button
              onClick={() => onTimeChange?.(1110)}
              className={`px-2.5 py-1 rounded transition-colors text-xs cursor-pointer ${
                Math.abs(simState.minute - 1110) < 45
                  ? 'bg-neutral-800 text-white font-medium border border-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Evening (18:30)
            </button>
            <button
              onClick={() => onTimeChange?.(1260)}
              className={`px-2.5 py-1 rounded transition-colors text-xs cursor-pointer ${
                Math.abs(simState.minute - 1260) < 45
                  ? 'bg-neutral-800 text-white font-medium border border-neutral-700'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Night (21:00)
            </button>

            <div className="flex items-center bg-neutral-950 p-0.5 rounded border border-neutral-800 ml-1">
              <button
                onClick={() => onDowChange?.(1)}
                className={`px-2 py-0.5 text-xs rounded transition-colors cursor-pointer ${
                  !simState.isWeekend ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Weekday
              </button>
              <button
                onClick={() => onDowChange?.(6)}
                className={`px-2 py-0.5 text-xs rounded transition-colors cursor-pointer ${
                  simState.isWeekend ? 'bg-neutral-800 text-white font-medium' : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Weekend
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-neutral-500 shrink-0">00:00</span>
          <input
            type="range"
            min="0"
            max="1439"
            step="5"
            value={simState.minute}
            onChange={(e) => onTimeChange?.(parseInt(e.target.value, 10))}
            className="w-full accent-neutral-300 h-1 bg-neutral-800 rounded cursor-pointer"
          />
          <span className="text-[11px] font-mono text-neutral-500 shrink-0">23:59</span>
        </div>

        <div className="text-xs text-neutral-300 bg-neutral-950/60 border border-neutral-800/80 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="font-medium text-white">{simState.regimeCopyEn}</span>
            <span className="mx-2 text-neutral-600">·</span>
            <span className="text-neutral-400">{simState.timeInsightEn}</span>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-[11px] text-neutral-400 font-mono">
            <span>Passers: <strong className="text-neutral-200">{Math.round(simState.currentPassPerMin)}/min</strong></span>
            <span>Sales: <strong className="text-emerald-400">₩{Math.round(simState.minuteRevenueKRW).toLocaleString()}/min</strong></span>
            <span>Wait: <strong className={simState.waitMinutes > 3 ? 'text-amber-400' : 'text-neutral-200'}>{simState.waitMinutes.toFixed(1)}m</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
