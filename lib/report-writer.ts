import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function writeReportAnalysis(params: {
  businessName: string;
  industry: string;
  callsAnswered: number;
  callsTotal: number;
  patterns: string[];
  reviewComplaints: { text: string; rating: number }[];
  revenueImpact: { monthlyRevenueLoss: number; annualRevenueLoss: number; missedCallsPerMonth: number };
  hasAnsweringService: boolean;
  answeringServiceCost?: number | null;
  googleRating?: number;
  totalReviews?: number;
}): Promise<string> {
  const {
    businessName, industry, callsAnswered, callsTotal, patterns,
    reviewComplaints, revenueImpact, hasAnsweringService, answeringServiceCost,
    googleRating, totalReviews,
  } = params;

  const prompt = `You are writing a brief phone coverage analysis for ${businessName}, a ${industry} business${googleRating ? ` with a ${googleRating}-star Google rating (${totalReviews} reviews)` : ""}.

Here's what we found:
- We called their business phone ${callsTotal} times over 24 hours. They answered ${callsAnswered} out of ${callsTotal}.
${patterns.length > 0 ? `- Patterns: ${patterns.join(". ")}` : ""}
${reviewComplaints.length > 0 ? `- ${reviewComplaints.length} Google reviews mention phone issues (e.g.: "${reviewComplaints[0].text.slice(0, 150)}...")` : "- No Google reviews mention phone issues specifically."}
- Estimated missed calls per month: ${revenueImpact.missedCallsPerMonth}
- Estimated monthly revenue loss: $${revenueImpact.monthlyRevenueLoss.toLocaleString()}
${hasAnsweringService ? `- They currently pay $${answeringServiceCost}/month for an answering service that ${callsAnswered < callsTotal ? "still missed our calls" : "is working but expensive"}.` : "- They have no after-hours answering service."}

Write a 3-4 sentence analysis paragraph for their report. Be direct and specific — reference their actual numbers. Don't be salesy or use marketing language. Write like a consultant delivering findings to a business owner. Make it slightly uncomfortable — the kind of thing that makes them want to fix it immediately.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-20250414",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock?.text || "Unable to generate analysis.";
  } catch (error) {
    console.error("[report-writer] Claude API error:", error);
    // Fallback to a generic but data-driven analysis
    const missRate = Math.round(((callsTotal - callsAnswered) / callsTotal) * 100);
    return `${businessName} answered ${callsAnswered} out of ${callsTotal} test calls over 24 hours — a ${missRate}% miss rate. ${
      callsAnswered === 0
        ? "Not a single call was picked up."
        : `${callsTotal - callsAnswered} calls went unanswered.`
    } At an estimated ${revenueImpact.missedCallsPerMonth} missed calls per month, that translates to roughly $${revenueImpact.monthlyRevenueLoss.toLocaleString()} in lost revenue monthly.`;
  }
}
