import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function fireCall(params: {
  to: string;
  callId: string;
  appUrl: string;
}) {
  const call = await client.calls.create({
    to: params.to,
    from: process.env.TWILIO_PHONE_NUMBER!,
    url: `${params.appUrl}/api/twilio/twiml`,
    statusCallback: `${params.appUrl}/api/twilio/callback?callId=${params.callId}`,
    statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
    statusCallbackMethod: "POST",
    machineDetection: "DetectMessageEnd",
    asyncAmd: "true",
    asyncAmdStatusCallback: `${params.appUrl}/api/twilio/callback?callId=${params.callId}`,
    asyncAmdStatusCallbackMethod: "POST",
    timeout: 30,
  });
  return call.sid;
}

export { client as twilioClient };
