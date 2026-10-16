import {
  ArchetypeId,
  DistrictClass,
  DistrictInfo,
  FullDayProjection,
  HorizonSummary,
  InterventionPatch,
  NeighborShop,
  SceneGraph,
  ShopFamily,
  StepSimulationState,
  UserShopConfig,
} from '../../types/simulation';
import { FAMILY_CONFIGS } from '../priceBands';

export interface ArchetypeProfile {
  id: ArchetypeId;
  labelKo: string;
  labelEn: string;
  speedMS: number;
  patienceMin: number;
  priceElasticity: number;
  flyerAcceptRate: number;
  coatColor: string;
}

export const ARCHETYPE_PROFILES: Record<ArchetypeId, ArchetypeProfile> = {
  commuter: {
    id: 'commuter',
    labelKo: '출근·직장인',
    labelEn: 'Office Commuters',
    speedMS: 1.5,
    patienceMin: 3.5,
    priceElasticity: 0.90,
    flyerAcceptRate: 0.04,
    coatColor: '#1e293b', // Navy charcoal coat
  },
  lunch: {
    id: 'lunch',
    labelKo: '점심 식사객',
    labelEn: 'Lunch Dining Crowds',
    speedMS: 1.1,
    patienceMin: 8.0,
    priceElasticity: 0.70,
    flyerAcceptRate: 0.08,
    coatColor: '#d97706', // Warm amber jacket
  },
  stroller: {
    id: 'stroller',
    labelKo: '골목 산책객',
    labelEn: 'Leisure Strollers',
    speedMS: 0.8,
    patienceMin: 12.0,
    priceElasticity: 0.40,
    flyerAcceptRate: 0.12,
    coatColor: '#10b981', // Sage green casual top
  },
  trendsetter: {
    id: 'trendsetter',
    labelKo: '2030 트렌드세터',
    labelEn: 'Young Trendsetters',
    speedMS: 0.7,
    patienceMin: 25.0,
    priceElasticity: 0.25,
    flyerAcceptRate: 0.10,
    coatColor: '#f43f5e', // Coral red blazer
  },
  tourist: {
    id: 'tourist',
    labelKo: '국내외 관광객',
    labelEn: 'Travelers & Tourists',
    speedMS: 0.6,
    patienceMin: 20.0,
    priceElasticity: 0.30,
    flyerAcceptRate: 0.14,
    coatColor: '#0ea5e9', // Sky blue jacket
  },
  resident: {
    id: 'resident',
    labelKo: '지역 거주민',
    labelEn: 'Local Neighborhood Residents',
    speedMS: 1.0,
    patienceMin: 6.0,
    priceElasticity: 0.80,
    flyerAcceptRate: 0.07,
    coatColor: '#64748b', // Slate gray sweater
  },
};

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

/**
 * Base pass-by flow rate (passers per minute) by district class, day of week, and hour
 */
export function getBasePassByRate(
  districtClass: DistrictClass,
  isWeekend: boolean,
  hour: number,
  minute: number
): number {
  const time = hour + minute / 60;

  switch (districtClass) {
    case 'weekend_young_hotspot': // e.g. Seongsu, Hongdae
      if (isWeekend) {
        if (time < 10) return 3.5;
        if (time < 12) return 14.0 + (time - 10) * 5;
        if (time < 18) {
          const bell = Math.exp(-Math.pow((time - 15.5) / 2.2, 2));
          return 18.0 + 16.0 * bell; // Peak ~34 passers/min
        }
        if (time < 22) return 20.0 - (time - 18) * 3.5;
        return 4.5;
      } else {
        if (time < 8) return 2.5;
        if (time < 10) return 9.5;
        if (time < 14) return 19.0; // Lunch
        if (time < 17) return 12.0;
        if (time < 21) return 18.0; // Evening
        return 3.5;
      }

    case 'office_commute': // e.g. Gangnam Teheran-ro, Yeouido
      if (isWeekend) {
        return 3.5 + (time >= 11 && time <= 17 ? 5.0 : 0);
      } else {
        // Massive morning rush (08:00-09:30) and lunch rush (11:30-13:30)
        if (time >= 7.8 && time <= 9.6) {
          const mRush = Math.exp(-Math.pow((time - 8.6) / 0.55, 2));
          return 14.0 + 26.0 * mRush; // Peak ~40 passers/min
        }
        if (time >= 11.5 && time <= 13.5) {
          const lRush = Math.exp(-Math.pow((time - 12.3) / 0.65, 2));
          return 12.0 + 20.0 * lRush; // Peak ~32 passers/min
        }
        if (time >= 18 && time <= 19.8) return 22.0; // Evening commute
        if (time > 9.6 && time < 18) return 10.0;
        return 2.0;
      }

    case 'tourist_corridor': // e.g. Myeongdong
      if (time < 10) return 4.5;
      if (time < 21.5) {
        return (isWeekend ? 32.0 : 25.0) + Math.sin((time - 10) / 11.5 * Math.PI) * 9.0;
      }
      return 6.5;

    case 'mixed_neighborhood': // e.g. Yeonnam, Mangwon
    default:
      if (isWeekend) {
        if (time < 11) return 4.5;
        if (time < 19) return 16.0 + Math.sin((time - 11) / 8 * Math.PI) * 8.0;
        return 6.0;
      } else {
        if (time >= 11.5 && time <= 13.5) return 14.0;
        if (time >= 14 && time <= 18) return 10.0;
        if (time >= 18 && time <= 20.5) return 13.0;
        return 3.5;
      }
  }
}

/**
 * Generates actionable business intelligence insight for the current hour
 */
export function getTimeInsight(
  hour: number,
  isWeekend: boolean,
  districtClass: DistrictClass,
  queueLength: number,
  serversCount: number
): { regimeEn: string; insightEn: string } {
  if (hour < 7) {
    return {
      regimeEn: 'Night Inactive Hours',
      insightEn: 'Late night / early dawn: Low sidewalk traffic. Ambient illumination and exterior signage maintain passive brand awareness.',
    };
  }

  if (!isWeekend && hour >= 7 && hour < 10) {
    if (districtClass === 'office_commute') {
      return {
        regimeEn: 'Morning Commute Surge (High Balk Risk)',
        insightEn: '⚠️ High Traffic ≠ High Sales: Commuters have a strict 3-min patience limit. Long queues cause 85%+ walk-aways. Fast grab-and-go ordering is critical!',
      };
    }
    return {
      regimeEn: 'Morning Routine Traffic',
      insightEn: 'Morning neighborhood commuters and dog walkers. Moderate sensitivity to queue speed.',
    };
  }

  if (hour >= 11 && hour < 14) {
    return {
      regimeEn: 'Lunch Peak Rush',
      insightEn: '🍽️ High Conversion Intent: Coworkers and groups arrive in pairs. Willing to wait 7-10 minutes if order-taking is visible and organized.',
    };
  }

  if (hour >= 14 && hour < 18) {
    if (isWeekend && (districtClass === 'weekend_young_hotspot' || districtClass === 'mixed_neighborhood')) {
      return {
        regimeEn: 'Prestige Social Proof Window',
        insightEn: '✨ Queue = Demand Signal: Leisure shoppers and trendsetters perceive a visible line as proof of quality, actually increasing their desire to join!',
      };
    }
    return {
      regimeEn: 'Afternoon Browsing Window',
      insightEn: 'Relaxed foot traffic with high window-shopping dwell time. Window display visual appeal and street posters drive spontaneous walk-ins.',
    };
  }

  if (hour >= 18 && hour < 21) {
    return {
      regimeEn: 'Evening Social & Dining Peak',
      insightEn: '🌆 High Spend & Social Dwell: Higher average order value (attach rate +20%). Warm lighting and indoor seating attract post-work meetups.',
    };
  }

  return {
    regimeEn: 'Evening Wind-down',
    insightEn: 'Foot traffic decelerating. Casual dining and neighborhood residents winding down for the night.',
  };
}

export function getActiveArchetype(
  districtClass: DistrictClass,
  isWeekend: boolean,
  hour: number,
  youngTrendScore: number,
  touristScore: number
): ArchetypeId {
  if (touristScore > 0.75 && hour >= 10 && hour <= 20) {
    return 'tourist';
  }

  if (isWeekend) {
    if (youngTrendScore > 0.65 && hour >= 12 && hour <= 20) {
      return 'trendsetter';
    }
    if (hour >= 11 && hour <= 18) {
      return 'stroller';
    }
    return 'resident';
  } else {
    if ((hour >= 7 && hour < 10) || (hour >= 18 && hour < 20)) {
      return districtClass === 'office_commute' ? 'commuter' : 'resident';
    }
    if (hour >= 11 && hour < 14) {
      return 'lunch';
    }
    if (hour >= 14 && hour < 18) {
      return youngTrendScore > 0.8 ? 'trendsetter' : 'stroller';
    }
    if (hour >= 20 && youngTrendScore > 0.8) {
      return 'trendsetter';
    }
    return 'resident';
  }
}

/**
 * Single minute simulation step of the ProphetProp funnel
 */
export function stepMinute(
  minuteOfDay: number,
  dow: number,
  currentQueue: number,
  userConfig: UserShopConfig,
  patch: InterventionPatch,
  sceneGraph: SceneGraph,
  districtInfo: DistrictInfo,
  anchors: { walkMin: number }[],
  neighbors: NeighborShop[]
): {
  state: StepSimulationState;
  nextQueue: number;
} {
  const hour = Math.floor(minuteOfDay / 60);
  const min = minuteOfDay % 60;
  const isWeekend = dow === 0 || dow === 6;
  const clockString = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

  const isOpen = hour >= userConfig.openHour && hour < userConfig.closeHour;

  const activeArchetype = getActiveArchetype(
    districtInfo.district_class,
    isWeekend,
    hour,
    districtInfo.young_trend_score,
    districtInfo.tourist_score
  );
  const archetype = ARCHETYPE_PROFILES[activeArchetype];

  const bestWalk = anchors.length > 0 ? Math.min(...anchors.map((a) => a.walkMin)) : 5;
  const extraWithin6 = anchors.filter((a) => a.walkMin <= 6).length;
  const anchorMultiplier = clamp(1.35 - 0.06 * bestWalk, 0.45, 1.35) + Math.min(0.15, extraWithin6 * 0.05);

  const sameFamilyNeighbors = neighbors.filter((n) => n.family === userConfig.family);
  const gravity = 1 + 0.08 * Math.min(sameFamilyNeighbors.length, 8) * districtInfo.hotspot_score * (isWeekend ? 1 : 0.3);
  const split = clamp(sameFamilyNeighbors.length * 0.06, 0, 0.35);

  const baseRate = getBasePassByRate(districtInfo.district_class, isWeekend, hour, min);
  const currentPassPerMin = baseRate * anchorMultiplier * (1 + 0.5 * (gravity - 1));

  const timeInsights = getTimeInsight(hour, isWeekend, districtInfo.district_class, currentQueue, userConfig.serversCount);

  if (!isOpen) {
    return {
      state: {
        minute: minuteOfDay,
        clockString,
        hour,
        dow,
        isWeekend,
        activeArchetype,
        currentPassPerMin,
        queueLength: 0,
        waitMinutes: 0,
        serversBusy: 0,
        effectiveServers: userConfig.serversCount + (patch.extra_servers || 0),
        isSpilling: false,
        regime: 'classic_balk',
        regimeCopy: '영업 준비 중',
        regimeCopyEn: 'Store Closed / Preparing',
        timeInsightEn: 'Store is currently outside operating hours.',
        minutePassers: currentPassPerMin,
        minuteFlyersTaken: 0,
        minuteNoticed: 0,
        minuteIntended: 0,
        minuteJoined: 0,
        minuteBalked: 0,
        minuteReneged: 0,
        minuteServed: 0,
        minuteRevenueKRW: 0,
        cumPassers: 0,
        cumFlyersTaken: 0,
        cumNoticed: 0,
        cumIntended: 0,
        cumJoined: 0,
        cumServed: 0,
        cumBalked: 0,
        cumReneged: 0,
        cumRevenueKRW: 0,
        cumBalkedLossKRW: 0,
        peakQueue: 0,
        spillMinutes: 0,
      },
      nextQueue: 0,
    };
  }

  // Interventions
  const signType = patch.sign_type || 'facade';
  let signBonus = 0;
  let sidewalkTakenM = 0;
  if (signType === 'blade') {
    signBonus = 0.18;
    sidewalkTakenM = 0.1;
  } else if (signType === 'a_board') {
    signBonus = 0.22;
    sidewalkTakenM = 0.5;
  } else if (signType === 'standing_poster') {
    signBonus = 0.30;
    sidewalkTakenM = 0.8;
  } else if (signType === 'facade_and_poster') {
    signBonus = 0.22;
    sidewalkTakenM = 0.8;
  }

  if (patch.flyer_person) {
    sidewalkTakenM += 0.6;
  }

  const useUserBanner = patch.use_user_banner ?? (!!userConfig.bannerUrl);
  const bannerRead = (useUserBanner && userConfig.bannerScore)
    ? 0.55 + 0.45 * userConfig.bannerScore.distance_readability
    : 1.0;

  const queueSignal = clamp(currentQueue / 10, 0, 0.15);
  const baseNotice = sigmoid(
    -0.4 +
    1.6 * sceneGraph.sign_visibility * bannerRead -
    1.1 * sceneGraph.occlusion +
    signBonus +
    queueSignal +
    (patch.flyer_person ? 0.04 : 0)
  );

  let noticeProb = baseNotice;
  let minuteFlyersTaken = 0;
  if (patch.flyer_person) {
    const flyerRate = archetype.flyerAcceptRate;
    minuteFlyersTaken = currentPassPerMin * flyerRate;
    noticeProb = (1 - flyerRate) * baseNotice + flyerRate * Math.max(0.80, baseNotice);
  }

  const minuteNoticed = currentPassPerMin * noticeProb;

  const priceFactor = patch.price_factor ?? 1.0;
  const isWeekday = !isWeekend;
  const weekdayDiscount = (isWeekday && patch.weekday_discount) ? patch.weekday_discount : 0;
  const effectivePrice = userConfig.exactPriceKRW * priceFactor * (1 - weekdayDiscount);

  const areaTypical = districtInfo.area_typical_krw || FAMILY_CONFIGS[userConfig.family].bands.typical.mid;
  const priceRatio = effectivePrice / areaTypical;
  const priceFit = Math.exp(-Math.abs(Math.log(priceRatio)) * archetype.priceElasticity);

  const intendProb = clamp(noticeProb * priceFit * gravity * (1 - split), 0, 0.98);
  const minuteIntended = currentPassPerMin * intendProb;

  const effectiveServers = Math.max(1, userConfig.serversCount + (patch.extra_servers || 0));
  const serviceSeconds = userConfig.serviceSeconds;
  const waitMin = (currentQueue * (serviceSeconds / effectiveServers)) / 60;

  const pClassic = Math.exp(-waitMin / archetype.patienceMin);

  const proof = currentQueue / (currentQueue + 6);
  const fatigue = Math.exp(-Math.max(0, waitMin - archetype.patienceMin) / 12);
  const photogenicBonus = (signType === 'standing_poster' || signType === 'facade_and_poster') ? 0.1 : 0;
  const effectivePhotogenic = clamp(sceneGraph.photogenic + photogenicBonus, 0, 1);
  const pPrestige = clamp(0.35 + 0.55 * proof, 0, 0.92) * fatigue * (0.65 + 0.35 * effectivePhotogenic);

  let daypart = 0.15;
  if (isWeekend && hour >= 12 && hour <= 19) {
    daypart = 1.0;
  } else if (!isWeekend && dow === 5 && hour >= 17) {
    daypart = 0.7;
  } else if (!isWeekend && hour >= 11 && hour <= 14) {
    daypart = 0.35;
  }
  if (districtInfo.district_class === 'office_commute') {
    daypart = Math.min(daypart, 0.15);
  }

  const prestigeWeight = clamp(
    districtInfo.hotspot_score * districtInfo.young_trend_score * (0.45 + 0.55 * districtInfo.line_evidence) * daypart,
    0,
    0.95
  );

  const effectiveQueueSpaceM = Math.max(1.5, sceneGraph.queue_space_m - sidewalkTakenM);
  const isSpilling = currentQueue * 0.55 > effectiveQueueSpaceM;

  let spillModifierClassic = 1.0;
  let spillModifierPrestige = 1.0;
  if (isSpilling) {
    spillModifierClassic = 0.55;
    spillModifierPrestige = waitMin <= archetype.patienceMin ? 0.90 : 0.70;
  }

  const pJoin =
    (1 - prestigeWeight) * (pClassic * spillModifierClassic) +
    prestigeWeight * (pPrestige * spillModifierPrestige);

  const minuteJoined = minuteIntended * clamp(pJoin, 0, 1);
  const minuteBalked = Math.max(0, minuteIntended - minuteJoined);

  const renegeRate = (1 - prestigeWeight) * 0.02 + prestigeWeight * 0.008;
  const minuteReneged = waitMin > 0.5 * archetype.patienceMin ? currentQueue * renegeRate : 0;

  const maxCanServeThisMin = (effectiveServers * 60) / serviceSeconds;
  const queueAfterArrivals = Math.max(0, currentQueue - minuteReneged + minuteJoined);
  const minuteServed = Math.min(queueAfterArrivals, maxCanServeThisMin);
  const nextQueue = Math.max(0, queueAfterArrivals - minuteServed);

  const attachRate = FAMILY_CONFIGS[userConfig.family].attachRate;
  const ticketKRW = effectivePrice * attachRate;
  const minuteRevenueKRW = minuteServed * ticketKRW;
  const balkedLossKRW = minuteBalked * ticketKRW;

  const regime: 'classic_balk' | 'prestige_signal' =
    prestigeWeight >= 0.45 && isWeekend ? 'prestige_signal' : 'classic_balk';

  const regimeCopy = regime === 'prestige_signal'
    ? '이 시간대는 줄이 신호(Prestige)를 만듭니다.'
    : '줄이 길어질수록 이탈률(Balking)이 가파르게 상승합니다.';

  const regimeCopyEn = regime === 'prestige_signal'
    ? 'Visible queue creates a social proof prestige signal.'
    : 'Long queues cause rapid customer balking & lost sales.';

  return {
    state: {
      minute: minuteOfDay,
      clockString,
      hour,
      dow,
      isWeekend,
      activeArchetype,
      currentPassPerMin,
      queueLength: Math.round(nextQueue),
      waitMinutes: Math.round((nextQueue * (serviceSeconds / effectiveServers)) / 60 * 10) / 10,
      serversBusy: Math.min(effectiveServers, Math.ceil(nextQueue)),
      effectiveServers,
      isSpilling,
      regime,
      regimeCopy,
      regimeCopyEn,
      timeInsightEn: timeInsights.insightEn,
      minutePassers: currentPassPerMin,
      minuteFlyersTaken,
      minuteNoticed,
      minuteIntended,
      minuteJoined,
      minuteBalked,
      minuteReneged,
      minuteServed,
      minuteRevenueKRW,
      cumPassers: currentPassPerMin,
      cumFlyersTaken: minuteFlyersTaken,
      cumNoticed: minuteNoticed,
      cumIntended: minuteIntended,
      cumJoined: minuteJoined,
      cumServed: minuteServed,
      cumBalked: minuteBalked,
      cumReneged: minuteReneged,
      cumRevenueKRW: minuteRevenueKRW,
      cumBalkedLossKRW: balkedLossKRW,
      peakQueue: Math.round(nextQueue),
      spillMinutes: isSpilling ? 1 : 0,
    },
    nextQueue,
  };
}

export function simulateFullDay(
  dow: number,
  userConfig: UserShopConfig,
  patch: InterventionPatch,
  sceneGraph: SceneGraph,
  districtInfo: DistrictInfo,
  anchors: { walkMin: number }[],
  neighbors: NeighborShop[]
): {
  projection: FullDayProjection;
  minuteStates: StepSimulationState[];
} {
  let queue = 0;
  const minuteStates: StepSimulationState[] = [];

  let cumPassers = 0;
  let cumFlyersTaken = 0;
  let cumNoticed = 0;
  let cumIntended = 0;
  let cumJoined = 0;
  let cumServed = 0;
  let cumBalked = 0;
  let cumReneged = 0;
  let cumRevenueKRW = 0;
  let cumBalkedLossKRW = 0;
  let peakQueue = 0;
  let spillMinutes = 0;

  for (let m = 0; m < 1440; m++) {
    const res = stepMinute(m, dow, queue, userConfig, patch, sceneGraph, districtInfo, anchors, neighbors);
    queue = res.nextQueue;

    cumPassers += res.state.minutePassers;
    cumFlyersTaken += res.state.minuteFlyersTaken;
    cumNoticed += res.state.minuteNoticed;
    cumIntended += res.state.minuteIntended;
    cumJoined += res.state.minuteJoined;
    cumServed += res.state.minuteServed;
    cumBalked += res.state.minuteBalked;
    cumReneged += res.state.minuteReneged;
    cumRevenueKRW += res.state.minuteRevenueKRW;
    cumBalkedLossKRW += res.state.minuteBalked * (res.state.minuteRevenueKRW > 0 ? (res.state.minuteRevenueKRW / Math.max(1, res.state.minuteServed)) : userConfig.exactPriceKRW);

    if (res.state.queueLength > peakQueue) {
      peakQueue = res.state.queueLength;
    }
    if (res.state.isSpilling) {
      spillMinutes++;
    }

    res.state.cumPassers = Math.round(cumPassers);
    res.state.cumFlyersTaken = Math.round(cumFlyersTaken);
    res.state.cumNoticed = Math.round(cumNoticed);
    res.state.cumIntended = Math.round(cumIntended);
    res.state.cumJoined = Math.round(cumJoined);
    res.state.cumServed = Math.round(cumServed);
    res.state.cumBalked = Math.round(cumBalked);
    res.state.cumReneged = Math.round(cumReneged);
    res.state.cumRevenueKRW = Math.round(cumRevenueKRW);
    res.state.cumBalkedLossKRW = Math.round(cumBalkedLossKRW);
    res.state.peakQueue = peakQueue;
    res.state.spillMinutes = spillMinutes;

    minuteStates.push(res.state);
  }

  return {
    projection: {
      totalRevenueKRW: Math.round(cumRevenueKRW),
      totalPassers: Math.round(cumPassers),
      totalNoticed: Math.round(cumNoticed),
      totalJoined: Math.round(cumJoined),
      totalServed: Math.round(cumServed),
      totalBalked: Math.round(cumBalked),
      totalBalkedLossKRW: Math.round(cumBalkedLossKRW),
      peakQueue,
      spillMinutes,
    },
    minuteStates,
  };
}

export function simulateHorizons(
  userConfig: UserShopConfig,
  patch: InterventionPatch,
  sceneGraph: SceneGraph,
  districtInfo: DistrictInfo,
  anchors: { walkMin: number }[],
  neighbors: NeighborShop[]
): HorizonSummary {
  const weekdayRes = simulateFullDay(1, userConfig, patch, sceneGraph, districtInfo, anchors, neighbors);
  const weekendRes = simulateFullDay(6, userConfig, patch, sceneGraph, districtInfo, anchors, neighbors);

  const days30WeekdayRev = weekdayRes.projection.totalRevenueKRW * 22;
  const days30WeekendRev = weekendRes.projection.totalRevenueKRW * 8;
  const days30RevenueKRW = days30WeekdayRev + days30WeekendRev;
  const days30Served = weekdayRes.projection.totalServed * 22 + weekendRes.projection.totalServed * 8;

  const holidayFactor = 1.04;
  const days365RevenueKRW = Math.round((weekdayRes.projection.totalRevenueKRW * 260 + weekendRes.projection.totalRevenueKRW * 105) * holidayFactor);

  const days365Range: [number, number] = [
    Math.round(days365RevenueKRW * 0.8),
    Math.round(days365RevenueKRW * 1.2),
  ];

  const familyCfg = FAMILY_CONFIGS[userConfig.family];
  const cogsRatio = familyCfg.cogsRatio;
  const cogsCostKRW = Math.round(days365RevenueKRW * cogsRatio);

  const effectiveServers = Math.max(1, userConfig.serversCount + (patch.extra_servers || 0));
  const monthlyLaborCostKRW = effectiveServers * 2400000;
  const annualLaborCostKRW = monthlyLaborCostKRW * 12;

  const annualGrossProfitKRW = days365RevenueKRW - cogsCostKRW - annualLaborCostKRW;
  const breakEvenMonthlyRentKRW = Math.max(0, Math.round(annualGrossProfitKRW / 12));

  const targetRent = userConfig.monthlyRentKRW || breakEvenMonthlyRentKRW;
  const monthlyRevenue = days365RevenueKRW / 12;
  const monthlyGrossProfit = monthlyRevenue * (1 - cogsRatio) - monthlyLaborCostKRW;
  const monthsProfitable = monthlyGrossProfit >= targetRent ? 12 : Math.max(0, Math.floor((monthlyGrossProfit / Math.max(1, targetRent)) * 12));

  return {
    days30RevenueKRW,
    days30WeekdayRev,
    days30WeekendRev,
    days30Served,
    days365RevenueKRW,
    days365Range,
    breakEvenMonthlyRentKRW,
    monthlyLaborCostKRW,
    cogsCostKRW,
    monthsProfitable,
  };
}
