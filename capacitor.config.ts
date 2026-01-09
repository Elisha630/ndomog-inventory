import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ndomog.inventory',
  appName: 'ndomog',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_notification",
    },
    Camera: {
      permissionRequestText: "Ndomog needs camera access to scan barcodes and capture item photos"
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
