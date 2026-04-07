const INDUSTRY_BENCHMARKS: Record<string, { avgCustomerValue: number; monthlyCallsPerReview: number }> = {
  dental: { avgCustomerValue: 800, monthlyCallsPerReview: 3 },
  medical: { avgCustomerValue: 500, monthlyCallsPerReview: 4 },
  legal: { avgCustomerValue: 3000, monthlyCallsPerReview: 2 },
  "real-estate": { avgCustomerValue: 5000, monthlyCallsPerReview: 2 },
  hvac: { avgCustomerValue: 450, monthlyCallsPerReview: 3 },
  plumbing: { avgCustomerValue: 400, monthlyCallsPerReview: 3 },
  roofing: { avgCustomerValue: 8000, monthlyCallsPerReview: 2 },
  restaurant: { avgCustomerValue: 50, monthlyCallsPerReview: 10 },
  "home-services": { avgCustomerValue: 500, monthlyCallsPerReview: 3 },
  auto: { avgCustomerValue: 600, monthlyCallsPerReview: 3 },
  salon: { avgCustomerValue: 120, monthlyCallsPerReview: 5 },
  landscaping: { avgCustomerValue: 350, monthlyCallsPerReview: 3 },
  catering: { avgCustomerValue: 1500, monthlyCallsPerReview: 2 },
  cleaning: { avgCustomerValue: 200, monthlyCallsPerReview: 4 },
  "pest-control": { avgCustomerValue: 300, monthlyCallsPerReview: 3 },
  financial: { avgCustomerValue: 2000, monthlyCallsPerReview: 2 },
  insurance: { avgCustomerValue: 1500, monthlyCallsPerReview: 2 },
  other: { avgCustomerValue: 500, monthlyCallsPerReview: 3 },
};

export interface RevenueImpact {
  estimatedMonthlyCalls: number;
  missedCallsPerMonth: number;
  monthlyRevenueLoss: number;
  annualRevenueLoss: number;
  avgCustomerValue: number;
  missRate: number;
  neverCallBackRate: number;
}

export function calculateRevenueImpact(params: {
  industry: string;
  avgCustomerValue?: number | null;
  totalReviews?: number;
  missRate: number;
}): RevenueImpact {
  const benchmark = INDUSTRY_BENCHMARKS[params.industry] || INDUSTRY_BENCHMARKS.other;
  const avgValue = params.avgCustomerValue || benchmark.avgCustomerValue;
  const reviewCount = params.totalReviews || 50;
  const estimatedMonthlyCalls = Math.round(reviewCount * benchmark.monthlyCallsPerReview);
  const neverCallBackRate = 0.85;

  const missedCallsPerMonth = Math.round(estimatedMonthlyCalls * params.missRate);
  const lostCustomersPerMonth = Math.round(missedCallsPerMonth * neverCallBackRate);
  const monthlyRevenueLoss = Math.round(lostCustomersPerMonth * avgValue);
  const annualRevenueLoss = monthlyRevenueLoss * 12;

  return {
    estimatedMonthlyCalls,
    missedCallsPerMonth,
    monthlyRevenueLoss,
    annualRevenueLoss,
    avgCustomerValue: avgValue,
    missRate: params.missRate,
    neverCallBackRate,
  };
}
