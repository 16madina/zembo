// Check if running on native platform - only check when needed
export const isNative = typeof window !== 'undefined' && 
  (window as any).Capacitor?.isNativePlatform?.() === true;

export const isIOS = typeof window !== 'undefined' && 
  (window as any).Capacitor?.getPlatform?.() === 'ios';

export const isAndroid = typeof window !== 'undefined' && 
  (window as any).Capacitor?.getPlatform?.() === 'android';

// Lazy load Capacitor plugins only when needed
const getCapacitorPlugins = async () => {
  if (!isNative) return null;
  
  const [
    { StatusBar, Style },
    { Keyboard },
    { SplashScreen },
    { Haptics, ImpactStyle, NotificationType },
    { Camera, CameraResultType, CameraSource }
  ] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/keyboard'),
    import('@capacitor/splash-screen'),
    import('@capacitor/haptics'),
    import('@capacitor/camera')
  ]);
  
  return { StatusBar, Style, Keyboard, SplashScreen, Haptics, ImpactStyle, NotificationType, Camera, CameraResultType, CameraSource };
};

// Initialize Capacitor plugins - call this after React mounts
export const initializeCapacitor = async () => {
  if (!isNative) return;

  try {
    const plugins = await getCapacitorPlugins();
    if (!plugins) return;
    
    const { StatusBar, Style, Keyboard, SplashScreen } = plugins;

    // Hide splash screen
    await SplashScreen.hide();

    // Configure status bar
    await StatusBar.setStyle({ style: Style.Dark });
    
    if (isAndroid) {
      await StatusBar.setBackgroundColor({ color: '#0a0c14' });
    }

    // Setup keyboard listeners and configuration
    // Set keyboard accessory bar to show (iOS) and resize mode
    try {
      await Keyboard.setAccessoryBarVisible({ isVisible: true });
      await Keyboard.setScroll({ isDisabled: false });
    } catch (e) {
      // Some methods might not be available on all platforms
    }

    Keyboard.addListener('keyboardWillShow', (info: { keyboardHeight: number }) => {
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
  impact: async (style?: string) => {
    if (!isNative) return;
    try {
      const plugins = await getCapacitorPlugins();
      if (!plugins) return;
      // Use type assertion for dynamic import types
      await plugins.Haptics.impact({ style: (style || 'MEDIUM') as any });
    } catch (error) {
      console.error('Haptics error:', error);
    }
  },
  notification: async (type?: string) => {
    if (!isNative) return;
    try {
      const plugins = await getCapacitorPlugins();
      if (!plugins) return;
      await plugins.Haptics.notification({ type: (type || 'SUCCESS') as any });
    } catch (error) {
      console.error('Haptics error:', error);
    }
  },
  selection: async () => {
    if (!isNative) return;
    try {
      const plugins = await getCapacitorPlugins();
      if (!plugins) return;
      await plugins.Haptics.selectionStart();
      await plugins.Haptics.selectionEnd();
    } catch (error) {
      console.error('Haptics error:', error);
    }
  }
};

// Camera utilities
export const takePhoto = async () => {
  try {
    const plugins = await getCapacitorPlugins();
    if (!plugins) return null;
    
    const image = await plugins.Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: plugins.CameraResultType.DataUrl,
      source: plugins.CameraSource.Camera,
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
    const plugins = await getCapacitorPlugins();
    if (!plugins) return null;
    
    const image = await plugins.Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: plugins.CameraResultType.DataUrl,
      source: plugins.CameraSource.Photos
    });
    return image.dataUrl;
  } catch (error) {
    console.error('Gallery error:', error);
    return null;
  }
};

// Export constants for haptic styles
export const ImpactStyle = {
  Heavy: 'HEAVY',
  Medium: 'MEDIUM',
  Light: 'LIGHT'
} as const;

export const NotificationType = {
  Success: 'SUCCESS',
  Warning: 'WARNING',
  Error: 'ERROR'
} as const;
