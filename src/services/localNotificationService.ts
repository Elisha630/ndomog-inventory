import { LocalNotifications, Channel, Schedule } from '@capacitor/local-notifications';

const CHANNEL_ID = 'ndomog_alerts_v2'; // Changed ID to force Android to refresh settings
const CHANNEL_NAME = 'Inventory Alerts';

let isInitialized = false;

export const initializeLocalNotifications = async (): Promise<boolean> => {
  if (isInitialized) return true;

  try {
    const permStatus = await LocalNotifications.requestPermissions();
    if (permStatus.display !== 'granted') return false;

    // Delete old channel if it exists (optional but cleaner)
    try { await LocalNotifications.deleteChannel({ id: 'ndomog_notifications' }); } catch (e) {}

    const channel: Channel = {
      id: CHANNEL_ID,
      name: CHANNEL_NAME,
      description: 'Critical inventory and activity alerts',
      importance: 5, // Max Importance = Status Bar + Sound
      sound: 'default',
      visibility: 1,
      vibration: true,
    };
    await LocalNotifications.createChannel(channel);

    isInitialized = true;
    return true;
  } catch (error) {
    console.error('Error initializing local notifications:', error);
    return false;
  }
};

export const showLocalNotification = async (title: string, body: string, extra?: any): Promise<void> => {
  if (!isInitialized) {
    const success = await initializeLocalNotifications();
    if (!success) return;
  }

  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Math.floor(Math.random() * 1000000), // Random ID to prevent overwriting
          channelId: CHANNEL_ID,
          extra,
          // Added these to ensure visibility
          schedule: { at: new Date(Date.now() + 100) }, // Schedule for "now"
        },
      ],
    });
    console.log('Native notification scheduled:', title);
  } catch (error) {
    console.error('Error showing native notification:', error);
  }
};
