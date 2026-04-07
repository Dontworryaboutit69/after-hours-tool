export interface ReviewComplaint {
  text: string;
  rating: number;
  author: string;
  matchedKeywords: string[];
}

const PHONE_KEYWORDS = [
  "couldn't reach", "can't reach", "couldn't get through", "can't get through",
  "no one answered", "nobody answered", "didn't answer", "don't answer", "never answer",
  "left a message", "left voicemail", "voicemail", "voice mail",
  "on hold", "hold time", "waiting on hold", "put on hold",
  "never called back", "didn't call back", "no callback", "no call back",
  "didn't return my call", "never returned", "never return",
  "rude on the phone", "rude receptionist", "rude front desk",
  "hard to reach", "hard to get ahold", "hard to get a hold",
  "no response", "never responded", "no one responds",
  "hung up", "disconnected",
  "couldn't get anyone", "can't get anyone",
  "phone goes straight", "phone rings", "phone just rings",
  "waited for a call", "waiting for a call", "still waiting",
];

export function scanReviews(
  reviews: { text: string; stars: number; name: string }[]
): ReviewComplaint[] {
  const complaints: ReviewComplaint[] = [];

  for (const review of reviews) {
    if (review.stars > 3 || !review.text) continue;

    const lowerText = review.text.toLowerCase();
    const matched = PHONE_KEYWORDS.filter((kw) => lowerText.includes(kw));

    if (matched.length > 0) {
      complaints.push({
        text: review.text,
        rating: review.stars,
        author: review.name || "Anonymous",
        matchedKeywords: matched,
      });
    }
  }

  return complaints;
}
