import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ndomog.inventory',
  appName: 'ndomog',
  webDir: 'dist',
  plugins: {
    Camera: {
      permissionRequestText: "Ndomog needs camera access to scan barcodes and capture item photos"
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    }
  }
};

export default config;
