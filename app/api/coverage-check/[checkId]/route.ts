import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ checkId: string }> }
) {
  const { checkId } = await params;

  const { data: check, error } = await supabase
    .from("coverage_checks")
    .select("*")
    .eq("id", checkId)
    .single();

  if (error || !check) {
    return NextResponse.json({ success: false, error: "Check not found" }, { status: 404 });
  }

  const { data: calls } = await supabase
    .from("coverage_calls")
    .select("*")
    .eq("check_id", checkId)
    .order("call_number");

  // Mark report as viewed
  const referer = request.headers.get("referer") || "";
  if (referer.includes("/report/")) {
    await supabase
      .from("coverage_checks")
      .update({ report_viewed_at: new Date().toISOString() })
      .eq("id", checkId)
      .is("report_viewed_at", null);
  }

  return NextResponse.json({
    success: true,
    data: {
      id: check.id,
      status: check.status,
      businessName: check.business_name,
      industry: check.industry,
      phoneNumber: check.phone_number,
      overallGrade: check.overall_grade,
      callsAnswered: check.calls_answered,
      callsTotal: check.calls_total,
      reviewComplaints: check.review_complaints,
      revenueImpact: check.revenue_impact,
      aiAnalysis: check.ai_analysis,
      avgCustomerValue: check.avg_customer_value,
      hasAnsweringService: check.has_answering_service,
      answeringServiceCost: check.answering_service_cost,
      googleBusinessData: check.google_business_data,
      createdAt: check.created_at,
      completedAt: check.completed_at,
      calls: (calls || []).map((c) => ({
        callNumber: c.call_number,
        callType: c.call_type,
        scheduledAt: c.scheduled_at,
        status: c.status,
        answeredBy: c.answered_by,
        callDuration: c.call_duration,
        firedAt: c.fired_at,
        completedAt: c.completed_at,
      })),
    },
  });
}
