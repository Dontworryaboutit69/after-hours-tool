"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Phone, PhoneOff, PhoneMissed, Star, TrendingDown,
  ArrowRight, CheckCircle2, AlertTriangle, Clock, Loader2,
  MessageSquare, DollarSign, BarChart3,
} from "lucide-react";

interface ReportData {
  id: string;
  status: string;
  businessName: string;
  industry: string;
  phoneNumber: string;
  overallGrade: string;
  callsAnswered: number;
  callsTotal: number;
  reviewComplaints: any[];
  revenueImpact: {
    estimatedMonthlyCalls: number;
    missedCallsPerMonth: number;
    monthlyRevenueLoss: number;
    annualRevenueLoss: number;
    avgCustomerValue: number;
    missRate: number;
  };
  aiAnalysis: string;
  avgCustomerValue: number;
  hasAnsweringService: boolean;
  answeringServiceCost: number;
  googleBusinessData: any;
  calls: {
    callNumber: number;
    callType: string;
    scheduledAt: string;
    status: string;
    answeredBy: string;
    callDuration: number;
    firedAt: string;
    completedAt: string;
  }[];
}

const GRADE_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  A: { color: "text-emerald-400", bg: "bg-emerald-500", border: "border-emerald-500/30", label: "Excellent" },
  B: { color: "text-blue-400", bg: "bg-blue-500", border: "border-blue-500/30", label: "Good" },
  C: { color: "text-amber-400", bg: "bg-amber-500", border: "border-amber-500/30", label: "Fair" },
  D: { color: "text-orange-400", bg: "bg-orange-500", border: "border-orange-500/30", label: "Poor" },
  F: { color: "text-red-400", bg: "bg-red-500", border: "border-red-500/30", label: "Failing" },
};

const CALL_TYPE_LABELS: Record<string, string> = {
  immediate: "During hours",
  after_hours: "After hours",
  before_hours: "Before opening",
  business_hours_mid: "Midday",
  business_hours_afternoon: "Afternoon",
};

function getCallIcon(answeredBy: string | null) {
  if (answeredBy === "human") return CheckCircle2;
  if (answeredBy?.startsWith("machine")) return PhoneOff;
  return PhoneMissed;
}

function getCallColor(answeredBy: string | null) {
  if (answeredBy === "human") return "text-emerald-400";
  if (answeredBy?.startsWith("machine")) return "text-orange-400";
  return "text-red-400";
}

function getCallLabel(answeredBy: string | null) {
  if (answeredBy === "human") return "Answered";
  if (answeredBy?.startsWith("machine")) return "Voicemail";
  if (answeredBy === "busy") return "Busy";
  if (answeredBy === "no-answer" || answeredBy === "failed") return "No answer";
  return "Unknown";
}

export default function ReportClient({ checkId }: { checkId: string }) {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/coverage-check/${checkId}`);
        const json = await res.json();
        if (!json.success) {
          setError("Report not found.");
          return;
        }
        setData(json.data);
      } catch {
        setError("Failed to load report.");
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [checkId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-white text-lg font-medium">{error || "Report not found"}</p>
          <a href="/" className="text-purple-400 text-sm mt-2 block hover:underline">
            Run a new check
          </a>
        </div>
      </div>
    );
  }

  if (data.status !== "completed") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Clock className="w-12 h-12 text-purple-400 mx-auto mb-4" />
          <p className="text-white text-lg font-medium">Your report is still being generated</p>
          <p className="text-white/50 text-sm mt-2">
            We&apos;re still running phone checks on {data.businessName}. Check back soon — we&apos;ll also email you when it&apos;s ready.
          </p>
        </div>
      </div>
    );
  }

  const grade = GRADE_CONFIG[data.overallGrade] || GRADE_CONFIG.F;
  const mainPlatformUrl = process.env.NEXT_PUBLIC_MAIN_PLATFORM_URL || "https://voice-ai-platform-phi.vercel.app";
  const wizardUrl = `${mainPlatformUrl}/onboarding?checkId=${checkId}`;

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-purple-500/[0.07] blur-[160px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-500/[0.05] blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <p className="text-white/40 text-sm mb-2">Phone Coverage Report</p>
          <h1 className="text-3xl sm:text-4xl font-extrabold font-[family-name:var(--font-jakarta)] text-white">
            {data.businessName}
          </h1>
        </motion.div>

        {/* Grade Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-8 text-center mb-6"
        >
          <div
            className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${grade.bg} text-white text-5xl font-extrabold shadow-lg mb-4`}
          >
            {data.overallGrade}
          </div>
          <p className={`text-xl font-bold ${grade.color}`}>{grade.label}</p>
          <p className="text-white/50 text-sm mt-1">
            You answered {data.callsAnswered} out of {data.callsTotal} calls
          </p>
        </motion.div>

        {/* Call Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-6 mb-6"
        >
          <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
            <Phone className="w-5 h-5 text-purple-400" />
            Call Timeline
          </h2>
          <div className="space-y-3">
            {data.calls.map((call) => {
              const Icon = getCallIcon(call.answeredBy);
              const color = getCallColor(call.answeredBy);
              return (
                <div
                  key={call.callNumber}
                  className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3"
                >
                  <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
                  <div className="flex-1">
                    <span className="text-white/70 text-sm">
                      {CALL_TYPE_LABELS[call.callType] || call.callType}
                    </span>
                    {call.firedAt && (
                      <span className="text-white/30 text-xs ml-2">
                        {new Date(call.firedAt).toLocaleString("en-US", {
                          weekday: "short",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${color}`}>
                    {getCallLabel(call.answeredBy)}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* AI Analysis */}
        {data.aiAnalysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-6 mb-6"
          >
            <h2 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              Analysis
            </h2>
            <p className="text-white/70 text-[15px] leading-relaxed">
              {data.aiAnalysis}
            </p>
          </motion.div>
        )}

        {/* Review Complaints */}
        {data.reviewComplaints && data.reviewComplaints.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-6 mb-6"
          >
            <h2 className="text-white font-bold text-lg mb-2 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-400" />
              What Your Customers Are Saying
            </h2>
            <p className="text-white/40 text-sm mb-4">
              {data.reviewComplaints.length} of your Google reviews mention phone issues:
            </p>
            <div className="space-y-3">
              {data.reviewComplaints.slice(0, 5).map((complaint: any, i: number) => (
                <div
                  key={i}
                  className="rounded-xl bg-red-500/[0.06] border border-red-500/10 p-4"
                >
                  <div className="flex items-center gap-1 mb-2">
                    {Array.from({ length: 5 }).map((_, si) => (
                      <Star
                        key={si}
                        className={`w-3.5 h-3.5 ${
                          si < complaint.rating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-white/10"
                        }`}
                      />
                    ))}
                    <span className="text-white/30 text-xs ml-2">
                      {complaint.author}
                    </span>
                  </div>
                  <p className="text-white/60 text-sm leading-relaxed">
                    &ldquo;{complaint.text.slice(0, 250)}
                    {complaint.text.length > 250 ? "..." : ""}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Revenue Impact */}
        {data.revenueImpact && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-6 mb-6"
          >
            <h2 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-400" />
              Revenue Impact
            </h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="rounded-xl bg-red-500/[0.08] border border-red-500/10 p-4 text-center">
                <p className="text-3xl font-extrabold text-red-400">
                  ${data.revenueImpact.monthlyRevenueLoss.toLocaleString()}
                </p>
                <p className="text-white/40 text-xs mt-1">Lost per month</p>
              </div>
              <div className="rounded-xl bg-red-500/[0.08] border border-red-500/10 p-4 text-center">
                <p className="text-3xl font-extrabold text-red-400">
                  ${data.revenueImpact.annualRevenueLoss.toLocaleString()}
                </p>
                <p className="text-white/40 text-xs mt-1">Lost per year</p>
              </div>
            </div>
            <p className="text-white/40 text-xs">
              Based on ~{data.revenueImpact.estimatedMonthlyCalls} estimated monthly
              calls, {Math.round(data.revenueImpact.missRate * 100)}% miss rate, and $
              {data.revenueImpact.avgCustomerValue} avg customer value. 85% of callers
              who reach voicemail never call back.
            </p>

            {/* Answering service comparison */}
            {data.hasAnsweringService && data.answeringServiceCost && (
              <div className="mt-4 rounded-xl bg-amber-500/[0.08] border border-amber-500/15 p-4">
                <p className="text-amber-300 text-sm">
                  <strong>About your answering service:</strong> You&apos;re paying $
                  {data.answeringServiceCost}/month for a service that{" "}
                  {data.callsAnswered < data.callsTotal
                    ? `still missed ${data.callsTotal - data.callsAnswered} of our ${data.callsTotal} test calls`
                    : "is handling your calls"}
                  . An AI phone agent costs{" "}
                  <strong>$99/month</strong> and answers 100% of calls, 24/7.
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl bg-gradient-to-br from-[#635BFF]/20 to-[#8B5CF6]/20 border border-purple-500/20 p-8 text-center"
        >
          <h2 className="text-white text-2xl font-extrabold font-[family-name:var(--font-jakarta)] mb-2">
            Fix This in 5 Minutes
          </h2>
          <p className="text-white/50 text-sm mb-6">
            Build an AI phone agent that answers every call, 24/7. Your business
            data is already pre-loaded.
          </p>
          <a
            href={wizardUrl}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#635BFF] to-[#8B5CF6] text-white font-bold text-lg hover:shadow-lg hover:shadow-purple-500/25 transition-all"
          >
            Build My AI Agent
            <ArrowRight className="w-5 h-5" />
          </a>
        </motion.div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-white/20 text-xs">
            Powered by{" "}
            <a
              href={mainPlatformUrl}
              className="text-white/30 hover:text-white/50 underline"
            >
              VoiceAI
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
