import { useState, useEffect, useCallback } from 'react';
import { isNative } from '@/lib/capacitor';

interface BiometricStatus {
  isAvailable: boolean;
  biometryType: 'faceId' | 'touchId' | 'fingerprint' | 'iris' | 'none';
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
      
      let biometryType: BiometricStatus['biometryType'] = 'none';
      
      if (result.isAvailable) {
        // Map biometry types
        switch (result.biometryType) {
          case 1: // FACE_AUTHENTICATION (Android) or Face ID (iOS)
            biometryType = 'faceId';
            break;
          case 2: // FINGERPRINT (Android) or Touch ID (iOS)
            biometryType = 'touchId';
            break;
          case 3: // IRIS
            biometryType = 'iris';
            break;
          case 4: // MULTIPLE (Android)
            biometryType = 'fingerprint';
            break;
          default:
            biometryType = 'fingerprint';
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
      
      await NativeBiometric.verifyIdentity({
        reason: reason || 'Authentification requise',
        title: 'Zembo',
        subtitle: 'Utilisez Face ID ou Touch ID pour vous connecter',
        description: 'Placez votre doigt sur le capteur ou regardez la caméra',
        negativeButtonText: 'Annuler',
        maxAttempts: 3,
      });
      
      // If verifyIdentity doesn't throw, authentication succeeded
      return true;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  }, [status.isAvailable]);

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
    switch (status.biometryType) {
      case 'faceId':
        return 'Face ID';
      case 'touchId':
        return 'Touch ID';
      case 'fingerprint':
        return 'Empreinte digitale';
      case 'iris':
        return 'Iris';
      default:
        return 'Biométrie';
    }
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
