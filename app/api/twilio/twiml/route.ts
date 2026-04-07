import { NextResponse } from "next/server";

const TWIML = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="2"/>
  <Hangup/>
</Response>`;

export async function POST() {
  return new NextResponse(TWIML, {
    headers: { "Content-Type": "text/xml" },
  });
}

export async function GET() {
  return new NextResponse(TWIML, {
    headers: { "Content-Type": "text/xml" },
  });
}
