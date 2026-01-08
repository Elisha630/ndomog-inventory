import { Capacitor } from "@capacitor/core";
import { LocalNotifications, Channel } from "@capacitor/local-notifications";

const CHANNEL_ID = "ndomog_notifications";

let initialized = false;

export const initializeLocalNotifications = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  if (initialized) return true;

  try {
    // Request permissions
    const permStatus = await LocalNotifications.checkPermissions();
    
    if (permStatus.display === "prompt") {
      const reqResult = await LocalNotifications.requestPermissions();
      if (reqResult.display !== "granted") {
        console.log("Local notification permissions not granted");
        return false;
      }
    } else if (permStatus.display !== "granted") {
      console.log("Local notification permissions denied");
      return false;
    }

    // Create notification channel for Android
    if (Capacitor.getPlatform() === "android") {
      const channel: Channel = {
        id: CHANNEL_ID,
        name: "Ndomog Notifications",
        description: "Inventory notifications",
        importance: 4, // HIGH
        visibility: 1, // PUBLIC
        sound: "notification", // References res/raw/notification.wav
        vibration: true,
        lights: true,
        lightColor: "#FF9800", // Orange accent color
      };
      
      await LocalNotifications.createChannel(channel);
    }

    // Listen for notification actions
    LocalNotifications.addListener("localNotificationActionPerformed", (notification) => {
      console.log("Local notification action performed:", notification);
    });

    initialized = true;
    return true;
  } catch (error) {
    console.error("Error initializing local notifications:", error);
    return false;
  }
};

export const showLocalNotification = async (
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<void> => {
  if (!Capacitor.isNativePlatform()) {
    console.log("Local notifications not available on web");
    return;
  }

  try {
    // Initialize if not already done
    if (!initialized) {
      const success = await initializeLocalNotifications();
      if (!success) {
        console.log("Could not initialize local notifications");
        return;
      }
    }

    const notificationId = Math.floor(Math.random() * 2147483647);

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notificationId,
          title: title,
          body: body,
          channelId: CHANNEL_ID,
          sound: "notification", // References res/raw/notification.wav
          smallIcon: "ic_stat_icon_config_sample",
          largeIcon: "ic_launcher",
          extra: data,
        },
      ],
    });

    console.log("Local notification scheduled:", { title, body });
  } catch (error) {
    console.error("Error showing local notification:", error);
  }
};
