import { PriceBand, ShopFamily } from '../types/simulation';

export interface FamilyPriceConfig {
  family: ShopFamily;
  labelKo: string;
  labelEn: string;
  unitPromptKo: string;
  unitPromptEn: string;
  defaultServiceSeconds: number;
  attachRate: number;
  cogsRatio: number;
  bands: Record<PriceBand, { min: number; max: number; mid: number; labelKo: string; labelEn: string }>;
  kinds: { id: string; labelKo: string; labelEn: string; defaultBand: PriceBand }[];
}

export const FAMILY_CONFIGS: Record<ShopFamily, FamilyPriceConfig> = {
  cafe: {
    family: 'cafe',
    labelKo: '카페',
    labelEn: 'Cafe & Drinks',
    unitPromptKo: '음료 1잔 기준',
    unitPromptEn: 'Per 1 beverage',
    defaultServiceSeconds: 180,
    attachRate: 1.25,
    cogsRatio: 0.32,
    bands: {
      budget: { min: 3000, max: 4500, mid: 3800, labelKo: '가성비 (₩3,000~4,500)', labelEn: 'Budget (₩3,000–4,500)' },
      typical: { min: 5000, max: 6500, mid: 5800, labelKo: '보통 (₩5,000~6,500)', labelEn: 'Typical (₩5,000–6,500)' },
      premium: { min: 7000, max: 9000, mid: 7800, labelKo: '프리미엄 (₩7,000~9,000)', labelEn: 'Premium (₩7,000–9,000)' },
      luxury: { min: 10000, max: 18000, mid: 12000, labelKo: '하이엔드 (₩10,000+)', labelEn: 'Luxury (₩10,000+)' },
    },
    kinds: [
      { id: 'coffee', labelKo: '에스프레소·드립 커피', labelEn: 'Specialty Espresso & Drip Bar', defaultBand: 'typical' },
      { id: 'matcha', labelKo: '말차·티 바', labelEn: 'Matcha & Tea Specialty Bar', defaultBand: 'typical' },
      { id: 'dessert', labelKo: '디저트 카페', labelEn: 'Dessert Cafe', defaultBand: 'typical' },
      { id: 'bakery-cafe', labelKo: '베이커리 카페', labelEn: 'Bakery Cafe', defaultBand: 'premium' },
      { id: 'takeaway', labelKo: '테이크아웃 전문점', labelEn: 'Fast Takeaway Coffee', defaultBand: 'budget' },
    ],
  },
  restaurant: {
    family: 'restaurant',
    labelKo: '식당',
    labelEn: 'Restaurant & Dining',
    unitPromptKo: '1인 식사 기준',
    unitPromptEn: 'Per 1 meal',
    defaultServiceSeconds: 2400,
    attachRate: 1.15,
    cogsRatio: 0.32,
    bands: {
      budget: { min: 8000, max: 12000, mid: 10000, labelKo: '가성비 (₩8,000~12,000)', labelEn: 'Budget (₩8,000–12,000)' },
      typical: { min: 15000, max: 25000, mid: 19000, labelKo: '보통 (₩15,000~25,000)', labelEn: 'Typical (₩15,000–25,000)' },
      premium: { min: 30000, max: 50000, mid: 38000, labelKo: '프리미엄 (₩30,000~50,000)', labelEn: 'Premium (₩30,000–50,000)' },
      luxury: { min: 60000, max: 150000, mid: 85000, labelKo: '하이엔드 (₩60,000+)', labelEn: 'Luxury (₩60,000+)' },
    },
    kinds: [
      { id: 'korean', labelKo: '한식·정식', labelEn: 'Korean Meal & Set Dining', defaultBand: 'typical' },
      { id: 'casual', labelKo: '캐주얼 다이닝·파스타', labelEn: 'Casual Dining & Pasta', defaultBand: 'typical' },
      { id: 'izakaya', labelKo: '이자카야·펍', labelEn: 'Izakaya & Craft Pub', defaultBand: 'premium' },
      { id: 'noodle', labelKo: '라멘·국수', labelEn: 'Handmade Ramen & Noodles', defaultBand: 'budget' },
      { id: 'takeaway-meal', labelKo: '간편 도시락·포장', labelEn: 'Grab & Go Lunch Box', defaultBand: 'budget' },
    ],
  },
  clothing: {
    family: 'clothing',
    labelKo: '옷·패션',
    labelEn: 'Clothing & Fashion',
    unitPromptKo: '의류 1점 기준',
    unitPromptEn: 'Per 1 garment',
    defaultServiceSeconds: 480,
    attachRate: 1.00,
    cogsRatio: 0.50,
    bands: {
      budget: { min: 20000, max: 40000, mid: 32000, labelKo: '가성비 (₩20,000~40,000)', labelEn: 'Budget (₩20,000–40,000)' },
      typical: { min: 50000, max: 90000, mid: 68000, labelKo: '보통 (₩50,000~90,000)', labelEn: 'Typical (₩50,000–90,000)' },
      premium: { min: 120000, max: 200000, mid: 150000, labelKo: '프리미엄 (₩120,000~200,000)', labelEn: 'Premium (₩120,000–200,000)' },
      luxury: { min: 250000, max: 600000, mid: 320000, labelKo: '하이엔드 (₩250,000+)', labelEn: 'Luxury (₩250,000+)' },
    },
    kinds: [
      { id: 'vintage', labelKo: '빈티지·아카이브', labelEn: 'Archive Vintage & Designer Goods', defaultBand: 'premium' },
      { id: 'contemporary', labelKo: '컨템포러리 캐주얼', labelEn: 'Contemporary Casual', defaultBand: 'typical' },
      { id: 'streetwear', labelKo: '스트리트웨어', labelEn: 'Streetwear & Sneakers', defaultBand: 'typical' },
      { id: 'select-shop', labelKo: '디자이너 셀렉트숍', labelEn: 'Independent Select Shop', defaultBand: 'premium' },
      { id: 'shoes', labelKo: '신발·스니커즈', labelEn: 'Footwear & Accessories', defaultBand: 'typical' },
    ],
  },
  popup: {
    family: 'popup',
    labelKo: '팝업',
    labelEn: 'Popup & Showroom',
    unitPromptKo: '1회 결제 기준',
    unitPromptEn: 'Per 1 transaction',
    defaultServiceSeconds: 120,
    attachRate: 1.10,
    cogsRatio: 0.40,
    bands: {
      budget: { min: 10000, max: 20000, mid: 15000, labelKo: '가성비 (₩10,000~20,000)', labelEn: 'Budget (₩10,000–20,000)' },
      typical: { min: 25000, max: 45000, mid: 35000, labelKo: '보통 (₩25,000~45,000)', labelEn: 'Typical (₩25,000–45,000)' },
      premium: { min: 55000, max: 100000, mid: 75000, labelKo: '프리미엄 (₩55,000~100,000)', labelEn: 'Premium (₩55,000–100,000)' },
      luxury: { min: 120000, max: 300000, mid: 160000, labelKo: '하이엔드 (₩120,000+)', labelEn: 'Luxury (₩120,000+)' },
    },
    kinds: [
      { id: 'brand-popup', labelKo: '브랜드 팝업스토어', labelEn: 'Brand Popup Store', defaultBand: 'typical' },
      { id: 'food-popup', labelKo: 'F&B 디저트 팝업', labelEn: 'F&B & Dessert Popup', defaultBand: 'typical' },
      { id: 'exhibition-shop', labelKo: '전시 결합 팝업', labelEn: 'Art & Gallery Exhibition Shop', defaultBand: 'premium' },
      { id: 'weekend-stall', labelKo: '주말 플리마켓 부스', labelEn: 'Weekend Market Stall', defaultBand: 'budget' },
    ],
  },
  other: {
    family: 'other',
    labelKo: '기타 상점',
    labelEn: 'Other Retail',
    unitPromptKo: '1회 품목 또는 방문 기준',
    unitPromptEn: 'Per 1 purchase/visit',
    defaultServiceSeconds: 240,
    attachRate: 1.10,
    cogsRatio: 0.40,
    bands: {
      budget: { min: 12000, max: 20000, mid: 16000, labelKo: '가성비 (₩12,000~20,000)', labelEn: 'Budget (₩12,000–20,000)' },
      typical: { min: 25000, max: 45000, mid: 34000, labelKo: '보통 (₩25,000~45,000)', labelEn: 'Typical (₩25,000–45,000)' },
      premium: { min: 55000, max: 95000, mid: 72000, labelKo: '프리미엄 (₩55,000~95,000)', labelEn: 'Premium (₩55,000–95,000)' },
      luxury: { min: 110000, max: 350000, mid: 150000, labelKo: '하이엔드 (₩110,000+)', labelEn: 'Luxury (₩110,000+)' },
    },
    kinds: [
      { id: 'bookstore', labelKo: '독립서점', labelEn: 'Independent Bookstore', defaultBand: 'budget' },
      { id: 'record', labelKo: '바이닐·레코드', labelEn: 'Vinyl & Record Shop', defaultBand: 'typical' },
      { id: 'flower', labelKo: '플라워 스튜디오', labelEn: 'Flower & Botanical Studio', defaultBand: 'typical' },
      { id: 'cosmetics', labelKo: '향수·코스메틱', labelEn: 'Fragrance & Cosmetics Showroom', defaultBand: 'premium' },
      { id: 'stationery', labelKo: '문구·소품샵', labelEn: 'Design Stationery & Goods', defaultBand: 'budget' },
      { id: 'glasses', labelKo: '안경·아이웨어', labelEn: 'Designer Eyewear & Glasses', defaultBand: 'premium' },
      { id: 'salon', labelKo: '헤어·뷰티 살롱', labelEn: 'Hair & Beauty Salon', defaultBand: 'premium' },
    ],
  },
};

export function evaluatePriceJudgement(
  family: ShopFamily,
  priceKRW: number,
  areaTypicalKRW?: number,
  districtNameEn?: string
): {
  categoryLabelEn: string;
  areaComparisonEn: string;
  elasticityFit: number;
} {
  const cfg = FAMILY_CONFIGS[family];
  let catLabel = 'Typical Industry Range';
  if (priceKRW <= cfg.bands.budget.max) {
    catLabel = 'Budget / High-Affordability Range';
  } else if (priceKRW <= cfg.bands.typical.max) {
    catLabel = 'Standard Average Industry Range';
  } else if (priceKRW <= cfg.bands.premium.max) {
    catLabel = 'Premium Tier Range';
  } else {
    catLabel = 'Luxury High-End Tier';
  }

  const effectiveAreaTypical = areaTypicalKRW || cfg.bands.typical.mid;
  const ratio = priceKRW / effectiveAreaTypical;
  const dist = districtNameEn || 'this neighborhood';

  let areaComp = '';
  if (ratio < 0.75) {
    areaComp = `Below ${dist} average (₩${effectiveAreaTypical.toLocaleString()}) — lower price friction drives rapid walk-in conversion.`;
  } else if (ratio <= 1.15) {
    areaComp = `Aligned with ${dist} average (₩${effectiveAreaTypical.toLocaleString()}) — stable, highly predictable customer demand.`;
  } else if (ratio <= 1.45) {
    areaComp = `Above ${dist} average (₩${effectiveAreaTypical.toLocaleString()}) — requires distinctive storefront branding to justify the ticket.`;
  } else {
    areaComp = `Significantly higher than ${dist} average (₩${effectiveAreaTypical.toLocaleString()}) — high ticket barrier requires strong brand pull.`;
  }

  const elasticityFit = Math.exp(-Math.abs(Math.log(ratio)) * 0.5);

  return {
    categoryLabelEn: catLabel,
    areaComparisonEn: areaComp,
    elasticityFit,
  };
}
