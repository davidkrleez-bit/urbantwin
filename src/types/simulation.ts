export type ShopFamily = 'cafe' | 'restaurant' | 'clothing' | 'popup' | 'other';

export type PriceBand = 'budget' | 'typical' | 'premium' | 'luxury';

export type StaffingMode = 'solo' | 'duo' | 'team';

export type SignType = 'facade' | 'blade' | 'a_board' | 'standing_poster' | 'facade_and_poster';

export type ArchetypeId = 'commuter' | 'lunch' | 'stroller' | 'trendsetter' | 'tourist' | 'resident';

export type DistrictClass = 
  | 'weekend_young_hotspot' 
  | 'office_commute' 
  | 'tourist_corridor' 
  | 'mixed_neighborhood' 
  | 'mall_anchor';

export interface InterventionPatch {
  price_factor?: number; // 0.5 - 1.5
  weekday_discount?: number; // 0 - 0.5 (Mon-Fri only)
  sign_type?: SignType;
  use_user_banner?: boolean;
  flyer_person?: boolean;
  extra_servers?: number; // 0 - 3
  awning?: boolean;
}

export interface StorefrontBay {
  id: string;
  x0: number; // normalized 0 - 1
  x1: number;
  width_m: number;
  role: 'target' | 'neighbor';
  cue?: string;
  name?: string;
  family?: ShopFamily;
  dailyVisits?: number;
}

export interface SceneGraph {
  target_bay: { x0: number; x1: number; width_m: number };
  bays: StorefrontBay[];
  sidewalk: { y0: number; y1: number; width_m: number };
  road: { y0: number; y1: number };
  props: { kind: 'tree' | 'pole' | 'hydrant'; x: number; y: number }[];
  occlusion: number;
  sign_visibility: number;
  photogenic: number;
  crosswalk_near: boolean;
  queue_space_m: number;
  corner: { end: 'subway_side' | 'other'; x: number };
  architectureStyle?: 'modern_highrise' | 'boutique_brick' | 'classic_boulevard' | 'neighborhood_commercial';
  streetCurvature?: number;
  buildingHeightStories?: number;
  facadeColor?: string;
}

export interface DistrictInfo {
  district_class: DistrictClass;
  district_name_ko: string;
  district_name_en: string;
  hotspot_score: number;
  line_evidence: number;
  tourist_score: number;
  office_score: number;
  young_trend_score: number;
  narrative_ko: string;
  narrative_en: string;
  area_typical_krw: number;
  area_price_note_ko: string;
  daily_passers_estimate?: number;
  peak_hours_ko?: string;
  peak_hours_en?: string;
  demographics_summary_ko?: string;
  demographics_summary_en?: string;
}

export interface UserShopConfig {
  address: string;
  presetId?: string;
  shopName: string;
  family: ShopFamily;
  kind: string;
  priceBand: PriceBand;
  exactPriceKRW: number;
  bannerUrl?: string;
  bannerFileName?: string;
  bannerScore?: {
    distance_readability: number;
    contrast: number;
    photogenic: number;
    has_clear_wordmark: boolean;
    note_ko: string;
    note_en?: string;
  };
  staffingMode: StaffingMode;
  serversCount: number;
  openHour: number;
  closeHour: number;
  monthlyRentKRW?: number;
  operatingNote: string;
  serviceSeconds: number;
}

export interface StepSimulationState {
  minute: number; // 0 - 1439
  clockString: string; // "14:30"
  hour: number;
  dow: number; // 0=Sun, 1=Mon, ..., 6=Sat
  isWeekend: boolean;
  activeArchetype: ArchetypeId;
  currentPassPerMin: number;
  queueLength: number;
  waitMinutes: number;
  serversBusy: number;
  effectiveServers: number;
  isSpilling: boolean;
  regime: 'classic_balk' | 'prestige_signal';
  regimeCopy: string;
  regimeCopyEn: string;
  timeInsightEn: string; // Dynamic business insight for this time of day

  // Minute step breakdown
  minutePassers: number;
  minuteFlyersTaken: number;
  minuteNoticed: number;
  minuteIntended: number;
  minuteJoined: number;
  minuteBalked: number;
  minuteReneged: number;
  minuteServed: number;
  minuteRevenueKRW: number;

  // Cumulative for today
  cumPassers: number;
  cumFlyersTaken: number;
  cumNoticed: number;
  cumIntended: number;
  cumJoined: number;
  cumServed: number;
  cumBalked: number;
  cumReneged: number;
  cumRevenueKRW: number;
  cumBalkedLossKRW: number;
  peakQueue: number;
  spillMinutes: number;
}

export interface FullDayProjection {
  totalRevenueKRW: number;
  totalPassers: number;
  totalNoticed: number;
  totalJoined: number;
  totalServed: number;
  totalBalked: number;
  totalBalkedLossKRW: number;
  peakQueue: number;
  spillMinutes: number;
}

export interface HorizonSummary {
  days30RevenueKRW: number;
  days30WeekdayRev: number;
  days30WeekendRev: number;
  days30Served: number;
  days365RevenueKRW: number;
  days365Range: [number, number]; // [0.8x, 1.2x]
  breakEvenMonthlyRentKRW: number;
  monthlyLaborCostKRW: number;
  cogsCostKRW: number;
  monthsProfitable: number;
}

export interface NeighborShop {
  id: string;
  name: string;
  family: ShopFamily;
  kindKo: string;
  kindEn?: string;
  distM: number;
  rating: number;
  userRatingCount: number;
  priceLevel: number;
  estimatedDailyNoticed: number;
  estimatedDailyVisits: number;
  relation: '나눔' | '끌림';
}

export interface PresetLocation {
  id: string;
  nameKo: string;
  nameEn: string;
  address: string;
  lat: number;
  lng: number;
  districtClass: DistrictClass;
  stillSvg: string;
  staticMapUrl?: string;
  sceneGraph: SceneGraph;
  districtInfo: DistrictInfo;
  neighbors: NeighborShop[];
  anchors: {
    id: string;
    name: string;
    type: 'subway' | 'bus' | 'park' | 'mall' | 'university' | 'landmark';
    walkMin: number;
    lat: number;
    lng: number;
  }[];
}

export interface ExperimentRow {
  id: string;
  name: string;
  category: 'baseline' | 'pricing' | 'staffing' | 'marketing' | 'operations';
  description: string;
  patch: InterventionPatch;
  dailyRevenueKRW: number;
  revenueDeltaPct: number;
  dailyServed: number;
  conversionRatePct: number;
  avgWaitMin: number;
  balkedCustomers: number;
  activeIn3D: boolean;
  balkedLossKRW?: number;
  days30RevenueKRW?: number;
  rank?: number;
  isBest?: boolean;
}
