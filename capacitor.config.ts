import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.zembo.app',
  appName: 'Zembo',
  webDir: 'dist',
  // Pour le développement avec hot-reload, décommentez le bloc server ci-dessous
  // server: {
  //   url: 'https://6edefc5e-f7d2-465f-b971-263eccd91309.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: "#0a0c14",
      showSpinner: false,
      splashFullScreen: false,
      splashImmersive: false
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#0a0c14"
    },
    Keyboard: {
      resize: "none",
      resizeOnFullScreen: false
    },
    Camera: {
      presentationStyle: "fullscreen"
    }
  },
  ios: {
    contentInset: "always",
    preferredContentMode: "mobile",
    backgroundColor: "#0a0c14",
    allowsLinkPreview: true,
    scrollEnabled: true
  },
  android: {
    backgroundColor: "#0a0c14",
    allowMixedContent: true,
    webContentsDebuggingEnabled: true,
    // Enable camera and microphone in WebView
    appendUserAgent: "ZemboApp",
    // Request WebView camera/microphone capture
    captureInput: true
  }
};

export default config;
