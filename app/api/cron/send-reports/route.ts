import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { computeGrade } from "@/lib/grading";
import { calculateRevenueImpact } from "@/lib/revenue-calculator";
import { writeReportAnalysis } from "@/lib/report-writer";
import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: checks, error } = await supabase
      .from("coverage_checks")
      .select("*")
      .eq("status", "completed")
      .is("report_sent_at", null)
      .limit(10);

    if (error || !checks || checks.length === 0) {
      return NextResponse.json({ success: true, sent: 0 });
    }

    let sent = 0;
    let failed = 0;

    for (const check of checks) {
      try {
        const { data: calls } = await supabase
          .from("coverage_calls")
          .select("*")
          .eq("check_id", check.id)
          .order("call_number");

        if (!calls) continue;

        // Compute final grade
        const callResults = calls.map((c) => ({
          callNumber: c.call_number,
          callType: c.call_type,
          answeredBy: c.answered_by,
          callDuration: c.call_duration,
          ringDuration: c.ring_duration,
          status: c.status,
        }));
        const grade = computeGrade(callResults);

        // Revenue impact with real miss rate
        const totalReviews = check.google_business_data?.user_ratings_total || 50;
        const revenueImpact = calculateRevenueImpact({
          industry: check.industry || "other",
          avgCustomerValue: check.avg_customer_value,
          totalReviews,
          missRate: grade.missRate,
        });

        // AI analysis
        const aiAnalysis = await writeReportAnalysis({
          businessName: check.business_name || "Your business",
          industry: check.industry || "other",
          callsAnswered: grade.answeredCount,
          callsTotal: grade.totalCalls,
          patterns: grade.patterns,
          reviewComplaints: check.review_complaints || [],
          revenueImpact,
          hasAnsweringService: check.has_answering_service || false,
          answeringServiceCost: check.answering_service_cost,
          googleRating: check.google_business_data?.rating,
          totalReviews,
        });

        // Update check with final data
        await supabase
          .from("coverage_checks")
          .update({
            revenue_impact: revenueImpact,
            ai_analysis: aiAnalysis,
            overall_grade: grade.overall,
            calls_answered: grade.answeredCount,
          })
          .eq("id", check.id);

        // Build email
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const mainPlatformUrl = process.env.MAIN_PLATFORM_URL || "https://voice-ai-platform-phi.vercel.app";
        const reportUrl = `${appUrl}/report/${check.id}`;
        const wizardUrl = `${mainPlatformUrl}/agents/new?checkId=${check.id}`;

        const gradeColors: Record<string, string> = {
          A: "#10b981", B: "#3b82f6", C: "#f59e0b", D: "#f97316", F: "#ef4444",
        };
        const gradeColor = gradeColors[grade.overall] || "#ef4444";

        const callTimelineHtml = grade.perCall
          .map((c) => {
            const icon = c.grade === "A" ? "&#9989;" : c.grade === "B" ? "&#128993;" : c.grade === "D" ? "&#128680;" : "&#10060;";
            return `<tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${icon} Call ${c.callNumber}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${c.callType}</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: 600;">${c.summary}</td>
            </tr>`;
          })
          .join("");

        let reviewsHtml = "";
        const complaints = check.review_complaints || [];
        if (complaints.length > 0) {
          const reviewItems = complaints
            .slice(0, 3)
            .map(
              (r: any) =>
                `<div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; margin-bottom: 12px; border-radius: 0 8px 8px 0;">
                  <div style="color: #b91c1c; font-size: 12px; margin-bottom: 4px;">${"&#11088;".repeat(r.rating)} &mdash; ${r.author || "Anonymous"}</div>
                  <div style="color: #374151; font-size: 14px;">&ldquo;${r.text.slice(0, 200)}${r.text.length > 200 ? "..." : ""}&rdquo;</div>
                </div>`
            )
            .join("");

          reviewsHtml = `
            <div style="margin-top: 32px;">
              <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px;">What Your Customers Are Saying</h2>
              <p style="color: #6b7280; margin-bottom: 16px;">${complaints.length} of your Google reviews mention phone issues:</p>
              ${reviewItems}
            </div>`;
        }

        let answeringServiceHtml = "";
        if (check.has_answering_service && check.answering_service_cost) {
          answeringServiceHtml = `
            <div style="background: #fffbeb; border: 1px solid #fbbf24; border-radius: 12px; padding: 20px; margin-top: 24px;">
              <h3 style="font-size: 16px; font-weight: 700; color: #92400e; margin-bottom: 8px;">About Your Current Answering Service</h3>
              <p style="color: #78350f; font-size: 14px;">You're paying <strong>$${check.answering_service_cost}/month</strong> for a service that ${grade.answeredCount < grade.totalCalls ? `still missed ${grade.totalCalls - grade.answeredCount} of our ${grade.totalCalls} test calls` : "is handling your calls"}. An AI phone agent costs <strong>$99/month</strong> and answers 100% of calls, 24/7.</p>
            </div>`;
        }

        const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 20px;">
  <div style="background: linear-gradient(135deg, #635BFF, #8B5CF6); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
    <h1 style="color: white; font-size: 24px; margin: 0 0 8px 0;">Phone Coverage Report</h1>
    <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0;">${check.business_name || "Your Business"}</p>
  </div>
  <div style="background: white; padding: 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; text-align: center;">
    <div style="display: inline-block; width: 80px; height: 80px; border-radius: 50%; background: ${gradeColor}; color: white; font-size: 36px; font-weight: 800; line-height: 80px; margin-bottom: 12px;">${grade.overall}</div>
    <p style="font-size: 18px; font-weight: 700; color: #111827; margin: 8px 0 4px;">You answered ${grade.answeredCount} out of ${grade.totalCalls} calls</p>
    <p style="font-size: 14px; color: #6b7280;">We called your business 5 times over 24 hours.</p>
  </div>
  <div style="background: white; padding: 0 30px 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
    <table style="width: 100%; border-collapse: collapse;">
      <thead><tr style="background: #f9fafb;">
        <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Call</th>
        <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Time</th>
        <th style="padding: 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase;">Result</th>
      </tr></thead>
      <tbody>${callTimelineHtml}</tbody>
    </table>
    ${grade.patterns.length > 0 ? `<div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin-top: 20px;">
      <p style="font-size: 14px; font-weight: 600; color: #92400e; margin: 0 0 8px;">&#9888;&#65039; Patterns Detected</p>
      ${grade.patterns.map((p) => `<p style="font-size: 13px; color: #78350f; margin: 4px 0;">&#8226; ${p}</p>`).join("")}
    </div>` : ""}
  </div>
  <div style="background: white; padding: 24px 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
    <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 12px;">Analysis</h2>
    <p style="font-size: 15px; color: #374151; line-height: 1.6;">${aiAnalysis}</p>
  </div>
  <div style="background: white; padding: 0 30px 24px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">${reviewsHtml}</div>
  <div style="background: white; padding: 24px 30px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
    <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin: 0 0 16px;">Revenue Impact</h2>
    <table style="width: 100%;"><tr>
      <td style="width: 50%; padding: 8px;"><div style="background: #fef2f2; border-radius: 12px; padding: 16px; text-align: center;">
        <p style="font-size: 28px; font-weight: 800; color: #dc2626; margin: 0;">$${revenueImpact.monthlyRevenueLoss.toLocaleString()}</p>
        <p style="font-size: 12px; color: #991b1b; margin: 4px 0 0;">Lost per month</p>
      </div></td>
      <td style="width: 50%; padding: 8px;"><div style="background: #fef2f2; border-radius: 12px; padding: 16px; text-align: center;">
        <p style="font-size: 28px; font-weight: 800; color: #dc2626; margin: 0;">$${revenueImpact.annualRevenueLoss.toLocaleString()}</p>
        <p style="font-size: 12px; color: #991b1b; margin: 4px 0 0;">Lost per year</p>
      </div></td>
    </tr></table>
    <p style="font-size: 13px; color: #6b7280; margin-top: 12px;">Based on ~${revenueImpact.estimatedMonthlyCalls} estimated monthly calls, ${Math.round(revenueImpact.missRate * 100)}% miss rate, and $${revenueImpact.avgCustomerValue} avg customer value.</p>
    ${answeringServiceHtml}
  </div>
  <div style="background: linear-gradient(135deg, #635BFF, #8B5CF6); padding: 32px 30px; text-align: center; border-radius: 0 0 16px 16px;">
    <h2 style="color: white; font-size: 22px; font-weight: 700; margin: 0 0 8px;">Fix This in 5 Minutes</h2>
    <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 20px;">Build an AI phone agent that answers every call, 24/7.</p>
    <a href="${wizardUrl}" style="display: inline-block; background: white; color: #635BFF; font-weight: 700; font-size: 16px; padding: 14px 32px; border-radius: 10px; text-decoration: none;">Build My AI Agent</a>
    <p style="color: rgba(255,255,255,0.6); font-size: 12px; margin: 16px 0 0;"><a href="${reportUrl}" style="color: rgba(255,255,255,0.6); text-decoration: underline;">View full report online</a></p>
  </div>
</body>
</html>`;

        const fromEmail = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
        const { error: emailError } = await getResend().emails.send({
          from: fromEmail,
          to: check.email,
          subject: `${check.business_name ? check.business_name + ": " : ""}Your Phone Coverage Report — Grade ${grade.overall}`,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`[cron/send-reports] Email error for ${check.id}:`, emailError);
          failed++;
          continue;
        }

        await supabase
          .from("coverage_checks")
          .update({ report_sent_at: new Date().toISOString() })
          .eq("id", check.id);

        sent++;
        console.log(`[cron/send-reports] Report sent for ${check.id} to ${check.email}`);
      } catch (err) {
        console.error(`[cron/send-reports] Error on ${check.id}:`, err);
        failed++;
      }
    }

    return NextResponse.json({ success: true, sent, failed });
  } catch (error) {
    console.error("[cron/send-reports] Error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
