import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.69e93f6c0ce44137ba6d59537782c3c8',
  appName: 'ndomog',
  webDir: 'dist',
  server: {
    url: 'https://69e93f6c-0ce4-4137-ba6d-59537782c3c8.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
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
