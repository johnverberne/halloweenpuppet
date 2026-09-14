import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision';
import type { BlendShapeScore, FacePayload, GlassesPayload } from '@halloweenpuppet/shared';
import { GlassesDetector } from './GlassesDetector';
import { averageVisibility, MEDIAPIPE_WASM_URL, toLandmarks } from './landmarks';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';

export interface FaceDetectResult {
  face: FacePayload;
  blendShapes: BlendShapeScore[];
  glasses: GlassesPayload;
}

export class FaceTracker {
  private landmarker: FaceLandmarker | null = null;
  private readonly glasses = new GlassesDetector();

  async init(): Promise<void> {
    if (this.landmarker) {
      return;
    }
    const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
    const options = {
      runningMode: 'VIDEO' as const,
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
      minFaceDetectionConfidence: 0.4,
      minFacePresenceConfidence: 0.4,
      minTrackingConfidence: 0.4,
    };
    try {
      this.landmarker = await FaceLandmarker.createFromOptions(fileset, {
        ...options,
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      });
    } catch {
      this.landmarker = await FaceLandmarker.createFromOptions(fileset, {
        ...options,
        baseOptions: { modelAssetPath: MODEL_URL, delegate: 'CPU' },
      });
    }
  }

  detect(video: HTMLVideoElement, timestampMs: number): FaceDetectResult | null {
    if (!this.landmarker || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      return null;
    }
    const result: FaceLandmarkerResult = this.landmarker.detectForVideo(video, timestampMs);
    const landmarks = result.faceLandmarks[0];
    if (!landmarks || landmarks.length === 0) {
      return null;
    }
    const blendShapes =
      result.faceBlendshapes[0]?.categories.map((category) => ({
        categoryName: category.categoryName,
        score: category.score,
      })) ?? [];
    const matrix = result.facialTransformationMatrixes[0]?.data;
    const face: FacePayload = {
      landmarks: toLandmarks(landmarks),
      confidence: averageVisibility(landmarks),
      transformationMatrix: matrix ? [...matrix] : undefined,
    };
    return {
      face,
      blendShapes,
      glasses: this.glasses.detect(video, face.landmarks),
    };
  }

  close(): void {
    this.landmarker?.close();
    this.landmarker = null;
    this.glasses.reset();
  }
}
