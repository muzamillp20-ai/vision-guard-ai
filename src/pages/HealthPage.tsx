import { useEffect, useState } from 'react';
import { isModelLoaded, getModelLoadTime, getModelLoadError, getModelName } from '../services/detection';
import { db } from '../db';
import { Activity, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';

interface HealthItem {
  name: string;
  status: 'healthy' | 'degraded' | 'error' | 'unknown';
  detail: string;
}

export default function HealthPage() {
  const [healthItems, setHealthItems] = useState<HealthItem[]>([]);
  const [detectionCount, setDetectionCount] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [lastLoadTime, setLastLoadTime] = useState<number | null>(null);

  useEffect(() => {
    checkHealth();
  }, []);

  async function checkHealth() {
    const items: HealthItem[] = [];

    // Model status
    if (isModelLoaded()) {
      items.push({
        name: 'Detection Model',
        status: 'healthy',
        detail: `${getModelName()} — loaded in ${getModelLoadTime()?.toFixed(0) || '?'}ms`,
      });
    } else if (getModelLoadError()) {
      items.push({
        name: 'Detection Model',
        status: 'error',
        detail: `Load failed: ${getModelLoadError()}`,
      });
    } else {
      items.push({
        name: 'Detection Model',
        status: 'unknown',
        detail: 'Not yet initialized',
      });
    }

    // Database status
    try {
      await db.sources.count();
      items.push({ name: 'Database (IndexedDB)', status: 'healthy', detail: 'Connected and responsive' });
    } catch {
      items.push({ name: 'Database (IndexedDB)', status: 'error', detail: 'Connection failed' });
    }

    // Camera access
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
        items.push({ name: 'Camera API', status: 'healthy', detail: 'WebRTC getUserMedia available' });
      } else {
        items.push({ name: 'Camera API', status: 'error', detail: 'Not available in this browser' });
      }
    } catch {
      items.push({ name: 'Camera API', status: 'degraded', detail: 'Availability unknown' });
    }

    // TensorFlow.js
    try {
      const tf = await import('@tensorflow/tfjs');
      const backend = tf.getBackend();
      items.push({ name: 'TensorFlow.js', status: 'healthy', detail: `Backend: ${backend}` });
    } catch {
      items.push({ name: 'TensorFlow.js', status: 'error', detail: 'Not available' });
    }

    // Evidence storage
    items.push({ name: 'Evidence Storage', status: 'healthy', detail: 'In-memory (session-based)' });

    setHealthItems(items);

    // Stats
    const [dCount, sCount] = await Promise.all([
      db.detections.count(),
      db.sessions.count(),
    ]);
    setDetectionCount(dCount);
    setSessionCount(sCount);
    setLastLoadTime(getModelLoadTime());
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-3xl">
        {/* Component health */}
        <div className="bg-white rounded-lg border border-gray-200 mb-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Component Status</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {healthItems.map((item, i) => (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <StatusIcon status={item.status} />
                  <div>
                    <p className="text-sm text-gray-900 font-medium">{item.name}</p>
                    <p className="text-xs text-gray-500">{item.detail}</p>
                  </div>
                </div>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Runtime stats */}
        <div className="bg-white rounded-lg border border-gray-200 mb-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Runtime Statistics</h3>
          </div>
          <div className="p-4 grid grid-cols-3 gap-4">
            <StatItem label="Total Sessions" value={sessionCount} />
            <StatItem label="Stored Detections" value={detectionCount} />
            <StatItem label="Model Load Time" value={lastLoadTime ? `${lastLoadTime.toFixed(0)}ms` : 'N/A'} />
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">System Notes</h3>
          </div>
          <div className="p-4 space-y-2 text-sm text-gray-600">
            <p>• VisionGuard AI uses TensorFlow.js with COCO-SSD (MobileNet v2) for real-time person detection in the browser.</p>
            <p>• All data is stored locally in IndexedDB. No data is transmitted to external servers.</p>
            <p>• Camera access requires HTTPS or localhost. File upload works without camera permissions.</p>
            <p>• Inference performance depends on available hardware. GPU acceleration is used when available.</p>
            <p>• The CraftAI PipeGen integration is documented separately. This build uses a local inference adapter for development.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'healthy': return <CheckCircle className="w-4 h-4 text-green-600" />;
    case 'degraded': return <AlertCircle className="w-4 h-4 text-amber-500" />;
    case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
    default: return <Clock className="w-4 h-4 text-gray-400" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: 'bg-green-50 text-green-700',
    degraded: 'bg-amber-50 text-amber-700',
    error: 'bg-red-50 text-red-700',
    unknown: 'bg-gray-100 text-gray-600',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || colors.unknown}`}>
      {status}
    </span>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <p className="text-xl font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
