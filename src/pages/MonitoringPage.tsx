import { useEffect, useRef, useState, useCallback } from 'react';
import { db, getSettings } from '../db';
import { loadModel, isModelLoaded, getModelLoadError, getModelLoadTime, getModelName } from '../services/detection';
import { startProcessing, stopProcessing, type ProcessingState } from '../services/video';
import type { VideoSource, RestrictedZone, Incident, AppSettings, SessionStatus } from '../types';
import { Camera, Upload, Play, Pause, Square, AlertTriangle, Loader2 } from 'lucide-react';

export default function MonitoringPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [sources, setSources] = useState<VideoSource[]>([]);
  const [zones, setZones] = useState<RestrictedZone[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [status, setStatus] = useState<SessionStatus>('idle');
  const [sessionId, setSessionId] = useState<string>('');
  const [processingState, setProcessingState] = useState<ProcessingState | null>(null);
  const [recentIncidents, setRecentIncidents] = useState<Incident[]>([]);
  const [modelReady, setModelReady] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [fileMode, setFileMode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSources();
    initModel();
    return () => {
      stopProcessing();
      cleanupStream();
    };
  }, []);

  useEffect(() => {
    if (selectedSourceId) {
      loadZones(selectedSourceId);
    }
  }, [selectedSourceId]);

  async function initModel() {
    if (isModelLoaded()) {
      setModelReady(true);
      return;
    }
    try {
      await loadModel();
      setModelReady(true);
    } catch (err) {
      setModelError(err instanceof Error ? err.message : 'Model load failed');
    }
  }

  async function loadSources() {
    const srcs = await db.sources.toArray();
    setSources(srcs);
    if (srcs.length > 0 && !selectedSourceId) {
      setSelectedSourceId(srcs[0].id);
    }
  }

  async function loadZones(sourceId: string) {
    const z = await db.zones.where('sourceId').equals(sourceId).toArray();
    setZones(z);
  }

  function cleanupStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.src = '';
    }
  }

  async function handleStartWebcam() {
    setError(null);
    setFileMode(false);

    if (!selectedSourceId) {
      setError('Please select or create a monitoring source first.');
      return;
    }
    if (!modelReady) {
      setError('Detection model is not ready. Please wait or check system health.');
      return;
    }

    setStatus('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      await startSession();
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Camera access denied');
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setFileMode(true);

    if (!selectedSourceId) {
      setError('Please select or create a monitoring source first.');
      return;
    }
    if (!modelReady) {
      setError('Detection model is not ready.');
      return;
    }

    setStatus('starting');
    const url = URL.createObjectURL(file);
    if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.loop = false;
      await videoRef.current.play();
    }
    await startSession();
  }

  async function startSession() {
    const source = sources.find(s => s.id === selectedSourceId);
    if (!source) return;

    const s = await getSettings();
    setSettings(s);

    const sid = crypto.randomUUID();
    setSessionId(sid);

    const session = {
      id: sid,
      sourceId: source.id,
      status: 'running' as const,
      startedAt: new Date().toISOString(),
      endedAt: null,
      errorSummary: null,
    };
    await db.monitoringSessions.add(session);

    startProcessing(
      videoRef.current!,
      canvasRef.current!,
      sid,
      source.id,
      source.name,
      zones,
      s,
      (state) => {
        setProcessingState(state);
        setStatus(state.status);
      },
      (incident) => {
        setRecentIncidents(prev => [incident, ...prev].slice(0, 20));
      },
    );
  }

  function handlePause() {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setStatus('paused');
  }

  function handleResume() {
    if (videoRef.current) {
      videoRef.current.play();
      setStatus('running');
    }
  }

  async function handleStop() {
    stopProcessing();
    cleanupStream();
    setStatus('stopped');

    if (sessionId) {
      await db.monitoringSessions.update(sessionId, {
        status: 'stopped',
        endedAt: new Date().toISOString(),
      });
    }
    setProcessingState(null);
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Main video area */}
      <div className="flex-1 flex flex-col p-4">
        {/* Controls bar */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <select
              value={selectedSourceId}
              onChange={e => setSelectedSourceId(e.target.value)}
              disabled={status === 'running'}
              className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5 bg-white disabled:opacity-50"
            >
              {sources.length === 0 ? (
                <option value="">No sources configured</option>
              ) : (
                sources.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))
              )}
            </select>

            {status === 'idle' || status === 'stopped' ? (
              <>
                <button
                  onClick={handleStartWebcam}
                  disabled={!modelReady || !selectedSourceId}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 text-white text-sm font-medium rounded-md hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Start Webcam
                </button>
                <label className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  Upload Video
                  <input type="file" accept="video/*" className="hidden" onChange={handleFileUpload} />
                </label>
              </>
            ) : (
              <div className="flex items-center gap-1.5">
                {status === 'running' ? (
                  <button onClick={handlePause} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-800 text-sm font-medium rounded-md hover:bg-amber-200">
                    <Pause className="w-3.5 h-3.5" />
                    Pause
                  </button>
                ) : status === 'paused' ? (
                  <button onClick={handleResume} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-800 text-sm font-medium rounded-md hover:bg-blue-200">
                    <Play className="w-3.5 h-3.5" />
                    Resume
                  </button>
                ) : null}
                <button onClick={handleStop} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 text-sm font-medium rounded-md hover:bg-red-100">
                  <Square className="w-3.5 h-3.5" />
                  Stop
                </button>
              </div>
            )}
          </div>

          {/* Pipeline status */}
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className={`flex items-center gap-1 ${modelReady ? 'text-green-700' : 'text-gray-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${modelReady ? 'bg-green-500' : 'bg-gray-300'}`} />
              Model: {modelReady ? 'Ready' : 'Loading…'}
            </span>
            {processingState && (
              <>
                <span>FPS: {processingState.fps}</span>
                <span>Inference: {processingState.inferenceMs.toFixed(0)}ms</span>
                <span>Frames: {processingState.totalFrames}</span>
              </>
            )}
          </div>
        </div>

        {/* Video viewport */}
        <div className="flex-1 bg-gray-900 rounded-lg overflow-hidden relative flex items-center justify-center">
          {(status === 'idle' || status === 'stopped') && (
            <div className="text-center">
              <Camera className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="text-sm text-gray-400">No active session</p>
              <p className="text-xs text-gray-500 mt-1">Select a source and start webcam or upload a video</p>
            </div>
          )}
          {status === 'starting' && (
            <div className="text-center">
              <Loader2 className="w-8 h-8 text-blue-400 mx-auto mb-2 animate-spin" />
              <p className="text-sm text-gray-400">Starting session…</p>
            </div>
          )}
          <video
            ref={videoRef}
            className={`absolute inset-0 w-full h-full object-contain ${(status === 'idle' || status === 'stopped' || status === 'starting') ? 'hidden' : ''}`}
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className={`absolute inset-0 w-full h-full object-contain ${status === 'running' || status === 'paused' ? '' : 'hidden'}`}
          />
        </div>

        {/* Error display */}
        {error && (
          <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {error}
          </div>
        )}
        {modelError && !modelReady && (
          <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-700">
            Model error: {modelError}. The application requires TensorFlow.js to load the COCO-SSD model.
          </div>
        )}
      </div>

      {/* Side panel */}
      <div className="w-72 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
        {/* Detection info */}
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">Live Detections</h3>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {processingState?.currentDetections.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-4">No detections in current frame</p>
          )}
          {processingState?.currentDetections.map((det, i) => (
            <div key={i} className="px-2.5 py-2 bg-gray-50 rounded border border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-900">{det.className}</span>
                <span className="text-xs text-gray-500">{(det.confidence * 100).toFixed(1)}%</span>
              </div>
              <div className="text-xs text-gray-400 mt-0.5">
                [{det.boundingBox.x.toFixed(0)}, {det.boundingBox.y.toFixed(0)}, {det.boundingBox.width.toFixed(0)}×{det.boundingBox.height.toFixed(0)}]
              </div>
            </div>
          ))}
        </div>

        {/* Recent incidents */}
        <div className="border-t border-gray-200">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <h3 className="text-sm font-semibold text-gray-900">Recent Events</h3>
          </div>
          <div className="max-h-48 overflow-auto">
            {recentIncidents.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3">No events yet</p>
            ) : (
              recentIncidents.map(inc => (
                <div key={inc.id} className="px-3 py-2 border-b border-gray-50">
                  <p className="text-xs text-gray-900 font-medium">{inc.severity.toUpperCase()} — {inc.incidentType}</p>
                  <p className="text-xs text-gray-500">{new Date(inc.timestamp).toLocaleTimeString()}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Zone info */}
        <div className="border-t border-gray-200 px-4 py-3">
          <h4 className="text-xs font-semibold text-gray-500 mb-1.5">Active Zones</h4>
          {zones.length === 0 ? (
            <p className="text-xs text-gray-400">No zones configured for this source</p>
          ) : (
            zones.map(z => (
              <div key={z.id} className="flex items-center justify-between text-xs">
                <span className="text-gray-700">{z.name}</span>
                <span className={`px-1.5 py-0.5 rounded ${z.enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {z.enabled ? 'Active' : 'Disabled'}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
