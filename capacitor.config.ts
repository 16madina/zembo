import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.6edefc5ef7d2465fb971263eccd91309',
  appName: 'Zembo',
  webDir: 'dist',
  server: {
    url: 'https://6edefc5e-f7d2-465f-b971-263eccd91309.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#0a0c14",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0c14"
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true
    },
    Camera: {
      presentationStyle: "fullscreen"
    }
  },
  ios: {
    contentInset: "always",
    preferredContentMode: "mobile",
    backgroundColor: "#0a0c14"
  },
  android: {
    backgroundColor: "#0a0c14",
    allowMixedContent: true
  }
};

export default config;
