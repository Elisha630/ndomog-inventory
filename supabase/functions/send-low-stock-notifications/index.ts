import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeviceToken {
  token: string;
  platform: string;
  user_id: string;
}

interface LowStockItem {
  id: string;
  name: string;
  quantity: number;
  low_stock_threshold: number;
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

  // Encode header and payload
  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const signatureInput = `${headerB64}.${payloadB64}`;

  // Import private key
  const privateKeyPem = serviceAccount.private_key;
  const privateKeyDer = pemToDer(privateKeyPem);

  const key = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Sign
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(signatureInput));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${signatureInput}.${signatureB64}`;

  // Exchange JWT for access token
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

    // Get all items that are below their low stock threshold (excluding soft deleted)
    const { data: allItems, error: itemsError } = await supabase
      .from("items")
      .select("id, name, quantity, low_stock_threshold, is_deleted")
      .eq("is_deleted", false);

    if (itemsError) {
      console.error("Error fetching items:", itemsError);
      throw itemsError;
    }

    // Filter items that are actually low stock
    const actualLowStockItems: LowStockItem[] = (allItems || []).filter(
      (item: any) => item.quantity <= item.low_stock_threshold
    );

    if (actualLowStockItems.length === 0) {
      console.log("No low stock items found");
      return new Response(
        JSON.stringify({ message: "No low stock items", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${actualLowStockItems.length} low stock items`);

    // Get all device tokens
    const { data: deviceTokens, error: tokensError } = await supabase
      .from("device_tokens")
      .select("token, platform, user_id");

    if (tokensError) {
      console.error("Error fetching device tokens:", tokensError);
      throw tokensError;
    }

    if (!deviceTokens || deviceTokens.length === 0) {
      console.log("No device tokens registered");
      return new Response(
        JSON.stringify({ message: "No device tokens registered", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${deviceTokens.length} device tokens`);

    // Build notification message
    const itemNames = actualLowStockItems.slice(0, 3).map((item) => item.name).join(", ");
    const moreCount = actualLowStockItems.length > 3 ? ` and ${actualLowStockItems.length - 3} more` : "";

    const notificationTitle = "Low Stock Alert";
    const notificationBody = `${itemNames}${moreCount} ${actualLowStockItems.length === 1 ? "is" : "are"} running low on stock!`;

    // Send FCM notifications using HTTP v1 API
    if (fcmServiceAccountJson) {
      try {
        const serviceAccount = JSON.parse(fcmServiceAccountJson);
        const projectId = serviceAccount.project_id;
        const accessToken = await getAccessToken(serviceAccount);

        const androidTokens = (deviceTokens as DeviceToken[])
          .filter((dt) => dt.platform === "android")
          .map((dt) => dt.token);

        console.log(`Sending to ${androidTokens.length} Android devices via FCM v1 API`);

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
                        icon: "ic_notification",
                        sound: "default",
                        channelId: "low_stock_alerts",
                      },
                    },
                    data: {
                      type: "LOW_STOCK",
                      items: JSON.stringify(actualLowStockItems.map((i) => ({ id: i.id, name: i.name }))),
                      click_action: "FLUTTER_NOTIFICATION_CLICK",
                    },
                  },
                }),
              }
            );

            const result = await fcmResponse.json();
            if (!fcmResponse.ok) {
              console.error(`FCM error for token ${token.substring(0, 20)}...:`, result);
            } else {
              console.log(`FCM success for token ${token.substring(0, 20)}...`);
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

    // Create in-app notifications for all users with type and entity_id
    const uniqueUserIds = [...new Set((deviceTokens as DeviceToken[]).map((dt) => dt.user_id))];

    for (const userId of uniqueUserIds) {
      // Create notification for each low stock item
      for (const item of actualLowStockItems.slice(0, 5)) {
        await supabase.from("notifications").insert({
          user_id: userId,
          action: "low_stock_alert",
          item_name: item.name,
          action_user_email: "System",
          details: `${item.name} has only ${item.quantity} units left (threshold: ${item.low_stock_threshold})`,
          type: "LOW_STOCK",
          entity_id: item.id,
        });
      }

      // If more than 5 items, add a summary notification
      if (actualLowStockItems.length > 5) {
        await supabase.from("notifications").insert({
          user_id: userId,
          action: "low_stock_alert",
          item_name: `${actualLowStockItems.length - 5} more items`,
          action_user_email: "System",
          details: `${actualLowStockItems.length} items are running low on stock`,
          type: "LOW_STOCK",
          entity_id: null,
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: "Notifications sent",
        lowStockCount: actualLowStockItems.length,
        devicesNotified: deviceTokens.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in send-low-stock-notifications:", error);
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
