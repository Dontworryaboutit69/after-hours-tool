import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { fireCall } from "@/lib/twilio";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: dueCalls, error } = await supabase
      .from("coverage_calls")
      .select("*, coverage_checks!inner(phone_number, status)")
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .limit(20);

    if (error) {
      console.error("[cron/fire-scheduled-calls] Query error:", error);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    if (!dueCalls || dueCalls.length === 0) {
      return NextResponse.json({ success: true, fired: 0 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    let fired = 0;
    let failed = 0;

    for (const call of dueCalls) {
      const checkData = call.coverage_checks as any;
      if (checkData?.status === "failed") {
        await supabase
          .from("coverage_calls")
          .update({ status: "failed", completed_at: new Date().toISOString() })
          .eq("id", call.id);
        continue;
      }

      try {
        const sid = await fireCall({
          to: checkData.phone_number,
          callId: call.id,
          appUrl,
        });

        await supabase
          .from("coverage_calls")
          .update({
            status: "in_progress",
            twilio_call_sid: sid,
            fired_at: new Date().toISOString(),
          })
          .eq("id", call.id);

        fired++;
      } catch (err) {
        console.error(`[cron/fire-scheduled-calls] Failed call ${call.id}:`, err);
        await supabase
          .from("coverage_calls")
          .update({ status: "failed", completed_at: new Date().toISOString() })
          .eq("id", call.id);
        failed++;
      }
    }

    console.log(`[cron/fire-scheduled-calls] Fired: ${fired}, Failed: ${failed}`);
    return NextResponse.json({ success: true, fired, failed });
  } catch (error) {
    console.error("[cron/fire-scheduled-calls] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
