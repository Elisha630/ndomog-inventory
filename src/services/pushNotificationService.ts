import { Capacitor } from "@capacitor/core";
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

export const initializePushNotifications = async () => {
  // Only initialize on native platforms
  if (!Capacitor.isNativePlatform()) {
    console.log("Push notifications not available on web");
    return false;
  }

  try {
    // Check current permission status first
    const currentStatus = await PushNotifications.checkPermissions();
    console.log("Current push notification permission status:", currentStatus);
    
    let permissionGranted = currentStatus.receive === "granted";
    
    // If not granted, request permission (required for Android 13+ / API 33+)
    if (!permissionGranted) {
      const permissionStatus = await PushNotifications.requestPermissions();
      console.log("Push notification permission request result:", permissionStatus);
      
      if (permissionStatus.receive !== "granted") {
        console.log("Push notification permission denied");
        return false;
      }
      permissionGranted = true;
    }

    // Register for push notifications
    await PushNotifications.register();

    // Listen for registration success
    PushNotifications.addListener("registration", async (token: Token) => {
      console.log("Push registration success, token:", token.value);
      await saveDeviceToken(token.value);
    });

    // Listen for registration errors
    PushNotifications.addListener("registrationError", (error) => {
      console.error("Push registration error:", error);
    });

    // Listen for incoming notifications when app is in foreground
    PushNotifications.addListener("pushNotificationReceived", (notification: PushNotificationSchema) => {
      console.log("Push notification received in foreground:", notification);
      // The notification will still appear in the system tray
    });

    // Listen for notification actions (when user taps notification)
    PushNotifications.addListener("pushNotificationActionPerformed", (action: ActionPerformed) => {
      console.log("Push notification action performed:", action);
      // Handle deep linking based on notification data
      const data = action.notification.data;
      if (data?.type === "LOW_STOCK" && data?.items) {
        // Navigate to low stock items or show alert
        console.log("Low stock notification tapped, items:", data.items);
      }
    });

    return true;
  } catch (error) {
    console.error("Error initializing push notifications:", error);
    return false;
  }
};

const saveDeviceToken = async (token: string) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log("No user logged in, cannot save device token");
      return;
    }

    const platform = Capacitor.getPlatform();

    // Upsert the device token
    const { error } = await supabase
      .from("device_tokens")
      .upsert(
        {
          user_id: user.id,
          token: token,
          platform: platform,
        },
        {
          onConflict: "user_id,token",
        }
      );

    if (error) {
      console.error("Error saving device token:", error);
    } else {
      console.log("Device token saved successfully");
    }
  } catch (error) {
    console.error("Error saving device token:", error);
  }
};

export const removeDeviceToken = async () => {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return;
    }

    // Remove all device tokens for this user
    await supabase
      .from("device_tokens")
      .delete()
      .eq("user_id", user.id);

    // Unregister from push notifications
    await PushNotifications.removeAllListeners();
  } catch (error) {
    console.error("Error removing device token:", error);
  }
};

export const checkLowStockAndNotify = async () => {
  try {
    // This function can be called to trigger a check for low stock items
    // The actual notification sending happens in the edge function
    const { error } = await supabase.functions.invoke("send-low-stock-notifications");
    
    if (error) {
      console.error("Error checking low stock:", error);
    }
  } catch (error) {
    console.error("Error checking low stock:", error);
  }
};
