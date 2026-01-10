import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

// Check if running on native platform
export const isNative = Capacitor.isNativePlatform();
export const isIOS = Capacitor.getPlatform() === 'ios';
export const isAndroid = Capacitor.getPlatform() === 'android';

// Initialize Capacitor plugins
export const initializeCapacitor = async () => {
  if (!isNative) return;

  try {
    // Hide splash screen
    await SplashScreen.hide();

    // Configure status bar
    await StatusBar.setStyle({ style: Style.Dark });
    
    if (isAndroid) {
      await StatusBar.setBackgroundColor({ color: '#0a0c14' });
    }

    // Setup keyboard listeners
    Keyboard.addListener('keyboardWillShow', (info) => {
      document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
      document.body.classList.add('keyboard-open');
    });

    Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.style.setProperty('--keyboard-height', '0px');
      document.body.classList.remove('keyboard-open');
    });

  } catch (error) {
    console.error('Error initializing Capacitor:', error);
  }
};

// Haptic feedback utilities
export const haptics = {
  impact: async (style: ImpactStyle = ImpactStyle.Medium) => {
    if (!isNative) return;
    try {
      await Haptics.impact({ style });
    } catch (error) {
      console.error('Haptics error:', error);
    }
  },
  notification: async (type: NotificationType = NotificationType.Success) => {
    if (!isNative) return;
    try {
      await Haptics.notification({ type });
    } catch (error) {
      console.error('Haptics error:', error);
    }
  },
  selection: async () => {
    if (!isNative) return;
    try {
      await Haptics.selectionStart();
      await Haptics.selectionEnd();
    } catch (error) {
      console.error('Haptics error:', error);
    }
  }
};

// Camera utilities
export const takePhoto = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      correctOrientation: true
    });
    return image.dataUrl;
  } catch (error) {
    console.error('Camera error:', error);
    return null;
  }
};

export const pickImage = async () => {
  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos
    });
    return image.dataUrl;
  } catch (error) {
    console.error('Gallery error:', error);
    return null;
  }
};

// Re-export types for convenience
export { ImpactStyle, NotificationType } from '@capacitor/haptics';
export { CameraResultType, CameraSource } from '@capacitor/camera';
