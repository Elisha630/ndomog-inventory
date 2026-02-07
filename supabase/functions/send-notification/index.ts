import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeviceToken {
  token: string;
  platform?: string;
  user_id: string;
}

// Generate OAuth2 access token for FCM v1 API
async function getAccessToken(serviceAccount: Record<string, string>): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const expiry = now + 3600;

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: expiry,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signatureInput = `${headerB64}.${payloadB64}`;

  const privateKeyPem = serviceAccount.private_key;
  const privateKeyDer = pemToDer(privateKeyPem);

  const key = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(signatureInput));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${signatureInput}.${signatureB64}`;

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

function pemToDer(pem: string): ArrayBuffer {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = pem.replace(pemHeader, "").replace(pemFooter, "").replace(/\s/g, "");
  const binaryString = atob(pemContents);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fcmServiceAccountJson = Deno.env.get("FCM_SERVICE_ACCOUNT");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for webhook-style call (from database trigger)
    const body = await req.json().catch(() => ({}));
    const { record } = body;

    // If called from a database trigger, we have a single notification record
    if (record) {
      console.log("Processing notification:", record);

      const { user_id, action, item_name, action_user_email, details } = record;

      if (!user_id) {
        console.log("No user_id in notification, skipping push");
        return new Response(
          JSON.stringify({ message: "No user_id, skipped" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get device tokens for this specific user
      const { data: deviceTokens, error: tokensError } = await supabase
        .from("push_subscriptions")
        .select("token, platform, user_id")
        .eq("user_id", user_id);

      if (tokensError) {
        console.error("Error fetching device tokens:", tokensError);
        throw tokensError;
      }

      if (!deviceTokens || deviceTokens.length === 0) {
        console.log("No device tokens for user:", user_id);
        return new Response(
          JSON.stringify({ message: "No device tokens for user" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build notification message
      const senderName = action_user_email ? action_user_email.split("@")[0] : "Someone";
      const notificationTitle = `${senderName} ${action} ${item_name}`;
      const notificationBody = details || `Item ${action}`;

      // Send FCM push notifications
      if (fcmServiceAccountJson) {
        try {
          const serviceAccount = JSON.parse(fcmServiceAccountJson);
          const projectId = serviceAccount.project_id;
          const accessToken = await getAccessToken(serviceAccount);

          const androidTokens = (deviceTokens as DeviceToken[])
            .filter((dt) => !dt.platform || dt.platform === "android")
            .map((dt) => dt.token);

          console.log(`Sending push to ${androidTokens.length} Android devices`);

          for (const token of androidTokens) {
            try {
              const fcmResponse = await fetch(
                `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                  },
                  body: JSON.stringify({
                    message: {
                      token: token,
                      notification: {
                        title: notificationTitle,
                        body: notificationBody,
                      },
                      android: {
                        priority: "high",
                        notification: {
                          icon: "ic_stat_notification",
                          sound: "default",
                          channelId: "ndomog_inventory_channel",
                        },
                      },
                      data: {
                        type: record.type || "NOTIFICATION",
                        notificationId: record.id,
                        click_action: "OPEN_NOTIFICATION",
                      },
                    },
                  }),
                }
              );

              const result = await fcmResponse.json();
              if (!fcmResponse.ok) {
                console.error(`FCM error for token:`, result);
              } else {
                console.log(`FCM push sent successfully`);
              }
            } catch (tokenError) {
              console.error(`Error sending to token:`, tokenError);
            }
          }
        } catch (fcmError) {
          console.error("FCM v1 API error:", fcmError);
        }
      } else {
        console.log("FCM_SERVICE_ACCOUNT not configured, skipping push notifications");
      }

      return new Response(
        JSON.stringify({ message: "Push notification sent", user_id }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no record, return info
    return new Response(
      JSON.stringify({ message: "send-notification edge function ready" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
