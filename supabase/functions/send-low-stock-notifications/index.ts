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
  name: string;
  quantity: number;
  low_stock_threshold: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all items that are below their low stock threshold
    const { data: lowStockItems, error: itemsError } = await supabase
      .from("items")
      .select("name, quantity, low_stock_threshold");

    if (itemsError) {
      console.error("Error fetching items:", itemsError);
      throw itemsError;
    }

    // Filter items that are actually low stock
    const actualLowStockItems: LowStockItem[] = (lowStockItems || []).filter(
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

    // Send FCM notifications if server key is configured
    if (fcmServerKey) {
      const androidTokens = (deviceTokens as DeviceToken[])
        .filter((dt) => dt.platform === "android")
        .map((dt) => dt.token);

      if (androidTokens.length > 0) {
        try {
          const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `key=${fcmServerKey}`,
            },
            body: JSON.stringify({
              registration_ids: androidTokens,
              notification: {
                title: notificationTitle,
                body: notificationBody,
                icon: "ic_notification",
                sound: "default",
              },
              data: {
                type: "low_stock",
                items: JSON.stringify(actualLowStockItems),
              },
            }),
          });

          const fcmResult = await fcmResponse.json();
          console.log("FCM response:", fcmResult);
        } catch (fcmError) {
          console.error("FCM error:", fcmError);
        }
      }
    } else {
      console.log("FCM_SERVER_KEY not configured, skipping push notifications");
    }

    // Also create in-app notifications for all users
    const uniqueUserIds = [...new Set((deviceTokens as DeviceToken[]).map((dt) => dt.user_id))];
    
    for (const userId of uniqueUserIds) {
      await supabase.from("notifications").insert({
        user_id: userId,
        action: "low_stock_alert",
        item_name: itemNames + moreCount,
        action_user_email: "System",
        details: `${actualLowStockItems.length} item(s) are running low on stock`,
      });
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
