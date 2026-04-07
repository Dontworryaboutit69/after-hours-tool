export interface CallResult {
  callNumber: number;
  callType: string;
  answeredBy: string | null;
  callDuration: number | null;
  ringDuration: number | null;
  status: string;
}

export interface GradeResult {
  overall: string;
  answeredCount: number;
  totalCalls: number;
  missRate: number;
  patterns: string[];
  perCall: { callNumber: number; callType: string; grade: string; summary: string }[];
}

const CALL_TYPE_LABELS: Record<string, string> = {
  immediate: "During hours",
  after_hours: "After hours",
  before_hours: "Before opening",
  business_hours_mid: "Midday",
  business_hours_afternoon: "Afternoon",
};

function wasAnswered(answeredBy: string | null): boolean {
  return answeredBy === "human";
}

function callGrade(
  answeredBy: string | null,
  ringDuration: number | null
): { grade: string; summary: string } {
  if (!answeredBy || answeredBy === "no-answer" || answeredBy === "busy" || answeredBy === "failed") {
    return { grade: "F", summary: "No answer" };
  }
  if (answeredBy === "human") {
    if (ringDuration && ringDuration > 20) {
      return { grade: "B", summary: `Answered after ${ringDuration}s` };
    }
    return { grade: "A", summary: `Answered quickly${ringDuration ? ` (${ringDuration}s)` : ""}` };
  }
  if (answeredBy.startsWith("machine")) {
    return { grade: "D", summary: "Went to voicemail" };
  }
  if (answeredBy === "fax") {
    return { grade: "F", summary: "Fax machine" };
  }
  return { grade: "D", summary: "Unknown response" };
}

export function computeGrade(calls: CallResult[]): GradeResult {
  const completedCalls = calls.filter((c) => c.status === "completed" || c.status === "failed");
  const answeredCount = completedCalls.filter((c) => wasAnswered(c.answeredBy)).length;
  const totalCalls = completedCalls.length || 1;
  const missRate = (totalCalls - answeredCount) / totalCalls;

  const perCall = completedCalls.map((c) => {
    const { grade, summary } = callGrade(c.answeredBy, c.ringDuration);
    return {
      callNumber: c.callNumber,
      callType: CALL_TYPE_LABELS[c.callType] || c.callType,
      grade,
      summary,
    };
  });

  // Detect patterns
  const patterns: string[] = [];

  const afterHoursCalls = completedCalls.filter(
    (c) => c.callType === "after_hours" || c.callType === "before_hours"
  );
  const afterHoursAnswered = afterHoursCalls.filter((c) => wasAnswered(c.answeredBy));
  if (afterHoursCalls.length > 0 && afterHoursAnswered.length === 0) {
    patterns.push("Zero after-hours coverage — all calls outside business hours went unanswered");
  }

  const businessHoursCalls = completedCalls.filter(
    (c) => c.callType === "immediate" || c.callType === "business_hours_mid" || c.callType === "business_hours_afternoon"
  );
  const businessHoursAnswered = businessHoursCalls.filter((c) => wasAnswered(c.answeredBy));
  if (businessHoursCalls.length > 0 && businessHoursAnswered.length < businessHoursCalls.length) {
    patterns.push(
      `Inconsistent during business hours — answered ${businessHoursAnswered.length} of ${businessHoursCalls.length} calls`
    );
  }

  const voicemailCalls = completedCalls.filter((c) => c.answeredBy?.startsWith("machine"));
  if (voicemailCalls.length >= 3) {
    patterns.push("Heavy voicemail reliance — 80% of callers who reach voicemail hang up without leaving a message");
  }

  // Overall grade
  let overall: string;
  if (answeredCount === totalCalls) {
    const allFast = completedCalls.every((c) => !c.ringDuration || c.ringDuration <= 20);
    overall = allFast ? "A" : "B";
  } else if (answeredCount >= 4) {
    overall = "B";
  } else if (answeredCount >= 3) {
    overall = "C";
  } else if (answeredCount >= 1) {
    overall = "D";
  } else {
    overall = "F";
  }

  return { overall, answeredCount, totalCalls, missRate, patterns, perCall };
}
