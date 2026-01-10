import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ndomog.app',
  appName: 'ndomog',
  webDir: 'dist',
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      presentationOptions: ["badge", "sound", "alert"],
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Camera: {
      permissionRequestText: "Ndomog needs camera access to scan barcodes and capture item photos"
    }
  }
};

export default config;
