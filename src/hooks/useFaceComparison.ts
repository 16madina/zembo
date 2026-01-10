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

const MODELS_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

export const useFaceComparison = ({
  photos,
  enabled,
  threshold = 0.5,
}: UseFaceComparisonOptions) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const photoDescriptorsRef = useRef<Float32Array[]>([]);

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      if (!enabled) return;
      
      try {
        setIsLoading(true);
        setError(null);

        // Load required models for face detection and recognition
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODELS_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
        ]);

        setIsModelsLoaded(true);
        console.log('Face-api.js models loaded successfully');
      } catch (err) {
        console.error('Error loading face-api models:', err);
        setError('Erreur de chargement des modèles de reconnaissance faciale');
      } finally {
        setIsLoading(false);
      }
    };

    loadModels();
  }, [enabled]);

  // Extract face descriptors from uploaded photos
  useEffect(() => {
    const extractPhotoDescriptors = async () => {
      if (!isModelsLoaded || !enabled || photos.length === 0) return;

      try {
        const descriptors: Float32Array[] = [];

        for (const photoUrl of photos) {
          const img = await faceapi.fetchImage(photoUrl);
          const detection = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            descriptors.push(detection.descriptor);
            console.log('Face descriptor extracted from photo');
          }
        }

        photoDescriptorsRef.current = descriptors;
        console.log(`Extracted ${descriptors.length} face descriptors from ${photos.length} photos`);
      } catch (err) {
        console.error('Error extracting face descriptors:', err);
      }
    };

    extractPhotoDescriptors();
  }, [isModelsLoaded, photos, enabled]);

  // Compare a video frame with stored photo descriptors
  const compareFace = useCallback(
    async (videoElement: HTMLVideoElement): Promise<FaceComparisonResult> => {
      if (!isModelsLoaded || photoDescriptorsRef.current.length === 0) {
        return {
          isMatch: false,
          similarity: 0,
          matchedPhotoIndex: null,
          isProcessing: false,
          error: 'Modèles ou photos non chargés',
        };
      }

      try {
        // Detect face in video frame
        const detection = await faceapi
          .detectSingleFace(videoElement)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) {
          return {
            isMatch: false,
            similarity: 0,
            matchedPhotoIndex: null,
            isProcessing: false,
            error: null,
          };
        }

        // Compare with stored descriptors
        const videoDescriptor = detection.descriptor;
        let bestMatch = { index: -1, distance: Infinity };

        for (let i = 0; i < photoDescriptorsRef.current.length; i++) {
          const distance = faceapi.euclideanDistance(
            videoDescriptor,
            photoDescriptorsRef.current[i]
          );
          if (distance < bestMatch.distance) {
            bestMatch = { index: i, distance };
          }
        }

        // Convert distance to similarity (0-1 scale, higher is better)
        // Distance of 0 = perfect match, distance of ~1.0 = very different
        const similarity = Math.max(0, 1 - bestMatch.distance);
        const isMatch = similarity >= threshold;

        return {
          isMatch,
          similarity,
          matchedPhotoIndex: isMatch ? bestMatch.index : null,
          isProcessing: false,
          error: null,
        };
      } catch (err) {
        console.error('Error comparing faces:', err);
        return {
          isMatch: false,
          similarity: 0,
          matchedPhotoIndex: null,
          isProcessing: false,
          error: 'Erreur de comparaison',
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
