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

// Test function to manually trigger a notification (useful for debugging)
export const testLocalNotification = async (): Promise<void> => {
  console.log('Testing local notification...');
  await showLocalNotification(
    'Test Notification',
    'This is a test notification to verify Android notification bar display',
    { type: 'test' }
  );
};

export const showLocalNotification = async (title: string, body: string, extra?: any): Promise<void> => {
  if (!isInitialized) {
    const success = await initializeLocalNotifications();
    if (!success) {
      console.warn('Local notifications not initialized, cannot show notification');
      return;
    }
  }

  try {
    const notificationId = Math.floor(Math.random() * 2147483647);
    const notification = {
      title,
      body,
      id: notificationId,
      channelId: CHANNEL_ID,
      extra,
      schedule: { at: new Date(Date.now() + 1000) }, // 1 second delay for reliability
      actionTypeId: '',
      attachments: [],
      smallIcon: 'ic_stat_icon_config_sample', // Match capacitor.config.ts
      sound: 'default', // Explicitly enable sound
      // Ensure notification shows in status bar
      ongoing: false,
      autoCancel: true,
    };

    console.log('Scheduling local notification:', { id: notificationId, title, channel: CHANNEL_ID });
    await LocalNotifications.schedule({ notifications: [notification] });
    console.log('Local notification scheduled successfully');
  } catch (error) {
    console.error('Failed to schedule local notification:', error);
  }
};
