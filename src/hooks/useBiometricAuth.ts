import { useState, useEffect, useCallback } from 'react';
import { isNative, isAndroid, isIOS } from '@/lib/capacitor';

// BiometryType enum values from @capgo/capacitor-native-biometric
const BiometryType = {
  NONE: 0,
  TOUCH_ID: 1,        // iOS Touch ID
  FACE_ID: 2,         // iOS Face ID
  FINGERPRINT: 3,     // Android Fingerprint
  FACE_AUTHENTICATION: 4, // Android Face Unlock
  IRIS_AUTHENTICATION: 5, // Android Iris
  MULTIPLE: 6,        // Android Multiple biometrics available
} as const;

interface BiometricStatus {
  isAvailable: boolean;
  biometryType: 'faceId' | 'touchId' | 'fingerprint' | 'iris' | 'multiple' | 'none';
  isEnabled: boolean;
}

export const useBiometricAuth = () => {
  const [status, setStatus] = useState<BiometricStatus>({
    isAvailable: false,
    biometryType: 'none',
    isEnabled: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  const checkBiometricAvailability = useCallback(async () => {
    if (!isNative) {
      setStatus({
        isAvailable: false,
        biometryType: 'none',
        isEnabled: false,
      });
      setIsLoading(false);
      return;
    }

    try {
      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
      
      const result = await NativeBiometric.isAvailable();
      
      console.log('Biometric availability result:', result);
      
      let biometryType: BiometricStatus['biometryType'] = 'none';
      
      if (result.isAvailable) {
        // Map biometry types according to official documentation
        // https://github.com/nicholasgriffen/capacitor-native-biometric#biometrytype
        switch (result.biometryType) {
          case BiometryType.TOUCH_ID: // 1 - iOS Touch ID
            biometryType = 'touchId';
            break;
          case BiometryType.FACE_ID: // 2 - iOS Face ID
            biometryType = 'faceId';
            break;
          case BiometryType.FINGERPRINT: // 3 - Android Fingerprint
            biometryType = 'fingerprint';
            break;
          case BiometryType.FACE_AUTHENTICATION: // 4 - Android Face Unlock
            biometryType = 'faceId';
            break;
          case BiometryType.IRIS_AUTHENTICATION: // 5 - Android Iris
            biometryType = 'iris';
            break;
          case BiometryType.MULTIPLE: // 6 - Android Multiple biometrics
            biometryType = 'multiple';
            break;
          default:
            // Fallback based on platform
            biometryType = isAndroid ? 'fingerprint' : 'touchId';
        }
      }
      
      // Check if user has enabled biometric login
      const enabled = localStorage.getItem('zembo-biometric-enabled') === 'true';
      
      setStatus({
        isAvailable: result.isAvailable,
        biometryType,
        isEnabled: enabled,
      });
    } catch (error) {
      console.error('Biometric check error:', error);
      setStatus({
        isAvailable: false,
        biometryType: 'none',
        isEnabled: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkBiometricAvailability();
  }, [checkBiometricAvailability]);

  const authenticate = useCallback(async (reason?: string): Promise<boolean> => {
    if (!isNative || !status.isAvailable) {
      return false;
    }

    try {
      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
      
      // Customize messages based on platform and biometry type
      let subtitle = 'Utilisez la biométrie pour vous connecter';
      let description = 'Authentification requise';
      
      if (isIOS) {
        if (status.biometryType === 'faceId') {
          subtitle = 'Utilisez Face ID pour vous connecter';
          description = 'Regardez la caméra frontale';
        } else {
          subtitle = 'Utilisez Touch ID pour vous connecter';
          description = 'Placez votre doigt sur le capteur';
        }
      } else if (isAndroid) {
        if (status.biometryType === 'faceId') {
          subtitle = 'Utilisez la reconnaissance faciale pour vous connecter';
          description = 'Regardez la caméra frontale';
        } else if (status.biometryType === 'fingerprint' || status.biometryType === 'multiple') {
          subtitle = 'Utilisez votre empreinte digitale pour vous connecter';
          description = 'Placez votre doigt sur le capteur';
        } else if (status.biometryType === 'iris') {
          subtitle = "Utilisez la reconnaissance d'iris pour vous connecter";
          description = 'Regardez la caméra frontale';
        }
      }
      
      await NativeBiometric.verifyIdentity({
        reason: reason || 'Authentification requise',
        title: 'Zembo',
        subtitle,
        description,
        negativeButtonText: 'Annuler',
        maxAttempts: 3,
        // Android specific: use device credential as fallback
        useFallback: true,
      });
      
      // If verifyIdentity doesn't throw, authentication succeeded
      return true;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }, [status.isAvailable, status.biometryType]);

  const saveCredentials = useCallback(async (username: string, password: string): Promise<boolean> => {
    if (!isNative || !status.isAvailable) {
      return false;
    }

    try {
      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
      
      await NativeBiometric.setCredentials({
        username,
        password,
        server: 'com.zembo.app',
      });
      
      localStorage.setItem('zembo-biometric-enabled', 'true');
      localStorage.setItem('zembo-biometric-username', username);
      
      setStatus(prev => ({ ...prev, isEnabled: true }));
      
      return true;
    } catch (error) {
      console.error('Save credentials error:', error);
      return false;
    }
  }, [status.isAvailable]);

  const getCredentials = useCallback(async (): Promise<{ username: string; password: string } | null> => {
    if (!isNative || !status.isAvailable || !status.isEnabled) {
      return null;
    }

    try {
      // First verify identity
      const verified = await authenticate('Confirmez votre identité pour vous connecter');
      
      if (!verified) {
        return null;
      }

      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
      
      const credentials = await NativeBiometric.getCredentials({
        server: 'com.zembo.app',
      });
      
      return {
        username: credentials.username,
        password: credentials.password,
      };
    } catch (error) {
      console.error('Get credentials error:', error);
      return null;
    }
  }, [status.isAvailable, status.isEnabled, authenticate]);

  const deleteCredentials = useCallback(async (): Promise<boolean> => {
    if (!isNative) {
      return false;
    }

    try {
      const { NativeBiometric } = await import('@capgo/capacitor-native-biometric');
      
      await NativeBiometric.deleteCredentials({
        server: 'com.zembo.app',
      });
      
      localStorage.removeItem('zembo-biometric-enabled');
      localStorage.removeItem('zembo-biometric-username');
      
      setStatus(prev => ({ ...prev, isEnabled: false }));
      
      return true;
    } catch (error) {
      console.error('Delete credentials error:', error);
      return false;
    }
  }, []);

  const toggleBiometric = useCallback(async (enabled: boolean, username?: string, password?: string): Promise<boolean> => {
    if (enabled) {
      if (username && password) {
        return saveCredentials(username, password);
      }
      return false;
    } else {
      return deleteCredentials();
    }
  }, [saveCredentials, deleteCredentials]);

  const getBiometryLabel = useCallback((): string => {
    if (isIOS) {
      switch (status.biometryType) {
        case 'faceId':
          return 'Face ID';
        case 'touchId':
          return 'Touch ID';
        default:
          return 'Biométrie';
      }
    } else if (isAndroid) {
      switch (status.biometryType) {
        case 'faceId':
          return 'Reconnaissance faciale';
        case 'fingerprint':
          return 'Empreinte digitale';
        case 'iris':
          return 'Reconnaissance iris';
        case 'multiple':
          return 'Biométrie';
        default:
          return 'Biométrie';
      }
    }
    return 'Biométrie';
  }, [status.biometryType]);

  return {
    ...status,
    isLoading,
    authenticate,
    saveCredentials,
    getCredentials,
    deleteCredentials,
    toggleBiometric,
    getBiometryLabel,
    refresh: checkBiometricAvailability,
  };
};
