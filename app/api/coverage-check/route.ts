import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fireCall } from "@/lib/twilio";
import { fetchGoogleReviews } from "@/lib/apify";
import { scanReviews } from "@/lib/review-scanner";
import { calculateRevenueImpact } from "@/lib/revenue-calculator";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

function parseBusinessHours(googleBusinessData: any): { open: number; close: number } | null {
  try {
    const periods = googleBusinessData?.opening_hours?.periods;
    if (!periods || periods.length === 0) return null;

    const now = new Date();
    const dayOfWeek = now.getDay();

    const todayPeriod = periods.find((p: any) => p.open?.day === dayOfWeek);
    if (!todayPeriod?.open?.time || !todayPeriod?.close?.time) return null;

    const openTime = parseInt(todayPeriod.open.time, 10);
    const closeTime = parseInt(todayPeriod.close.time, 10);

    return {
      open: Math.floor(openTime / 100),
      close: Math.floor(closeTime / 100),
    };
  } catch {
    return null;
  }
}

function scheduleCallTimes(businessHours: { open: number; close: number } | null) {
  const now = new Date();
  const open = businessHours?.open ?? 9;
  const close = businessHours?.close ?? 17;
  const schedules: { scheduledAt: Date; callType: string }[] = [];

  // Call 2: 30 min after closing
  const afterHours = new Date(now);
  afterHours.setHours(close, 30, 0, 0);
  if (afterHours <= now) {
    afterHours.setDate(afterHours.getDate() + 1);
    afterHours.setHours(close, 30, 0, 0);
  }
  schedules.push({ scheduledAt: afterHours, callType: "after_hours" });

  // Call 3: 30 min before opening tomorrow
  const beforeHours = new Date(now);
  beforeHours.setDate(beforeHours.getDate() + 1);
  beforeHours.setHours(Math.max(open - 1, 6), 30, 0, 0);
  schedules.push({ scheduledAt: beforeHours, callType: "before_hours" });

  // Call 4: Midday tomorrow
  const midday = new Date(now);
  midday.setDate(midday.getDate() + 1);
  midday.setHours(Math.floor((open + close) / 2), 0, 0, 0);
  schedules.push({ scheduledAt: midday, callType: "business_hours_mid" });

  // Call 5: Afternoon tomorrow
  const afternoon = new Date(now);
  afternoon.setDate(afternoon.getDate() + 1);
  afternoon.setHours(close - 2, 0, 0, 0);
  schedules.push({ scheduledAt: afternoon, callType: "business_hours_afternoon" });

  return schedules;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      phoneNumber, contactName, contactPhone, email,
      businessName, industry, googlePlaceId, googleBusinessData,
      avgCustomerValue, hasAnsweringService, answeringServiceCost,
    } = body;

    if (!phoneNumber || !email) {
      return NextResponse.json(
        { success: false, error: "Phone number and email are required" },
        { status: 400 }
      );
    }

    // Normalize phone
    const normalizedPhone = phoneNumber.replace(/\D/g, "");
    if (normalizedPhone.length < 10) {
      return NextResponse.json(
        { success: false, error: "Invalid phone number" },
        { status: 400 }
      );
    }
    const e164Phone = normalizedPhone.startsWith("1")
      ? `+${normalizedPhone}`
      : `+1${normalizedPhone}`;

    // Rate limit
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`coverage:${ip}`, { maxRequests: 3, windowSeconds: 3600 });
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: "Too many checks. Please try again later.", resetIn: rateCheck.resetIn },
        { status: 429 }
      );
    }

    // Dedup
    const { data: existing } = await supabase
      .from("coverage_checks")
      .select("id, status, overall_grade")
      .eq("phone_number", e164Phone)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        data: { checkId: existing.id, cached: true, status: existing.status, grade: existing.overall_grade },
      });
    }

    // Insert check
    const { data: check, error: insertError } = await supabase
      .from("coverage_checks")
      .insert({
        phone_number: e164Phone,
        business_name: businessName,
        industry,
        google_place_id: googlePlaceId,
        google_business_data: googleBusinessData,
        contact_name: contactName,
        contact_phone: contactPhone,
        email,
        avg_customer_value: avgCustomerValue,
        has_answering_service: hasAnsweringService || false,
        answering_service_cost: answeringServiceCost,
        status: "in_progress",
        ip_address: ip,
      })
      .select()
      .single();

    if (insertError || !check) {
      console.error("[coverage-check] Insert error:", insertError);
      return NextResponse.json(
        { success: false, error: "Failed to create check" },
        { status: 500 }
      );
    }

    // Schedule all 5 calls
    const businessHours = parseBusinessHours(googleBusinessData);
    const scheduledCalls = scheduleCallTimes(businessHours);

    const callRows = [
      {
        check_id: check.id,
        call_number: 1,
        scheduled_at: new Date().toISOString(),
        call_type: "immediate",
        status: "in_progress",
        fired_at: new Date().toISOString(),
      },
      ...scheduledCalls.map((sc, i) => ({
        check_id: check.id,
        call_number: i + 2,
        scheduled_at: sc.scheduledAt.toISOString(),
        call_type: sc.callType,
        status: "scheduled",
      })),
    ];

    const { data: insertedCalls, error: callsError } = await supabase
      .from("coverage_calls")
      .insert(callRows)
      .select();

    if (callsError || !insertedCalls) {
      console.error("[coverage-check] Calls insert error:", callsError);
      return NextResponse.json(
        { success: false, error: "Failed to schedule calls" },
        { status: 500 }
      );
    }

    // Fire Call 1
    const call1 = insertedCalls.find((c) => c.call_number === 1);
    if (call1) {
      try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const sid = await fireCall({ to: e164Phone, callId: call1.id, appUrl });
        await supabase
          .from("coverage_calls")
          .update({ twilio_call_sid: sid })
          .eq("id", call1.id);
      } catch (callError) {
        console.error("[coverage-check] Call 1 failed:", callError);
        await supabase
          .from("coverage_calls")
          .update({ status: "failed", completed_at: new Date().toISOString() })
          .eq("id", call1.id);
      }
    }

    // Kick off review scraping (background — don't block response)
    const googleUrl =
      googleBusinessData?.url ||
      (googlePlaceId ? `https://www.google.com/maps/place/?q=place_id:${googlePlaceId}` : null);

    if (googleUrl) {
      fetchGoogleReviews(googleUrl, 200)
        .then((reviews) => {
          const complaints = scanReviews(
            reviews.map((r) => ({ text: r.text, stars: r.stars, name: r.name }))
          );
          return supabase
            .from("coverage_checks")
            .update({ review_complaints: complaints })
            .eq("id", check.id);
        })
        .catch((err) => console.error("[coverage-check] Review scraping failed:", err));
    }

    // Initial revenue estimate
    const totalReviews = googleBusinessData?.user_ratings_total || 50;
    const impact = calculateRevenueImpact({
      industry: industry || "other",
      avgCustomerValue,
      totalReviews,
      missRate: 0.6,
    });

    await supabase
      .from("coverage_checks")
      .update({ revenue_impact: impact })
      .eq("id", check.id);

    return NextResponse.json({
      success: true,
      data: {
        checkId: check.id,
        cached: false,
        status: "in_progress",
        scheduledCalls: scheduledCalls.map((sc, i) => ({
          callNumber: i + 2,
          scheduledAt: sc.scheduledAt.toISOString(),
          callType: sc.callType,
        })),
      },
    });
  } catch (error) {
    console.error("[coverage-check] Error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
