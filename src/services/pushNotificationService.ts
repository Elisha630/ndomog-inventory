import { Capacitor } from "@capacitor/core";
import {
  PushNotifications,
  Token,
  PushNotificationSchema,
  ActionPerformed,
} from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";

const PUSH_ENABLED_KEY = "ndomog_push_enabled";

export const getPushNotificationsEnabled = (): boolean => {
  try {
    return localStorage.getItem(PUSH_ENABLED_KEY) === "true";
  } catch {
    return false;
  }
};

export const setPushNotificationsEnabled = (enabled: boolean) => {
  try {
    localStorage.setItem(PUSH_ENABLED_KEY, enabled ? "true" : "false");
  } catch {
    // ignore
  }
};

let pushInitInFlight: Promise<boolean> | null = null;
let pushInitialized = false;

export const initializePushNotifications = async (): Promise<boolean> => {
  // Only initialize on native platforms
  if (!Capacitor.isNativePlatform()) {
    console.log("Push notifications not available on web");
    return false;
  }

  // App-level setting (prevents unwanted init/crash loops on misconfigured builds)
  if (!getPushNotificationsEnabled()) {
    console.log("Push notifications disabled in settings");
    return false;
  }

  // Idempotent init (avoid duplicate listeners/register calls)
  if (pushInitialized) return true;
  if (pushInitInFlight) return pushInitInFlight;

  pushInitInFlight = (async () => {
    try {
      // Ensure we don't accumulate listeners across re-auth/hot reloads
      await PushNotifications.removeAllListeners().catch(() => undefined);

      // Listeners first (recommended)
      PushNotifications.addListener("registration", (token: Token) => {
        console.log("Push registration success, token:", token.value);
        void saveDeviceToken(token.value);
      });

      PushNotifications.addListener("registrationError", (error) => {
        console.error("Push registration error:", error);
      });

      PushNotifications.addListener(
        "pushNotificationReceived",
        (notification: PushNotificationSchema) => {
          console.log("Push notification received in foreground:", notification);
        }
      );

      PushNotifications.addListener(
        "pushNotificationActionPerformed",
        (action: ActionPerformed) => {
          console.log("Push notification action performed:", action);
          const data = action.notification.data;
          if (data?.type === "LOW_STOCK" && data?.items) {
            console.log("Low stock notification tapped, items:", data.items);
          }
        }
      );

      // Permissions
      const currentStatus = await PushNotifications.checkPermissions();
      console.log("Current push notification permission status:", currentStatus);

      if (currentStatus.receive === "prompt") {
        const permissionStatus = await PushNotifications.requestPermissions();
        console.log("Push notification permission request result:", permissionStatus);
        if (permissionStatus.receive !== "granted") return false;
      } else if (currentStatus.receive !== "granted") {
        return false;
      }

      // Register for push notifications
      await PushNotifications.register();

      pushInitialized = true;
      return true;
    } catch (error) {
      console.error("Error initializing push notifications:", error);
      return false;
    } finally {
      pushInitInFlight = null;
    }
  })();

  return pushInitInFlight;
};

const saveDeviceToken = async (token: string) => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

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
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return;
    }

    // Remove all device tokens for this user
    await supabase.from("device_tokens").delete().eq("user_id", user.id);

    // Remove listeners + reset init so the user can re-enable later
    await PushNotifications.removeAllListeners();
    pushInitialized = false;
    pushInitInFlight = null;
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
