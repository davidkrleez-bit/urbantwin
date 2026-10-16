import { PresetLocation } from '../types/simulation';

// Helper to generate a realistic wide-angle (fov=120) Seoul storefront Street View still SVG
function generateStreetViewSvg(options: {
  leftName: string;
  leftCategory: string;
  leftColor: string;
  rightName: string;
  rightCategory: string;
  rightColor: string;
  streetName: string;
  buildingStyle: 'redbrick' | 'modern_glass' | 'concrete_industrial' | 'classic_retail';
}): string {
  const { leftName, leftCategory, leftColor, rightName, rightCategory, rightColor, streetName, buildingStyle } = options;
  
  const wallFill = buildingStyle === 'redbrick' ? '#7f2824' :
                   buildingStyle === 'modern_glass' ? '#334155' :
                   buildingStyle === 'concrete_industrial' ? '#475569' : '#52525b';
  
  const brickPattern = buildingStyle === 'redbrick' ? `
    <pattern id="brick" width="20" height="10" patternUnits="userSpaceOnUse">
      <rect width="20" height="10" fill="#7f2824"/>
      <rect x="0" y="0" width="19" height="4.5" fill="#99322c"/>
      <rect x="10" y="5" width="19" height="4.5" fill="#8f2b26"/>
    </pattern>` : '';

  return `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600" width="1200" height="600">
  <defs>
    ${brickPattern}
    <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#93c5fd"/>
      <stop offset="60%" stop-color="#e2e8f0"/>
      <stop offset="100%" stop-color="#f8fafc"/>
    </linearGradient>
    <linearGradient id="asphaltGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#334155"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="sidewalkGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#94a3b8"/>
    </linearGradient>
    <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Sky -->
  <rect x="0" y="0" width="1200" height="320" fill="url(#skyGrad)"/>

  <!-- Upper Building Facades (2nd & 3rd Floors) -->
  <rect x="0" y="80" width="1200" height="240" fill="${buildingStyle === 'redbrick' ? 'url(#brick)' : wallFill}"/>
  
  <!-- Architectural Upper Windows -->
  <g fill="#1e293b" opacity="0.85">
    <rect x="80" y="110" width="70" height="90" rx="2"/>
    <rect x="180" y="110" width="70" height="90" rx="2"/>
    <rect x="340" y="110" width="80" height="90" rx="2"/>
    <rect x="440" y="110" width="80" height="90" rx="2"/>
    <rect x="540" y="110" width="80" height="90" rx="2"/>
    <rect x="680" y="110" width="80" height="90" rx="2"/>
    <rect x="780" y="110" width="80" height="90" rx="2"/>
    <rect x="940" y="110" width="70" height="90" rx="2"/>
    <rect x="1040" y="110" width="70" height="90" rx="2"/>
  </g>

  <!-- 1st Floor Storefront Row -->
  <!-- Bay 1: Left Neighbor (x: 0 to 440) -->
  <g id="bay-left">
    <rect x="40" y="220" width="400" height="190" fill="#1e293b"/>
    <!-- Awning / Signboard -->
    <rect x="30" y="210" width="420" height="42" fill="${leftColor}" filter="url(#shadow)"/>
    <text x="240" y="238" font-family="'Pretendard', sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">${leftName}</text>
    <text x="240" y="250" font-family="'Pretendard', sans-serif" font-size="11" fill="#e2e8f0" text-anchor="middle">${leftCategory}</text>
    <!-- Show Windows & Door -->
    <rect x="60" y="260" width="160" height="145" fill="#38bdf8" opacity="0.35"/>
    <rect x="240" y="260" width="80" height="145" fill="#0f172a" stroke="#64748b" stroke-width="3"/>
    <rect x="340" y="260" width="80" height="145" fill="#38bdf8" opacity="0.35"/>
  </g>

  <!-- Bay 2: Target Shopfront (x: 460 to 740) -->
  <g id="bay-target">
    <rect x="460" y="220" width="280" height="190" fill="#0f172a"/>
    <!-- Sign Area for Target Shop -->
    <rect x="450" y="210" width="300" height="45" fill="#1e293b" stroke="#f97316" stroke-width="2" stroke-dasharray="6,4" filter="url(#shadow)"/>
    <text x="600" y="238" font-family="'Pretendard', sans-serif" font-size="18" font-weight="bold" fill="#f97316" text-anchor="middle">입점 후보 공간 (선택 매장)</text>
    <!-- Target Glass Facade & Doorway -->
    <rect x="475" y="265" width="115" height="140" fill="#38bdf8" opacity="0.4" stroke="#475569" stroke-width="2"/>
    <rect x="605" y="265" width="80" height="140" fill="#1e293b" stroke="#f97316" stroke-width="2"/>
    <circle cx="615" cy="335" r="4" fill="#f97316"/>
    <rect x="700" y="265" width="30" height="140" fill="#38bdf8" opacity="0.4"/>
  </g>

  <!-- Bay 3: Right Neighbor (x: 760 to 1160) -->
  <g id="bay-right">
    <rect x="760" y="220" width="400" height="190" fill="#18181b"/>
    <!-- Signboard -->
    <rect x="750" y="210" width="420" height="42" fill="${rightColor}" filter="url(#shadow)"/>
    <text x="960" y="238" font-family="'Pretendard', sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">${rightName}</text>
    <text x="960" y="250" font-family="'Pretendard', sans-serif" font-size="11" fill="#e2e8f0" text-anchor="middle">${rightCategory}</text>
    <!-- Windows & Display -->
    <rect x="780" y="260" width="150" height="145" fill="#38bdf8" opacity="0.35"/>
    <rect x="950" y="260" width="85" height="145" fill="#09090b" stroke="#52525b" stroke-width="3"/>
    <rect x="1055" y="260" width="85" height="145" fill="#38bdf8" opacity="0.35"/>
  </g>

  <!-- Sidewalk with Urban Paving Pattern -->
  <rect x="0" y="410" width="1200" height="90" fill="url(#sidewalkGrad)"/>
  <line x1="0" y1="440" x2="1200" y2="440" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="20,10"/>
  <line x1="0" y1="470" x2="1200" y2="470" stroke="#94a3b8" stroke-width="1.5" stroke-dasharray="20,10"/>

  <!-- Street Props: Sidewalk Trees & Lamp Posts -->
  <!-- Tree at x=180 -->
  <circle cx="180" cy="460" r="16" fill="#475569"/>
  <rect x="176" y="360" width="8" height="100" fill="#5c3a21"/>
  <circle cx="180" cy="330" r="45" fill="#15803d" opacity="0.9"/>
  <circle cx="195" cy="315" r="35" fill="#16a34a" opacity="0.9"/>

  <!-- Street Lamp at x=980 -->
  <rect x="978" y="280" width="6" height="180" fill="#334155"/>
  <circle cx="981" cy="275" r="9" fill="#fef08a" opacity="0.9"/>

  <!-- Curb Stone -->
  <rect x="0" y="496" width="1200" height="12" fill="#64748b"/>

  <!-- Asphalt Roadway -->
  <rect x="0" y="508" width="1200" height="92" fill="url(#asphaltGrad)"/>
  <!-- Road Center Dashed Line -->
  <line x1="0" y1="554" x2="1200" y2="554" stroke="#facc15" stroke-width="4" stroke-dasharray="40,30"/>

  <!-- Corner Street Label & Attribution Watermark -->
  <rect x="20" y="20" width="220" height="34" rx="4" fill="#0f172a" opacity="0.85"/>
  <text x="32" y="42" font-family="'Pretendard', sans-serif" font-size="13" font-weight="bold" fill="#f8fafc">📍 ${streetName}</text>
  <text x="1170" y="585" font-family="'Pretendard', sans-serif" font-size="11" fill="#94a3b8" text-anchor="end">Street View Panorama · 120° FOV</text>
</svg>
`)}`;
}

export const SEOUL_PRESETS: PresetLocation[] = [
  {
    id: 'seongsu',
    nameKo: '성수 · 연무장길',
    nameEn: 'Seongsu Yeonmujang-gil',
    address: '서울특별시 성동구 연무장길 45',
    lat: 37.5435,
    lng: 127.0562,
    districtClass: 'weekend_young_hotspot',
    stillSvg: '/api/streetview-image?lat=37.5435&lng=127.0562',
    staticMapUrl: '/api/static-map?lat=37.5435&lng=127.0562',
    sceneGraph: {
      target_bay: { x0: 0.38, x1: 0.62, width_m: 4.8 },
      bays: [
        { id: 'left_1', x0: 0.05, x1: 0.38, width_m: 6.2, role: 'neighbor', cue: '붉은벽돌 카페 어닝', name: 'OUDE CAFE', family: 'cafe', dailyVisits: 380 },
        { id: 'target', x0: 0.38, x1: 0.62, width_m: 4.8, role: 'target', cue: '유리 파사드 공실', name: '선택 매장' },
        { id: 'right_1', x0: 0.62, x1: 0.95, width_m: 6.5, role: 'neighbor', cue: '아카이브 셀렉트숍', name: 'POINT OF VIEW', family: 'other', dailyVisits: 420 },
      ],
      sidewalk: { y0: 0.68, y1: 0.83, width_m: 2.8 },
      road: { y0: 0.83, y1: 1.0 },
      props: [
        { kind: 'tree', x: 0.15, y: 0.74 },
        { kind: 'pole', x: 0.82, y: 0.75 },
      ],
      occlusion: 0.22,
      sign_visibility: 0.65,
      photogenic: 0.85,
      crosswalk_near: true,
      queue_space_m: 3.5,
      corner: { end: 'subway_side', x: 0.08 },
    },
    districtInfo: {
      district_class: 'weekend_young_hotspot',
      district_name_ko: '성수',
      district_name_en: 'Seongsu',
      hotspot_score: 0.92,
      line_evidence: 0.85,
      tourist_score: 0.45,
      office_score: 0.40,
      young_trend_score: 0.95,
      narrative_ko: '성수동 연무장길은 젊은 2030 트렌드세터와 팝업 방문객이 집결하는 대한민국 대표 핫플레이스입니다. 주말 오후에는 대기열 자체가 인스타그래머블한 신호로 작동하며, 독창적인 쇼룸과 빈티지/패션 매장의 객단가 저항이 상대적으로 낮습니다.',
      narrative_en: 'Seongsu Yeonmujang-gil is Seoul’s premier creative hub for young trendsetters and popups. On weekend afternoons, a visible queue acts as a prestige signal.',
      area_typical_krw: 76000,
      area_price_note_ko: '이 블록 의류·빈티지 및 핫플 기준 평균 객단가는 약 ₩76,000선으로 높게 형성되어 있습니다.',
    },
    neighbors: [
      { id: 'n1', name: '아더에러 성수 스페이스', family: 'clothing', kindKo: '패션 플래그십', distM: 45, rating: 4.6, userRatingCount: 1420, priceLevel: 3, estimatedDailyNoticed: 1850, estimatedDailyVisits: 340, relation: '끌림' },
      { id: 'n2', name: '포인트오브뷰 성수', family: 'other', kindKo: '디자인 문구점', distM: 15, rating: 4.7, userRatingCount: 2890, priceLevel: 2, estimatedDailyNoticed: 2100, estimatedDailyVisits: 420, relation: '끌림' },
      { id: 'n3', name: '오우드 카페 성수', family: 'cafe', kindKo: '베이커리 카페', distM: 35, rating: 4.4, userRatingCount: 940, priceLevel: 2, estimatedDailyNoticed: 1500, estimatedDailyVisits: 310, relation: '나눔' },
      { id: 'n4', name: 'LCDC SEOUL 셀렉트샵', family: 'clothing', kindKo: '복합문화 편집숍', distM: 110, rating: 4.5, userRatingCount: 1820, priceLevel: 3, estimatedDailyNoticed: 1400, estimatedDailyVisits: 280, relation: '끌림' },
    ],
    anchors: [
      { id: 'a1', name: '2호선 성수역 4번출구', type: 'subway', walkMin: 4, lat: 37.5445, lng: 127.0560 },
      { id: 'a2', name: '뚝섬역 5번출구', type: 'subway', walkMin: 9, lat: 37.5471, lng: 127.0473 },
      { id: 'a3', name: '서울숲 공원 진입로', type: 'park', walkMin: 14, lat: 37.5442, lng: 127.0375 },
    ],
  },
  {
    id: 'yeouido',
    nameKo: '여의도 · 국제금융로',
    nameEn: 'Yeouido Financial District',
    address: '서울특별시 영등포구 국제금융로8길 25',
    lat: 37.5255,
    lng: 126.9245,
    districtClass: 'office_commute',
    stillSvg: '/api/streetview-image?lat=37.5255&lng=126.9245',
    staticMapUrl: '/api/static-map?lat=37.5255&lng=126.9245',
    sceneGraph: {
      target_bay: { x0: 0.38, x1: 0.62, width_m: 4.5 },
      bays: [
        { id: 'left_1', x0: 0.05, x1: 0.38, width_m: 5.8, role: 'neighbor', cue: '통유리 에스프레소 바', name: 'FINANCE COFFEE', family: 'cafe', dailyVisits: 520 },
        { id: 'target', x0: 0.38, x1: 0.62, width_m: 4.5, role: 'target', cue: '오피스 빌딩 1층 매장', name: '선택 매장' },
        { id: 'right_1', x0: 0.62, x1: 0.95, width_m: 6.0, role: 'neighbor', cue: '샐러드 테이크아웃', name: 'LUNCH SALAD', family: 'restaurant', dailyVisits: 410 },
      ],
      sidewalk: { y0: 0.68, y1: 0.83, width_m: 4.2 },
      road: { y0: 0.83, y1: 1.0 },
      props: [
        { kind: 'tree', x: 0.22, y: 0.74 },
        { kind: 'pole', x: 0.78, y: 0.75 },
      ],
      occlusion: 0.15,
      sign_visibility: 0.75,
      photogenic: 0.55,
      crosswalk_near: true,
      queue_space_m: 6.0,
      corner: { end: 'subway_side', x: 0.05 },
    },
    districtInfo: {
      district_class: 'office_commute',
      district_name_ko: '여의도',
      district_name_en: 'Yeouido',
      hotspot_score: 0.30,
      line_evidence: 0.20,
      tourist_score: 0.25,
      office_score: 0.98,
      young_trend_score: 0.35,
      narrative_ko: '여의도 금융 오피스 거리는 평일 출퇴근(08:00~09:30)과 점심시간(11:30~13:00)에 압도적인 통행량이 집중됩니다. 대기 시간이 길어지면 출근 직장인이 즉시 이탈하므로, 빠른 회전율과 테이크아웃 효율이 매출의 핵심입니다.',
      narrative_en: 'Yeouido is Seoul’s premier financial hub with massive weekday rush hours. Queues cause rapid commuter balking, so service speed is vital.',
      area_typical_krw: 9500,
      area_price_note_ko: '이 블록 카페 및 간편식 기준 평균 가격은 ₩9,500선으로 빠른 테이크아웃 친화적입니다.',
    },
    neighbors: [
      { id: 'ny1', name: '테라로사 여의도점', family: 'cafe', kindKo: '스페셜티 카페', distM: 60, rating: 4.5, userRatingCount: 1650, priceLevel: 2, estimatedDailyNoticed: 3200, estimatedDailyVisits: 560, relation: '나눔' },
      { id: 'ny2', name: '여의도 직장인 샐러디', family: 'restaurant', kindKo: '샐러드 전문점', distM: 25, rating: 4.3, userRatingCount: 780, priceLevel: 1, estimatedDailyNoticed: 2400, estimatedDailyVisits: 410, relation: '나눔' },
      { id: 'ny3', name: 'IFC몰 지하 F&B 거리', family: 'restaurant', kindKo: '쇼핑몰 식음료', distM: 140, rating: 4.4, userRatingCount: 4200, priceLevel: 3, estimatedDailyNoticed: 5800, estimatedDailyVisits: 890, relation: '나눔' },
    ],
    anchors: [
      { id: 'ay1', name: '5호선·9호선 여의도역 3번출구', type: 'subway', walkMin: 3, lat: 37.5218, lng: 126.9242 },
      { id: 'ay2', name: '여의도 환승센터 버스정류장', type: 'bus', walkMin: 4, lat: 37.5240, lng: 126.9255 },
      { id: 'ay3', name: '여의도 더현대 서울', type: 'mall', walkMin: 5, lat: 37.5259, lng: 126.9284 },
    ],
  },
  {
    id: 'yeonnam',
    nameKo: '연남 · 경의선숲길',
    nameEn: 'Yeonnam Forest Park',
    address: '서울특별시 마포구 동교로38길 33',
    lat: 37.5621,
    lng: 126.9248,
    districtClass: 'mixed_neighborhood',
    stillSvg: '/api/streetview-image?lat=37.5621&lng=126.9248',
    staticMapUrl: '/api/static-map?lat=37.5621&lng=126.9248',
    sceneGraph: {
      target_bay: { x0: 0.38, x1: 0.62, width_m: 4.6 },
      bays: [
        { id: 'left_1', x0: 0.05, x1: 0.38, width_m: 6.0, role: 'neighbor', cue: '원목 말차 카페', name: 'MATCHA LAB', family: 'cafe', dailyVisits: 310 },
        { id: 'target', x0: 0.38, x1: 0.62, width_m: 4.6, role: 'target', cue: '골목 모퉁이 1층 상가', name: '선택 매장' },
        { id: 'right_1', x0: 0.62, x1: 0.95, width_m: 6.2, role: 'neighbor', cue: '벽돌 독립서점', name: 'FOREST BOOKS', family: 'other', dailyVisits: 190 },
      ],
      sidewalk: { y0: 0.68, y1: 0.83, width_m: 2.5 },
      road: { y0: 0.83, y1: 1.0 },
      props: [
        { kind: 'tree', x: 0.18, y: 0.74 },
        { kind: 'pole', x: 0.85, y: 0.75 },
      ],
      occlusion: 0.28,
      sign_visibility: 0.62,
      photogenic: 0.80,
      crosswalk_near: false,
      queue_space_m: 3.0,
      corner: { end: 'subway_side', x: 0.1 },
    },
    districtInfo: {
      district_class: 'mixed_neighborhood',
      district_name_ko: '연남',
      district_name_en: 'Yeonnam',
      hotspot_score: 0.75,
      line_evidence: 0.65,
      tourist_score: 0.50,
      office_score: 0.25,
      young_trend_score: 0.88,
      narrative_ko: '연남동 경의선 숲길 골목은 평일 오후의 여유로운 산책자(Stroller)와 주말 나들이족이 혼합된 골목상권입니다. 아기자기한 감성의 베이커리, 디저트, 소품샵이 도보 유입을 이끕니다.',
      narrative_en: 'Yeonnam Forest Park is a charming mixed neighborhood popular with strollers, couples, and weekend cafe visitors.',
      area_typical_krw: 18000,
      area_price_note_ko: '이 블록 카페 및 식음료 기준 평균 객단가는 ₩18,000 수준으로 친근하고 안정적입니다.',
    },
    neighbors: [
      { id: 'nyn1', name: '연남 레이어드 베이커리', family: 'cafe', kindKo: '스콘 베이커리', distM: 40, rating: 4.6, userRatingCount: 2400, priceLevel: 2, estimatedDailyNoticed: 1900, estimatedDailyVisits: 390, relation: '끌림' },
      { id: 'nyn2', name: '독립서점 동진시장 북스', family: 'other', kindKo: '독립출판 서점', distM: 65, rating: 4.7, userRatingCount: 520, priceLevel: 2, estimatedDailyNoticed: 950, estimatedDailyVisits: 140, relation: '끌림' },
    ],
    anchors: [
      { id: 'ayn1', name: '2호선·경의중앙선 홍대입구역 3번출구', type: 'subway', walkMin: 6, lat: 37.5575, lng: 126.9240 },
      { id: 'ayn2', name: '경의선숲길 잔디광장', type: 'park', walkMin: 2, lat: 37.5615, lng: 126.9242 },
    ],
  },
  {
    id: 'myeongdong',
    nameKo: '명동 · 중앙로',
    nameEn: 'Myeongdong Main Street',
    address: '서울특별시 중구 명동8길 27',
    lat: 37.5636,
    lng: 126.9852,
    districtClass: 'tourist_corridor',
    stillSvg: '/storefront_facade.jpg',
    sceneGraph: {
      target_bay: { x0: 0.38, x1: 0.62, width_m: 5.2 },
      bays: [
        { id: 'left_1', x0: 0.05, x1: 0.38, width_m: 7.0, role: 'neighbor', cue: '대형 코스메틱 매장', name: 'K-BEAUTY', family: 'other', dailyVisits: 840 },
        { id: 'target', x0: 0.38, x1: 0.62, width_m: 5.2, role: 'target', cue: '메인 가로 1층 쇼룸', name: '선택 매장' },
        { id: 'right_1', x0: 0.62, x1: 0.95, width_m: 7.2, role: 'neighbor', cue: '스트리트 푸드 플라자', name: 'FOOD PLAZA', family: 'restaurant', dailyVisits: 620 },
      ],
      sidewalk: { y0: 0.68, y1: 0.83, width_m: 5.0 },
      road: { y0: 0.83, y1: 1.0 },
      props: [
        { kind: 'pole', x: 0.25, y: 0.74 },
        { kind: 'pole', x: 0.75, y: 0.75 },
      ],
      occlusion: 0.12,
      sign_visibility: 0.88,
      photogenic: 0.72,
      crosswalk_near: true,
      queue_space_m: 7.0,
      corner: { end: 'subway_side', x: 0.05 },
    },
    districtInfo: {
      district_class: 'tourist_corridor',
      district_name_ko: '명동',
      district_name_en: 'Myeongdong',
      hotspot_score: 0.80,
      line_evidence: 0.70,
      tourist_score: 0.98,
      office_score: 0.45,
      young_trend_score: 0.70,
      narrative_ko: '명동 중앙로는 방한 외국인 관광객과 쇼핑 인파가 하루 종일 밀집되는 글로벌 상업 가로입니다. 직관적인 영문·중문 간판 가시성과 화려한 쇼윈도 진열이 즉각적인 구매 전환을 결정합니다.',
      narrative_en: 'Myeongdong is Seoul’s premier tourist corridor with dense international shoppers and high spontaneous retail visits.',
      area_typical_krw: 48000,
      area_price_note_ko: '이 블록 코스메틱·잡화 기준 평균 결제액은 ₩48,000 수준으로 대량/세트 구매가 빈번합니다.',
    },
    neighbors: [
      { id: 'nm1', name: '올리브영 명동 플래그십', family: 'other', kindKo: 'K-뷰티 플래그십', distM: 30, rating: 4.6, userRatingCount: 5800, priceLevel: 2, estimatedDailyNoticed: 7200, estimatedDailyVisits: 1450, relation: '끌림' },
      { id: 'nm2', name: '명동교자 본점', family: 'restaurant', kindKo: '미쉐린 전통 칼국수', distM: 80, rating: 4.4, userRatingCount: 9200, priceLevel: 2, estimatedDailyNoticed: 5100, estimatedDailyVisits: 980, relation: '끌림' },
    ],
    anchors: [
      { id: 'am1', name: '4호선 명동역 6번출구', type: 'subway', walkMin: 2, lat: 37.5609, lng: 126.9860 },
      { id: 'am2', name: '2호선 을지로입구역 5번출구', type: 'subway', walkMin: 5, lat: 37.5660, lng: 126.9822 },
      { id: 'am3', name: '롯데백화점 본점', type: 'mall', walkMin: 7, lat: 37.5653, lng: 126.9810 },
    ],
  },
];
