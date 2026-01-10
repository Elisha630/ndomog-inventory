import { LocalNotifications, Channel, Schedule } from '@capacitor/local-notifications';

const CHANNEL_ID = 'ndomog_alerts_v3'; // Incremented to force a fresh channel creation
const CHANNEL_NAME = 'Inventory Notifications';

let isInitialized = false;

export const initializeLocalNotifications = async (): Promise<boolean> => {
  if (isInitialized) return true;

  try {
    const permStatus = await LocalNotifications.requestPermissions();
    if (permStatus.display !== 'granted') {
      console.warn('Notification permissions denied by user');
      return false;
    }

    // Attempt to create a high-priority channel
    const channel: Channel = {
      id: CHANNEL_ID,
      name: CHANNEL_NAME,
      description: 'Urgent inventory and restock alerts',
      importance: 5, // High importance for status bar visibility
      sound: 'default',
      visibility: 1, // Public
      vibration: true,
    };
    
    await LocalNotifications.createChannel(channel);
    isInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to initialize native notifications:', error);
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
          id: Math.floor(Math.random() * 2147483647), // Larger random ID range
          channelId: CHANNEL_ID,
          extra,
          // Removed smallIcon string to let Capacitor use the default from config
          // This prevents failure if the string doesn't match the resource name exactly
          schedule: { at: new Date(Date.now() + 500) }, // Slight delay to ensure bridge is ready
          actionTypeId: '',
          attachments: [],
        },
      ],
    });
    console.log('Native notification command sent to bridge:', title);
  } catch (error) {
    console.error('Bridge failed to show notification:', error);
  }
};
