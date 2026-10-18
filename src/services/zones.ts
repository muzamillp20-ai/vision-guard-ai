import type { Point, RestrictedZone, Detection } from '../types';

/**
 * Ray-casting algorithm for point-in-polygon test.
 * Uses the bottom-center of the detection bounding box as the reference point.
 */
export function getDetectionFootPoint(detection: Detection): Point {
  return {
    x: detection.boundingBox.x + detection.boundingBox.width / 2,
    y: detection.boundingBox.y + detection.boundingBox.height,
  };
}

export function isPointInPolygon(point: Point, polygon: Point[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect =
      yi > point.y !== yj > point.y &&
      point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

export function isDetectionInZone(
  detection: Detection,
  zone: RestrictedZone,
): boolean {
  if (!zone.enabled) return false;
  const footPoint = getDetectionFootPoint(detection);
  return isPointInPolygon(footPoint, zone.polygon);
}

export function validatePolygon(polygon: Point[]): { valid: boolean; error?: string } {
  if (polygon.length < 3) {
    return { valid: false, error: 'A zone must have at least 3 points' };
  }
  // Check for duplicate consecutive points
  for (let i = 0; i < polygon.length; i++) {
    const next = (i + 1) % polygon.length;
    if (polygon[i].x === polygon[next].x && polygon[i].y === polygon[next].y) {
      return { valid: false, error: 'Duplicate consecutive points detected' };
    }
  }
  return { valid: true };
}
