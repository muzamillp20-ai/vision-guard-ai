import { db } from '../db';
import { detect, toVGDetection, loadModel, isModelLoaded } from './detection';
import { isDetectionInZone } from './zones';
import {
  updateConsecutiveCounter,
  isCooldownActive,
  recordIncidentTime,
  createIncident,
  resetCounters,
} from './incidents';
import type { RestrictedZone, AppSettings, Detection as VGDetection, SessionStatus } from '../types';

export interface ProcessingState {
  status: SessionStatus;
  currentDetections: VGDetection[];
  fps: number;
  inferenceMs: number;
  totalFrames: number;
  lastFrameTime: number;
  error: string | null;
}

export type ProcessingCallback = (state: ProcessingState) => void;

let animFrameId: number | null = null;
let isProcessing = false;

export async function startProcessing(
  videoElement: HTMLVideoElement,
  canvasElement: HTMLCanvasElement,
  sessionId: string,
  sourceId: string,
  sourceName: string,
  zones: RestrictedZone[],
  settings: AppSettings,
  onState: ProcessingCallback,
  onIncident: (incident: any) => void,
): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;
  resetCounters();

  if (!isModelLoaded()) {
    try {
      await loadModel();
    } catch (err) {
      isProcessing = false;
      onState({
        status: 'error',
        currentDetections: [],
        fps: 0,
        inferenceMs: 0,
        totalFrames: 0,
        lastFrameTime: 0,
        error: err instanceof Error ? err.message : 'Failed to load model',
      });
      return;
    }
  }

  const ctx = canvasElement.getContext('2d');
  if (!ctx) {
    isProcessing = false;
    onState({
      status: 'error',
      currentDetections: [],
      fps: 0,
      inferenceMs: 0,
      totalFrames: 0,
      lastFrameTime: 0,
      error: 'Could not get canvas context',
    });
    return;
  }

  let totalFrames = 0;
  let frameCount = 0;
  let fpsStartTime = performance.now();
  let currentFps = 0;
  let lastInferenceMs = 0;

  onState({
    status: 'running',
    currentDetections: [],
    fps: 0,
    inferenceMs: 0,
    totalFrames: 0,
    lastFrameTime: 0,
    error: null,
  });

  const processFrame = async () => {
    if (!isProcessing) return;

    try {
      // Set canvas to match video dimensions
      canvasElement.width = videoElement.videoWidth || 640;
      canvasElement.height = videoElement.videoHeight || 480;

      // Draw video frame
      ctx.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height);

      // Run detection
      const inferenceStart = performance.now();
      const rawDetections = await detect(videoElement);
      lastInferenceMs = performance.now() - inferenceStart;

      // Filter by target class and confidence
      const filtered = rawDetections.filter(
        d => d.class === settings.targetClass && d.score >= settings.confidenceThreshold,
      );

      // Convert to VG detections
      const vgDetections: VGDetection[] = filtered.map(d =>
        toVGDetection(
          d,
          sessionId,
          performance.now(),
          videoElement.videoWidth,
          videoElement.videoHeight,
          canvasElement.width,
          canvasElement.height,
        ),
      );

      // Draw detections
      drawDetections(ctx, vgDetections, zones, canvasElement.width, canvasElement.height);

      // Check zone intrusions
      for (const zone of zones) {
        if (!zone.enabled) continue;

        const personInZone = vgDetections.find(d => isDetectionInZone(d, zone));
        const key = `${zone.id}:${sourceId}`;
        const { confirmed, count } = updateConsecutiveCounter(key, !!personInZone);

        if (confirmed && count >= settings.consecutiveFrameConfirmation) {
          if (!isCooldownActive(zone.id, sourceId, settings.cooldownMs)) {
            const secondsInZone = (count / Math.max(currentFps, 1));
            const confidence = personInZone?.confidence || 0;

            recordIncidentTime(zone.id, sourceId);

            const incident = await createIncident(
              sessionId,
              sourceId,
              sourceName,
              confidence,
              secondsInZone,
              settings,
            );

            // Save evidence
            try {
              const evidenceDataUrl = canvasElement.toDataURL('image/jpeg', 0.8);
              incident.evidenceRef = evidenceDataUrl;
              await db.incidents.update(incident.id, { evidenceRef: evidenceDataUrl });
            } catch {
              // Evidence capture failed - that's OK, incident is still recorded
            }

            onIncident(incident);
          }
        }
      }

      // Store detections (limit to avoid memory issues)
      if (totalFrames % 10 === 0) {
        for (const det of vgDetections.slice(0, 5)) {
          await db.detections.add(det).catch(() => {});
        }
      }

      // Calculate FPS
      totalFrames++;
      frameCount++;
      const elapsed = performance.now() - fpsStartTime;
      if (elapsed >= 1000) {
        currentFps = Math.round((frameCount * 1000) / elapsed);
        frameCount = 0;
        fpsStartTime = performance.now();
      }

      onState({
        status: 'running',
        currentDetections: vgDetections,
        fps: currentFps,
        inferenceMs: lastInferenceMs,
        totalFrames,
        lastFrameTime: performance.now(),
        error: null,
      });
    } catch (err) {
      onState({
        status: 'error',
        currentDetections: [],
        fps: 0,
        inferenceMs: 0,
        totalFrames,
        lastFrameTime: performance.now(),
        error: err instanceof Error ? err.message : 'Processing error',
      });
      isProcessing = false;
      return;
    }

    animFrameId = requestAnimationFrame(processFrame);
  };

  animFrameId = requestAnimationFrame(processFrame);
}

export function stopProcessing(): void {
  isProcessing = false;
  if (animFrameId !== null) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  resetCounters();
}

export function isCurrentlyProcessing(): boolean {
  return isProcessing;
}

function drawDetections(
  ctx: CanvasRenderingContext2D,
  detections: VGDetection[],
  zones: RestrictedZone[],
  canvasWidth: number,
  canvasHeight: number,
): void {
  // Draw zones first
  for (const zone of zones) {
    if (!zone.enabled || zone.polygon.length < 3) continue;

    ctx.beginPath();
    ctx.moveTo(zone.polygon[0].x * canvasWidth, zone.polygon[0].y * canvasHeight);
    for (let i = 1; i < zone.polygon.length; i++) {
      ctx.lineTo(zone.polygon[i].x * canvasWidth, zone.polygon[i].y * canvasHeight);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Zone label
    ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(
      zone.name,
      zone.polygon[0].x * canvasWidth + 4,
      zone.polygon[0].y * canvasHeight - 6,
    );
  }

  // Draw detections
  for (const det of detections) {
    const { x, y, width, height } = det.boundingBox;

    // Check if in any zone
    const inZone = zones.some(z => z.enabled && isDetectionInZone(det, z));
    const color = inZone ? '#ef4444' : '#3b82f6';

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    // Label
    const label = `${det.className} ${(det.confidence * 100).toFixed(0)}%`;
    ctx.font = '12px system-ui, sans-serif';
    const labelWidth = ctx.measureText(label).width + 8;
    ctx.fillStyle = color;
    ctx.fillRect(x, y - 20, labelWidth, 20);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(label, x + 4, y - 6);
  }
}
