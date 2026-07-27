import type { CapacitorConfig } from '@capacitor/cli';



// Live web shell (like KiDi+): UI/JS updates without a new Play build.
// Local hot-reload: set NATIVE_APP_URL=http://YOUR_LAN_IP:5173 before cap sync.
const nativeAppUrl = process.env.NATIVE_APP_URL || "https://zemboapp.com";

const config: CapacitorConfig = {
  appId: 'com.zembo.app',
  appName: 'Zembo',
  webDir: 'dist',
  server: {
    url: nativeAppUrl,
    cleartext: nativeAppUrl.startsWith("http://"),
    androidScheme: "https",
    allowNavigation: [
      "zemboapp.com",
      "www.zemboapp.com",
      "zembo.app",
      "www.zembo.app",
      "zembo.lovable.app",
      "*.lovable.app",
      "*.lovableproject.com",
      "*.stripe.com",
      "*.livekit.cloud",
    ],
  },


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
    backgroundColor: "#0a0c14"
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
