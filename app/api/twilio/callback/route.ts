import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { computeGrade } from "@/lib/grading";

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const callId = searchParams.get("callId");

  if (!callId) {
    console.error("[twilio/callback] Missing callId");
    return NextResponse.json({ error: "Missing callId" }, { status: 400 });
  }

  try {
    const formData = await request.formData();
    const callStatus = formData.get("CallStatus") as string | null;
    const answeredBy = formData.get("AnsweredBy") as string | null;
    const callDuration = formData.get("CallDuration") as string | null;
    const callSid = formData.get("CallSid") as string | null;

    console.log(
      `[twilio/callback] callId=${callId} status=${callStatus} answeredBy=${answeredBy} duration=${callDuration}`
    );

    // Build update
    const update: Record<string, any> = {
      raw_twilio_data: Object.fromEntries(formData.entries()),
    };

    if (callSid) update.twilio_call_sid = callSid;
    if (answeredBy) update.answered_by = answeredBy;
    if (callDuration) update.call_duration = parseInt(callDuration, 10);

    // Terminal statuses
    const terminalStatuses = ["completed", "no-answer", "busy", "failed", "canceled"];
    if (callStatus && terminalStatuses.includes(callStatus)) {
      update.status = "completed";
      update.completed_at = new Date().toISOString();

      if (!answeredBy && (callStatus === "no-answer" || callStatus === "busy" || callStatus === "failed")) {
        update.answered_by = callStatus;
      }
    }

    // Update call record
    const { error: updateError } = await supabase
      .from("coverage_calls")
      .update(update)
      .eq("id", callId);

    if (updateError) {
      console.error("[twilio/callback] Update error:", updateError);
    }

    // Check if all calls for this check are done
    const { data: callRow } = await supabase
      .from("coverage_calls")
      .select("check_id")
      .eq("id", callId)
      .single();

    if (callRow) {
      const { data: allCalls } = await supabase
        .from("coverage_calls")
        .select("*")
        .eq("check_id", callRow.check_id)
        .order("call_number");

      if (allCalls) {
        const allDone = allCalls.every(
          (c) => c.status === "completed" || c.status === "failed"
        );

        if (allDone) {
          const callResults = allCalls.map((c) => ({
            callNumber: c.call_number,
            callType: c.call_type,
            answeredBy: c.answered_by,
            callDuration: c.call_duration,
            ringDuration: c.ring_duration,
            status: c.status,
          }));

          const grade = computeGrade(callResults);

          await supabase
            .from("coverage_checks")
            .update({
              status: "completed",
              calls_answered: grade.answeredCount,
              overall_grade: grade.overall,
              completed_at: new Date().toISOString(),
            })
            .eq("id", callRow.check_id);

          console.log(
            `[twilio/callback] Check ${callRow.check_id} completed. Grade: ${grade.overall} (${grade.answeredCount}/${grade.totalCalls})`
          );
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[twilio/callback] Error:", error);
    return NextResponse.json({ error: "Callback processing failed" }, { status: 500 });
  }
}
