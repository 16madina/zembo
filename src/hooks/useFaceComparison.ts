import { useState, useEffect, useRef, useCallback } from 'react';
import * as faceapi from 'face-api.js';

export interface FaceComparisonResult {
  isMatch: boolean;
  similarity: number;
  matchedPhotoIndex: number | null;
  isProcessing: boolean;
  error: string | null;
}

interface UseFaceComparisonOptions {
  photos: string[];
  enabled: boolean;
  threshold?: number; // Similarity threshold (0-1), default 0.5
}

const MODEL_URL_CANDIDATES = [
  "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/",
  "https://unpkg.com/@vladmandic/face-api/model/",
  "https://justadudewhohacks.github.io/face-api.js/models/",
] as const;

// Check if we're on mobile
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export const useFaceComparison = ({
  photos,
  enabled,
  threshold = 0.5,
}: UseFaceComparisonOptions) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const photoDescriptorsRef = useRef<Float32Array[]>([]);
  const modelsLoadedRef = useRef(false);
  const loadAttemptRef = useRef(0);

  // Load face-api.js models
  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;
    const isMobile = isMobileDevice();

    const loadModels = async () => {
      if (modelsLoadedRef.current) {
        setIsLoading(false);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        loadAttemptRef.current++;
        
        console.log(`[FaceComparison] Loading models, attempt ${loadAttemptRef.current}, mobile: ${isMobile}`);

        let lastErr: unknown = null;

        for (const baseUrl of MODEL_URL_CANDIDATES) {
          try {
            console.log(`[FaceComparison] Trying models from: ${baseUrl}`);

            // Load required models for face detection and recognition
            // Use a timeout to prevent hanging
            const loadPromise = Promise.all([
              faceapi.nets.ssdMobilenetv1.loadFromUri(baseUrl),
              faceapi.nets.faceLandmark68Net.loadFromUri(baseUrl),
              faceapi.nets.faceRecognitionNet.loadFromUri(baseUrl),
            ]);

            // Add timeout for mobile devices
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('Model loading timeout')), 30000);
            });

            await Promise.race([loadPromise, timeoutPromise]);

            if (!isMounted) return;

            modelsLoadedRef.current = true;
            setIsModelsLoaded(true);
            console.log('[FaceComparison] Models loaded successfully');
            return;
          } catch (err) {
            lastErr = err;
            console.warn('[FaceComparison] Model source failed:', baseUrl, err);
          }
        }

        throw lastErr ?? new Error('Model loading failed');
      } catch (err: any) {
        console.error('[FaceComparison] Error loading models:', err);
        if (isMounted) {
          setError(`Erreur de chargement: ${err?.message || 'Erreur inconnue'}`);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadModels();

    return () => {
      isMounted = false;
    };
  }, [enabled]);

  // Extract face descriptors from uploaded photos
  useEffect(() => {
    if (!isModelsLoaded || !enabled || photos.length === 0) return;

    let isMounted = true;

    const extractPhotoDescriptors = async () => {
      try {
        console.log(`[FaceComparison] Extracting descriptors from ${photos.length} photos`);
        const descriptors: Float32Array[] = [];

        for (const photoUrl of photos) {
          try {
            // Create image element instead of using fetchImage for better mobile support
            const img = await new Promise<HTMLImageElement>((resolve, reject) => {
              const imgEl = new Image();
              imgEl.crossOrigin = 'anonymous';
              imgEl.onload = () => resolve(imgEl);
              imgEl.onerror = () => reject(new Error('Failed to load image'));
              
              // Handle base64 and URL images
              if (photoUrl.startsWith('data:')) {
                imgEl.src = photoUrl;
              } else {
                imgEl.src = photoUrl;
              }
              
              // Timeout for image loading
              setTimeout(() => reject(new Error('Image load timeout')), 10000);
            });

            const detection = await faceapi
              .detectSingleFace(img)
              .withFaceLandmarks()
              .withFaceDescriptor();

            if (detection) {
              descriptors.push(detection.descriptor);
              console.log('[FaceComparison] Descriptor extracted from photo');
            } else {
              console.warn('[FaceComparison] No face detected in photo');
            }
          } catch (photoErr) {
            console.error('[FaceComparison] Error processing photo:', photoErr);
          }
        }

        if (isMounted) {
          photoDescriptorsRef.current = descriptors;
          console.log(`[FaceComparison] Extracted ${descriptors.length} descriptors from ${photos.length} photos`);
        }
      } catch (err) {
        console.error('[FaceComparison] Error extracting descriptors:', err);
      }
    };

    extractPhotoDescriptors();

    return () => {
      isMounted = false;
    };
  }, [isModelsLoaded, photos, enabled]);

  // Compare a video frame with stored photo descriptors
  const compareFace = useCallback(
    async (videoElement: HTMLVideoElement): Promise<FaceComparisonResult> => {
      if (!isModelsLoaded) {
        console.warn('[FaceComparison] Models not loaded');
        return {
          isMatch: false,
          similarity: 0,
          matchedPhotoIndex: null,
          isProcessing: false,
          error: 'Modèles non chargés',
        };
      }

      if (photoDescriptorsRef.current.length === 0) {
        console.warn('[FaceComparison] No photo descriptors available');
        return {
          isMatch: false,
          similarity: 0,
          matchedPhotoIndex: null,
          isProcessing: false,
          error: 'Aucun visage détecté dans vos photos',
        };
      }

      try {
        console.log('[FaceComparison] Detecting face in video frame...');
        
        // Detect face in video frame
        const detection = await faceapi
          .detectSingleFace(videoElement)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) {
          console.log('[FaceComparison] No face detected in video');
          return {
            isMatch: false,
            similarity: 0,
            matchedPhotoIndex: null,
            isProcessing: false,
            error: null,
          };
        }

        console.log('[FaceComparison] Face detected, comparing with photo descriptors...');

        // Compare with stored descriptors
        const videoDescriptor = detection.descriptor;
        let bestMatch = { index: -1, distance: Infinity };

        for (let i = 0; i < photoDescriptorsRef.current.length; i++) {
          const distance = faceapi.euclideanDistance(
            videoDescriptor,
            photoDescriptorsRef.current[i]
          );
          console.log(`[FaceComparison] Distance to photo ${i}: ${distance.toFixed(3)}`);
          if (distance < bestMatch.distance) {
            bestMatch = { index: i, distance };
          }
        }

        // Convert distance to similarity (0-1 scale, higher is better)
        // Distance of 0 = perfect match, distance of ~1.0 = very different
        const similarity = Math.max(0, 1 - bestMatch.distance);
        const isMatch = similarity >= threshold;

        console.log(`[FaceComparison] Best match: photo ${bestMatch.index}, similarity: ${(similarity * 100).toFixed(1)}%, threshold: ${(threshold * 100).toFixed(1)}%, match: ${isMatch}`);

        return {
          isMatch,
          similarity,
          matchedPhotoIndex: isMatch ? bestMatch.index : null,
          isProcessing: false,
          error: null,
        };
      } catch (err: any) {
        console.error('[FaceComparison] Error comparing faces:', err);
        return {
          isMatch: false,
          similarity: 0,
          matchedPhotoIndex: null,
          isProcessing: false,
          error: `Erreur de comparaison: ${err?.message || 'Erreur inconnue'}`,
        };
      }
    },
    [isModelsLoaded, threshold]
  );

  return {
    isLoading,
    isModelsLoaded,
    error,
    compareFace,
    hasPhotoDescriptors: photoDescriptorsRef.current.length > 0,
  };
};
