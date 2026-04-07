import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("place_id");

  if (!placeId) {
    return NextResponse.json({ error: "place_id required" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Google Places not configured" }, { status: 500 });
  }

  try {
    const fields = [
      "place_id", "name", "formatted_address", "formatted_phone_number",
      "website", "types", "rating", "user_ratings_total", "opening_hours",
      "reviews", "editorial_summary", "url",
    ].join(",");

    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`
    );
    const data = await res.json();

    if (data.status !== "OK") {
      return NextResponse.json({ error: `Google API error: ${data.status}` }, { status: 400 });
    }

    return NextResponse.json({ result: data.result });
  } catch (error) {
    console.error("[google-places/details] Error:", error);
    return NextResponse.json({ error: "Details fetch failed" }, { status: 500 });
  }
}
