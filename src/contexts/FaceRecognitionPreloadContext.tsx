import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import * as faceapi from 'face-api.js';

interface FaceRecognitionPreloadContextType {
  isModelsLoaded: boolean;
  isModelsLoading: boolean;
  modelsError: string | null;
  photoDescriptors: Float32Array[];
  isExtractingDescriptors: boolean;
  extractDescriptors: (photos: string[]) => Promise<void>;
  hasDescriptors: boolean;
}

const FaceRecognitionPreloadContext = createContext<FaceRecognitionPreloadContextType | null>(null);

const MODELS_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

// Check if we're on Android
const isAndroidDevice = () => {
  return /Android/i.test(navigator.userAgent);
};

export const FaceRecognitionPreloadProvider = ({ children }: { children: ReactNode }) => {
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [photoDescriptors, setPhotoDescriptors] = useState<Float32Array[]>([]);
  const [isExtractingDescriptors, setIsExtractingDescriptors] = useState(false);

  const modelsLoadedRef = useRef(false);
  const extractionInProgressRef = useRef(false);

  // Load models on mount
  useEffect(() => {
    if (modelsLoadedRef.current || isModelsLoading) return;

    let isMounted = true;
    const isAndroid = isAndroidDevice();

    const loadModels = async () => {
      setIsModelsLoading(true);
      setModelsError(null);

      try {
        console.log(`[FacePreload] Starting model loading... (Android: ${isAndroid})`);

        // For Android, configure TensorFlow.js to use CPU backend for stability
        if (isAndroid) {
          try {
            // @ts-ignore - TensorFlow.js may not have types
            const tf = await import('@tensorflow/tfjs-core');
            // Try to use CPU backend on Android for stability
            await tf.setBackend('cpu');
            await tf.ready();
            console.log('[FacePreload] TensorFlow.js CPU backend ready for Android');
          } catch (tfErr) {
            console.log('[FacePreload] TensorFlow.js backend setup skipped:', tfErr);
          }
        }

        // Load models with retry logic for Android
        const loadWithRetry = async (attempt: number = 1): Promise<void> => {
          try {
            console.log(`[FacePreload] Load attempt ${attempt}`);
            
            // Load models one by one on Android for better stability
            if (isAndroid) {
              console.log('[FacePreload] Loading ssdMobilenetv1...');
              await faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL);
              
              if (!isMounted) return;
              console.log('[FacePreload] Loading faceLandmark68Net...');
              await faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL);
              
              if (!isMounted) return;
              console.log('[FacePreload] Loading faceRecognitionNet...');
              await faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL);
            } else {
              // On iOS/desktop, load in parallel
              await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
              ]);
            }
          } catch (err) {
            if (attempt < 3 && isMounted) {
              console.log(`[FacePreload] Attempt ${attempt} failed, retrying...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              return loadWithRetry(attempt + 1);
            }
            throw err;
          }
        };

        // Extended timeout for Android
        const timeoutMs = isAndroid ? 60000 : 30000;
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Model loading timeout (${timeoutMs / 1000}s)`)), timeoutMs);
        });

        await Promise.race([loadWithRetry(), timeoutPromise]);

        if (!isMounted) return;

        modelsLoadedRef.current = true;
        setIsModelsLoaded(true);
        console.log('[FacePreload] Models loaded successfully');
      } catch (err: any) {
        console.error('[FacePreload] Error loading models:', err);
        if (isMounted) {
          setModelsError(err?.message || 'Erreur de chargement des modèles');
        }
      } finally {
        if (isMounted) {
          setIsModelsLoading(false);
        }
      }
    };

    loadModels();

    return () => {
      isMounted = false;
    };
  }, [isModelsLoading]);

  // Extract descriptors from photos
  const extractDescriptors = useCallback(async (photos: string[]) => {
    if (!isModelsLoaded || extractionInProgressRef.current || photos.length === 0) {
      return;
    }

    extractionInProgressRef.current = true;
    setIsExtractingDescriptors(true);

    try {
      console.log(`[FacePreload] Extracting descriptors from ${photos.length} photos`);
      const descriptors: Float32Array[] = [];

      for (const photoUrl of photos) {
        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const imgEl = new Image();
            imgEl.crossOrigin = 'anonymous';
            imgEl.onload = () => resolve(imgEl);
            imgEl.onerror = () => reject(new Error('Failed to load image'));
            imgEl.src = photoUrl;

            setTimeout(() => reject(new Error('Image load timeout')), 10000);
          });

          const detection = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            descriptors.push(detection.descriptor);
            console.log('[FacePreload] Descriptor extracted from photo');
          } else {
            console.warn('[FacePreload] No face detected in photo');
          }
        } catch (photoErr) {
          console.error('[FacePreload] Error processing photo:', photoErr);
        }
      }

      setPhotoDescriptors(descriptors);
      console.log(`[FacePreload] Extracted ${descriptors.length} descriptors from ${photos.length} photos`);
    } catch (err) {
      console.error('[FacePreload] Error extracting descriptors:', err);
    } finally {
      setIsExtractingDescriptors(false);
      extractionInProgressRef.current = false;
    }
  }, [isModelsLoaded]);

  return (
    <FaceRecognitionPreloadContext.Provider
      value={{
        isModelsLoaded,
        isModelsLoading,
        modelsError,
        photoDescriptors,
        isExtractingDescriptors,
        extractDescriptors,
        hasDescriptors: photoDescriptors.length > 0,
      }}
    >
      {children}
    </FaceRecognitionPreloadContext.Provider>
  );
};

export const useFaceRecognitionPreload = () => {
  const context = useContext(FaceRecognitionPreloadContext);
  if (!context) {
    throw new Error('useFaceRecognitionPreload must be used within FaceRecognitionPreloadProvider');
  }
  return context;
};
