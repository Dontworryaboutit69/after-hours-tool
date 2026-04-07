import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ error: "Query too short" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Google Places not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
    );
    const data = await res.json();

    const results = (data.results || []).slice(0, 8).map((place: any) => ({
      place_id: place.place_id,
      name: place.name,
      formatted_address: place.formatted_address,
      rating: place.rating,
      user_ratings_total: place.user_ratings_total,
      types: place.types,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[google-places/search] Error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
