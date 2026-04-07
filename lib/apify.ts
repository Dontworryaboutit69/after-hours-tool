const APIFY_API_KEY = process.env.APIFY_API_KEY!;
const ACTOR_ID = "compass~Google-Maps-Reviews-Scraper";

export interface ApifyReview {
  name: string;
  text: string;
  stars: number;
  publishedAtDate: string;
  likesCount: number;
}

export async function fetchGoogleReviews(
  placeUrl: string,
  maxReviews = 200
): Promise<ApifyReview[]> {
  // Start the actor run
  const runResponse = await fetch(
    `https://api.apify.com/v2/acts/${encodeURIComponent(ACTOR_ID)}/runs?token=${APIFY_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: [{ url: placeUrl }],
        maxReviews,
        reviewsSort: "lowest_rating",
        language: "en",
      }),
    }
  );

  if (!runResponse.ok) {
    throw new Error(`Apify run failed: ${runResponse.statusText}`);
  }

  const run = await runResponse.json();
  const runId = run.data.id;

  // Poll for completion (max 2 minutes)
  let status = run.data.status;
  let attempts = 0;
  while (status !== "SUCCEEDED" && status !== "FAILED" && attempts < 24) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    const statusRes = await fetch(
      `https://api.apify.com/v2/actor-runs/${runId}?token=${APIFY_API_KEY}`
    );
    const statusData = await statusRes.json();
    status = statusData.data.status;
    attempts++;
  }

  if (status !== "SUCCEEDED") {
    console.error(`[apify] Run ${runId} ended with status: ${status}`);
    return [];
  }

  // Fetch results from the default dataset
  const datasetId = run.data.defaultDatasetId;
  const dataRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_API_KEY}&format=json`
  );
  const items = await dataRes.json();

  // The scraper returns one item per place, with a reviews array
  const reviews: ApifyReview[] = [];
  for (const item of items) {
    if (item.reviews && Array.isArray(item.reviews)) {
      reviews.push(...item.reviews);
    }
  }

  return reviews;
}
