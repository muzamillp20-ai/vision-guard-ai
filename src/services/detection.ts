import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import type { Detection as VGDetection } from '../types';

let model: cocoSsd.ObjectDetection | null = null;
let loading = false;
let loadError: string | null = null;
let loadTime: number | null = null;

export interface RawDetection {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

export async function loadModel(): Promise<cocoSsd.ObjectDetection> {
  if (model) return model;
  if (loading) {
    while (loading) {
      await new Promise(r => setTimeout(r, 200));
    }
    if (model) return model;
    throw new Error(loadError || 'Model failed to load');
  }

  loading = true;
  loadError = null;
  const start = performance.now();

  try {
    await tf.ready();
    model = await cocoSsd.load({
      base: 'lite_mobilenet_v2',
    });
    loadTime = performance.now() - start;
    loading = false;
    return model;
  } catch (err) {
    loading = false;
    loadError = err instanceof Error ? err.message : 'Unknown error loading model';
    throw err;
  }
}

export function isModelLoaded(): boolean {
  return model !== null;
}

export function getModelLoadTime(): number | null {
  return loadTime;
}

export function getModelLoadError(): string | null {
  return loadError;
}

export function getModelName(): string {
  return 'COCO-SSD (MobileNet v2)';
}

export async function detect(videoElement: HTMLVideoElement): Promise<RawDetection[]> {
  if (!model) {
    throw new Error('Model not loaded');
  }
  const predictions = await model.detect(videoElement);
  return predictions.map(p => ({
    class: p.class,
    score: p.score,
    bbox: p.bbox as [number, number, number, number],
  }));
}

export function toVGDetection(
  raw: RawDetection,
  sessionId: string,
  frameTimestamp: number,
  videoWidth: number,
  videoHeight: number,
  canvasWidth: number,
  canvasHeight: number,
): VGDetection {
  const scaleX = canvasWidth / videoWidth;
  const scaleY = canvasHeight / videoHeight;

  return {
    id: crypto.randomUUID(),
    sessionId,
    className: raw.class,
    confidence: raw.score,
    boundingBox: {
      x: raw.bbox[0] * scaleX,
      y: raw.bbox[1] * scaleY,
      width: raw.bbox[2] * scaleX,
      height: raw.bbox[3] * scaleY,
    },
    frameTimestamp,
    createdAt: new Date().toISOString(),
  };
}
