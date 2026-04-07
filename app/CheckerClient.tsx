"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Phone, Mail, User, DollarSign, ArrowRight, CheckCircle2,
  PhoneOff, PhoneMissed, Loader2, Shield, Clock, TrendingDown,
  Headphones, AlertTriangle,
} from "lucide-react";
import GoogleBusinessSearch, { type GoogleBusinessResult } from "@/components/GoogleBusinessSearch";

type Phase = "search" | "questions" | "calling" | "preliminary";

interface CallSchedule {
  callNumber: number;
  scheduledAt: string;
  callType: string;
}

interface Call1Result {
  status: string;
  answeredBy: string | null;
  callDuration: number | null;
}

const CALL_TYPE_LABELS: Record<string, string> = {
  after_hours: "After hours",
  before_hours: "Before opening",
  business_hours_mid: "Midday",
  business_hours_afternoon: "Afternoon",
};

const LOADING_STAGES = [
  { message: "Dialing your number...", icon: Phone, duration: 3000 },
  { message: "Ringing...", icon: Phone, duration: 5000 },
  { message: "Listening for an answer...", icon: Headphones, duration: 7000 },
  { message: "Analyzing the response...", icon: Shield, duration: 10000 },
];

const STATS = [
  "62% of calls to small businesses go unanswered",
  "85% of callers who reach voicemail never call back",
  "78% of customers buy from whoever responds first",
  "Small businesses lose an average of $126,000/year to missed calls",
];

export default function CheckerClient() {
  const [phase, setPhase] = useState<Phase>("search");
  const [selectedBusiness, setSelectedBusiness] = useState<GoogleBusinessResult | null>(null);

  // Form fields
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [email, setEmail] = useState("");
  const [avgCustomerValue, setAvgCustomerValue] = useState("");
  const [hasAnsweringService, setHasAnsweringService] = useState<boolean | null>(null);
  const [answeringServiceCost, setAnsweringServiceCost] = useState("");

  // Check state
  const [checkId, setCheckId] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState(0);
  const [statIndex, setStatIndex] = useState(0);
  const [call1Result, setCall1Result] = useState<Call1Result | null>(null);
  const [scheduledCalls, setScheduledCalls] = useState<CallSchedule[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const pollRef = useRef<NodeJS.Timeout>(null);

  // Loading stage progression
  useEffect(() => {
    if (phase !== "calling") return;
    const timers: NodeJS.Timeout[] = [];
    let accumulated = 0;
    LOADING_STAGES.forEach((stage, i) => {
      accumulated += stage.duration;
      timers.push(setTimeout(() => setLoadingStage(i), accumulated - stage.duration));
    });
    return () => timers.forEach(clearTimeout);
  }, [phase]);

  // Rotate stats during loading
  useEffect(() => {
    if (phase !== "calling") return;
    const interval = setInterval(() => {
      setStatIndex((prev) => (prev + 1) % STATS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [phase]);

  // Poll for Call 1 result
  useEffect(() => {
    if (!checkId || phase !== "calling") return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/coverage-check/${checkId}`);
        const data = await res.json();
        if (!data.success) return;

        const calls = data.data.calls || [];
        const call1 = calls.find((c: any) => c.callNumber === 1);

        if (call1 && (call1.status === "completed" || call1.status === "failed")) {
          setCall1Result({
            status: call1.status,
            answeredBy: call1.answeredBy,
            callDuration: call1.callDuration,
          });
          setPhase("preliminary");
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch {
        // Keep polling
      }
    };

    pollRef.current = setInterval(poll, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [checkId, phase]);

  const handleBusinessSelect = (business: GoogleBusinessResult) => {
    setSelectedBusiness(business);
    // Auto-fill phone from GBP
    setPhase("questions");
  };

  const handleSubmit = async () => {
    if (!selectedBusiness || !email || !contactName) return;
    setSubmitting(true);
    setError(null);

    try {
      const businessPhone =
        selectedBusiness.formatted_phone_number?.replace(/\D/g, "") || "";

      const res = await fetch("/api/coverage-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: businessPhone,
          contactName,
          contactPhone: contactPhone.replace(/\D/g, "") || null,
          email,
          businessName: selectedBusiness.name,
          industry: guessIndustry(selectedBusiness.types),
          googlePlaceId: selectedBusiness.place_id,
          googleBusinessData: selectedBusiness,
          avgCustomerValue: avgCustomerValue ? parseFloat(avgCustomerValue) : null,
          hasAnsweringService: hasAnsweringService || false,
          answeringServiceCost: answeringServiceCost
            ? parseFloat(answeringServiceCost)
            : null,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      setCheckId(data.data.checkId);

      if (data.data.cached && data.data.status === "completed") {
        // Already have results — skip to report
        window.location.href = `/report/${data.data.checkId}`;
        return;
      }

      setScheduledCalls(data.data.scheduledCalls || []);
      setPhase("calling");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatPhoneInput = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const getCall1Message = () => {
    if (!call1Result) return "";
    const { answeredBy } = call1Result;
    if (answeredBy === "human") return "Someone answered your phone.";
    if (answeredBy?.startsWith("machine")) return "Your call went to voicemail.";
    if (answeredBy === "busy") return "Your line was busy.";
    if (answeredBy === "no-answer" || answeredBy === "failed")
      return "Nobody answered. The call went nowhere.";
    return "We couldn't determine what happened.";
  };

  const getCall1Color = () => {
    if (!call1Result) return "text-white/50";
    const { answeredBy } = call1Result;
    if (answeredBy === "human") return "text-emerald-400";
    if (answeredBy?.startsWith("machine")) return "text-orange-400";
    return "text-red-400";
  };

  const getCall1Icon = () => {
    if (!call1Result) return PhoneOff;
    const { answeredBy } = call1Result;
    if (answeredBy === "human") return Phone;
    return PhoneMissed;
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-purple-500/[0.07] blur-[160px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-blue-500/[0.05] blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 text-purple-300 text-sm mb-6">
            <Phone className="w-4 h-4" />
            Free Phone Coverage Check
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold font-[family-name:var(--font-jakarta)] leading-tight">
            Is Your Business{" "}
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              Losing Calls?
            </span>
          </h1>
          <p className="text-white/50 text-lg mt-4 max-w-lg mx-auto">
            We call your business 5 times over 24 hours and show you exactly
            where you&apos;re losing customers. Free report, no strings attached.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {/* Phase 1: Google Business Search */}
          {phase === "search" && (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mb-3">
                <label className="text-white/60 text-sm font-medium mb-2 block">
                  Find your business
                </label>
                <GoogleBusinessSearch
                  selected={selectedBusiness}
                  onSelect={handleBusinessSelect}
                  onClear={() => {
                    setSelectedBusiness(null);
                    setPhase("search");
                  }}
                />
              </div>
              <p className="text-center text-white/25 text-xs mt-6">
                We use your Google Business Profile to get your phone number,
                hours, and reviews.
              </p>
            </motion.div>
          )}

          {/* Phase 2: Quick Questions */}
          {phase === "questions" && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Selected business card (compact) */}
              <GoogleBusinessSearch
                selected={selectedBusiness}
                onSelect={handleBusinessSelect}
                onClear={() => {
                  setSelectedBusiness(null);
                  setPhase("search");
                }}
              />

              <div className="mt-8 space-y-5">
                {/* Name */}
                <div>
                  <label className="text-white/60 text-sm font-medium mb-1.5 block">
                    Your name
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/25" />
                    <input
                      type="text"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="John Smith"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Phone */}
                <div>
                  <label className="text-white/60 text-sm font-medium mb-1.5 block">
                    Your phone number{" "}
                    <span className="text-white/30">(optional)</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/25" />
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) =>
                        setContactPhone(formatPhoneInput(e.target.value))
                      }
                      placeholder="(555) 123-4567"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>
                  <p className="text-white/25 text-xs mt-1">
                    We&apos;ll text you when your report is ready
                  </p>
                </div>

                {/* Email */}
                <div>
                  <label className="text-white/60 text-sm font-medium mb-1.5 block">
                    Your email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/25" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@business.com"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* Avg Customer Value */}
                <div>
                  <label className="text-white/60 text-sm font-medium mb-1.5 block">
                    What&apos;s your average customer worth?
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/25" />
                    <input
                      type="number"
                      value={avgCustomerValue}
                      onChange={(e) => setAvgCustomerValue(e.target.value)}
                      placeholder="500"
                      className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                    />
                  </div>
                  <p className="text-white/25 text-xs mt-1">
                    Rough estimate — what does a typical job or visit bring in?
                  </p>
                </div>

                {/* After-hours service */}
                <div>
                  <label className="text-white/60 text-sm font-medium mb-2 block">
                    Do you have an after-hours answering service?
                  </label>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setHasAnsweringService(true)}
                      className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                        hasAnsweringService === true
                          ? "border-purple-500 bg-purple-500/20 text-purple-300"
                          : "border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/[0.08]"
                      }`}
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => {
                        setHasAnsweringService(false);
                        setAnsweringServiceCost("");
                      }}
                      className={`flex-1 py-3 rounded-xl border text-sm font-medium transition-all ${
                        hasAnsweringService === false
                          ? "border-purple-500 bg-purple-500/20 text-purple-300"
                          : "border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/[0.08]"
                      }`}
                    >
                      No
                    </button>
                  </div>
                </div>

                {/* Answering service cost (conditional) */}
                <AnimatePresence>
                  {hasAnsweringService && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <label className="text-white/60 text-sm font-medium mb-1.5 block">
                        How much do you pay per month?
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-white/25" />
                        <input
                          type="number"
                          value={answeringServiceCost}
                          onChange={(e) =>
                            setAnsweringServiceCost(e.target.value)
                          }
                          placeholder="200"
                          className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-white/[0.06] border border-white/10 text-white placeholder-white/25 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 transition-all"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error */}
                {error && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-300 text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!contactName || !email || submitting}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-[#635BFF] to-[#8B5CF6] text-white font-bold text-lg flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      Run My Phone Check
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                <p className="text-center text-white/20 text-xs">
                  We&apos;ll call your business phone 5 times over 24 hours. Your
                  report will be emailed to you.
                </p>
              </div>
            </motion.div>
          )}

          {/* Phase 3: Calling / Loading */}
          {phase === "calling" && (
            <motion.div
              key="calling"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-10">
                {/* Animated phone pulse */}
                <div className="relative w-24 h-24 mx-auto mb-8">
                  <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping" />
                  <div className="absolute inset-2 rounded-full bg-purple-500/30 animate-pulse" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {(() => {
                      const StageIcon =
                        LOADING_STAGES[loadingStage]?.icon || Phone;
                      return (
                        <StageIcon className="w-10 h-10 text-purple-400" />
                      );
                    })()}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  <motion.p
                    key={loadingStage}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-white text-xl font-semibold mb-3"
                  >
                    {LOADING_STAGES[loadingStage]?.message || "Almost done..."}
                  </motion.p>
                </AnimatePresence>

                <p className="text-white/40 text-sm">
                  Calling {selectedBusiness?.formatted_phone_number || "your business"}...
                </p>

                {/* Rotating stats */}
                <div className="mt-8 rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={statIndex}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="text-white/40 text-sm italic"
                    >
                      {STATS[statIndex]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {/* Phase 4: Preliminary Result */}
          {phase === "preliminary" && call1Result && (
            <motion.div
              key="preliminary"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Call 1 result */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-8 text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-white/[0.06]">
                  {(() => {
                    const Icon = getCall1Icon();
                    return <Icon className={`w-8 h-8 ${getCall1Color()}`} />;
                  })()}
                </div>
                <p className={`text-2xl font-bold ${getCall1Color()}`}>
                  {getCall1Message()}
                </p>
                <p className="text-white/40 text-sm mt-2">
                  We just called {selectedBusiness?.name || "your business"}.
                </p>
              </div>

              {/* What's next */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-8">
                <h3 className="text-white font-bold text-lg mb-1">
                  4 more checks coming...
                </h3>
                <p className="text-white/40 text-sm mb-6">
                  We&apos;re testing your phone coverage at different times over the
                  next 24 hours.
                </p>

                <div className="space-y-3">
                  {scheduledCalls.map((call) => (
                    <div
                      key={call.callNumber}
                      className="flex items-center gap-3 rounded-xl bg-white/[0.03] border border-white/[0.06] px-4 py-3"
                    >
                      <Clock className="w-4 h-4 text-white/30" />
                      <span className="text-white/60 text-sm flex-1">
                        {CALL_TYPE_LABELS[call.callType] || call.callType}
                      </span>
                      <span className="text-white/30 text-xs">
                        {new Date(call.scheduledAt).toLocaleString("en-US", {
                          weekday: "short",
                          hour: "numeric",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 p-5">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white font-medium text-sm">
                        Your full report will arrive at{" "}
                        <span className="text-purple-300">{email}</span>
                      </p>
                      <p className="text-white/40 text-xs mt-1">
                        Includes coverage score, Google review analysis, and
                        revenue impact breakdown.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Secondary CTA */}
                <div className="mt-6 text-center">
                  <p className="text-white/30 text-xs mb-3">
                    Don&apos;t want to wait?
                  </p>
                  <a
                    href={`${process.env.NEXT_PUBLIC_MAIN_PLATFORM_URL || "https://voice-ai-platform-phi.vercel.app"}/onboarding?checkId=${checkId}`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-purple-500/30 text-purple-300 text-sm font-medium hover:bg-purple-500/10 transition-all"
                  >
                    Build your AI agent now
                    <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Simple industry guesser from Google Places types
function guessIndustry(types: string[]): string {
  const typeMap: Record<string, string> = {
    dentist: "dental",
    doctor: "medical",
    hospital: "medical",
    lawyer: "legal",
    real_estate_agency: "real-estate",
    plumber: "plumbing",
    electrician: "home-services",
    roofing_contractor: "roofing",
    restaurant: "restaurant",
    hair_care: "salon",
    beauty_salon: "salon",
    car_repair: "auto",
    car_dealer: "auto",
    landscaping: "landscaping",
    pest_control: "pest-control",
    insurance_agency: "insurance",
    accounting: "financial",
    gym: "other",
  };

  for (const t of types) {
    if (typeMap[t]) return typeMap[t];
  }
  return "other";
}
