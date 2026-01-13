import { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import * as faceapi from 'face-api.js';

interface FaceRecognitionPreloadContextType {
  isModelsLoaded: boolean;
  isModelsLoading: boolean;
  modelsError: string | null;
  photoDescriptors: Float32Array[];
  flippedDescriptors: Float32Array[]; // Horizontally flipped descriptors for mirror handling
  isExtractingDescriptors: boolean;
  extractDescriptors: (photos: string[]) => Promise<void>;
  hasDescriptors: boolean;
}

const FaceRecognitionPreloadContext = createContext<FaceRecognitionPreloadContextType | null>(null);

const MODEL_URL_CANDIDATES = [
  "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/",
  "https://unpkg.com/@vladmandic/face-api/model/",
  // Fallback (older, sometimes flaky on Android WebView)
  "https://justadudewhohacks.github.io/face-api.js/models/",
] as const;

// Detection options with lower confidence for better mobile detection
const DETECTION_OPTIONS = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 });

// Helper to flip an image horizontally
const flipImageHorizontally = (img: HTMLImageElement): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0);
  return canvas;
};

export const FaceRecognitionPreloadProvider = ({ children }: { children: ReactNode }) => {
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [isModelsLoading, setIsModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [photoDescriptors, setPhotoDescriptors] = useState<Float32Array[]>([]);
  const [flippedDescriptors, setFlippedDescriptors] = useState<Float32Array[]>([]);
  const [isExtractingDescriptors, setIsExtractingDescriptors] = useState(false);

  const modelsLoadedRef = useRef(false);
  const extractionInProgressRef = useRef(false);

  // Load models on mount
  useEffect(() => {
    if (modelsLoadedRef.current) return;

    let isMounted = true;

    const loadModels = async () => {
      setIsModelsLoading(true);
      setModelsError(null);

      try {
        console.log("[FacePreload] Starting model loading...");

        let lastErr: unknown = null;

        for (const baseUrl of MODEL_URL_CANDIDATES) {
          try {
            console.log(`[FacePreload] Trying models from: ${baseUrl}`);

            const loadPromise = Promise.all([
              faceapi.nets.ssdMobilenetv1.loadFromUri(baseUrl),
              faceapi.nets.faceLandmark68Net.loadFromUri(baseUrl),
              faceapi.nets.faceRecognitionNet.loadFromUri(baseUrl),
            ]);

            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error("Model loading timeout (30s)")), 30000);
            });

            await Promise.race([loadPromise, timeoutPromise]);

            if (!isMounted) return;

            modelsLoadedRef.current = true;
            setIsModelsLoaded(true);
            console.log("[FacePreload] Models loaded successfully");
            return;
          } catch (err) {
            lastErr = err;
            console.warn("[FacePreload] Model source failed:", baseUrl, err);
          }
        }

        throw lastErr ?? new Error("Impossible de charger les modèles");
      } catch (err: any) {
        console.error("[FacePreload] Error loading models:", err);
        if (isMounted) {
          setModelsError(err?.message || "Erreur de chargement des modèles");
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
  }, []);

  // Extract descriptors from photos (+ flipped versions for mirror handling)
  const extractDescriptors = useCallback(async (photos: string[]) => {
    if (!isModelsLoaded || extractionInProgressRef.current || photos.length === 0) {
      return;
    }

    extractionInProgressRef.current = true;
    setIsExtractingDescriptors(true);

    try {
      console.log(`[FacePreload] Extracting descriptors from ${photos.length} photos`);
      const descriptors: Float32Array[] = [];
      const flipped: Float32Array[] = [];

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

          // Try with explicit detection options for better mobile compatibility
          let detection = await faceapi
            .detectSingleFace(img, DETECTION_OPTIONS)
            .withFaceLandmarks()
            .withFaceDescriptor();

          // Fallback: try without options if first attempt fails
          if (!detection) {
            console.log('[FacePreload] Retrying with default options...');
            detection = await faceapi
              .detectSingleFace(img)
              .withFaceLandmarks()
              .withFaceDescriptor();
          }

          // Fallback: try detectAllFaces and pick largest
          if (!detection) {
            console.log('[FacePreload] Trying detectAllFaces...');
            const allDetections = await faceapi
              .detectAllFaces(img, DETECTION_OPTIONS)
              .withFaceLandmarks()
              .withFaceDescriptors();
            
            if (allDetections.length > 0) {
              // Pick the largest face (by bounding box area)
              detection = allDetections.reduce((best, curr) => {
                const bestArea = best.detection.box.width * best.detection.box.height;
                const currArea = curr.detection.box.width * curr.detection.box.height;
                return currArea > bestArea ? curr : best;
              });
            }
          }

          if (detection) {
            descriptors.push(detection.descriptor);
            console.log('[FacePreload] Descriptor extracted from photo');

            // Also extract flipped descriptor for mirror handling
            try {
              const flippedCanvas = flipImageHorizontally(img);
              const flippedDetection = await faceapi
                .detectSingleFace(flippedCanvas, DETECTION_OPTIONS)
                .withFaceLandmarks()
                .withFaceDescriptor();
              
              if (flippedDetection) {
                flipped.push(flippedDetection.descriptor);
                console.log('[FacePreload] Flipped descriptor extracted');
              } else {
                // Use same descriptor as fallback
                flipped.push(detection.descriptor);
              }
            } catch (flipErr) {
              console.warn('[FacePreload] Flipped extraction failed, using original:', flipErr);
              flipped.push(detection.descriptor);
            }
          } else {
            console.warn('[FacePreload] No face detected in photo');
          }
        } catch (photoErr) {
          console.error('[FacePreload] Error processing photo:', photoErr);
        }
      }

      setPhotoDescriptors(descriptors);
      setFlippedDescriptors(flipped);
      console.log(`[FacePreload] Extracted ${descriptors.length} descriptors (+ ${flipped.length} flipped) from ${photos.length} photos`);
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
        flippedDescriptors,
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
