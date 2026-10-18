import { useEffect, useState, useRef, useCallback } from 'react';
import { db } from '../db';
import { validatePolygon } from '../services/zones';
import type { VideoSource, RestrictedZone, Point } from '../types';
import { Camera, Plus, Trash2, MapPin, ToggleLeft, ToggleRight, Edit2, Save, X } from 'lucide-react';

export default function SourcesPage() {
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [zones, setZones] = useState<RestrictedZone[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState<string>('');
  const [showAddSource, setShowAddSource] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceType, setNewSourceType] = useState<'webcam' | 'file'>('webcam');
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [newZoneName, setNewZoneName] = useState('');
  const [drawingPoints, setDrawingPoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadSources();
  }, []);

  useEffect(() => {
    if (selectedSourceId) {
      loadZones(selectedSourceId);
    }
  }, [selectedSourceId]);

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

  async function addSource() {
    if (!newSourceName.trim()) return;
    const now = new Date().toISOString();
    const source: VideoSource = {
      id: crypto.randomUUID(),
      name: newSourceName.trim(),
      sourceType: newSourceType,
      configuration: {},
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.sources.add(source);
    setNewSourceName('');
    setShowAddSource(false);
    await loadSources();
    setSelectedSourceId(source.id);
  }

  async function deleteSource(id: string) {
    if (!confirm('Delete this source and all associated zones?')) return;
    await db.sources.delete(id);
    await db.zones.where('sourceId').equals(id).delete();
    await loadSources();
    if (selectedSourceId === id) {
      const remaining = sources.filter(s => s.id !== id);
      setSelectedSourceId(remaining.length > 0 ? remaining[0].id : '');
    }
  }

  async function toggleZone(zoneId: string, enabled: boolean) {
    await db.zones.update(zoneId, { enabled, updatedAt: new Date().toISOString() });
    await loadZones(selectedSourceId);
  }

  async function deleteZone(zoneId: string) {
    if (!confirm('Delete this zone?')) return;
    await db.zones.delete(zoneId);
    await loadZones(selectedSourceId);
  }

  async function saveZone() {
    if (!newZoneName.trim()) return;
    const validation = validatePolygon(drawingPoints);
    if (!validation.valid) {
      alert(validation.error);
      return;
    }

    const now = new Date().toISOString();
    const zone: RestrictedZone = {
      id: crypto.randomUUID(),
      sourceId: selectedSourceId,
      name: newZoneName.trim(),
      polygon: drawingPoints,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.zones.add(zone);
    setNewZoneName('');
    setDrawingPoints([]);
    setIsDrawing(false);
    setEditingZone(null);
    await loadZones(selectedSourceId);
  }

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setDrawingPoints(prev => [...prev, { x, y }]);
  }, [isDrawing]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const canvas = canvasRef.current;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < canvas.width; i += 40) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let j = 0; j < canvas.height; j += 40) {
      ctx.beginPath();
      ctx.moveTo(0, j);
      ctx.lineTo(canvas.width, j);
      ctx.stroke();
    }

    // Draw existing zones
    for (const zone of zones) {
      if (zone.polygon.length < 3) continue;
      ctx.beginPath();
      ctx.moveTo(zone.polygon[0].x * canvas.width, zone.polygon[0].y * canvas.height);
      for (let i = 1; i < zone.polygon.length; i++) {
        ctx.lineTo(zone.polygon[i].x * canvas.width, zone.polygon[i].y * canvas.height);
      }
      ctx.closePath();
      ctx.fillStyle = zone.enabled ? 'rgba(59, 130, 246, 0.1)' : 'rgba(156, 163, 175, 0.1)';
      ctx.fill();
      ctx.strokeStyle = zone.enabled ? 'rgba(59, 130, 246, 0.6)' : 'rgba(156, 163, 175, 0.4)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#374151';
      ctx.font = '11px system-ui';
      ctx.fillText(zone.name, zone.polygon[0].x * canvas.width + 4, zone.polygon[0].y * canvas.height - 6);
    }

    // Draw current drawing
    if (drawingPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(drawingPoints[0].x * canvas.width, drawingPoints[0].y * canvas.height);
      for (let i = 1; i < drawingPoints.length; i++) {
        ctx.lineTo(drawingPoints[i].x * canvas.width, drawingPoints[i].y * canvas.height);
      }
      if (drawingPoints.length >= 3) {
        ctx.closePath();
        ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
        ctx.fill();
      }
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw points
      for (const pt of drawingPoints) {
        ctx.beginPath();
        ctx.arc(pt.x * canvas.width, pt.y * canvas.height, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#ef4444';
        ctx.fill();
      }
    }
  }, [zones, drawingPoints]);

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Sources list */}
      <div className="w-72 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Sources</h3>
          <button onClick={() => setShowAddSource(true)} className="p-1 hover:bg-gray-100 rounded">
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {showAddSource && (
          <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 space-y-2">
            <input
              type="text"
              placeholder="Source name"
              value={newSourceName}
              onChange={e => setNewSourceName(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
              autoFocus
            />
            <select value={newSourceType} onChange={e => setNewSourceType(e.target.value as any)} className="w-full text-sm border border-gray-200 rounded px-2 py-1.5">
              <option value="webcam">Webcam</option>
              <option value="file">Video File</option>
            </select>
            <div className="flex gap-1.5">
              <button onClick={addSource} className="flex-1 px-2 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-800">Add</button>
              <button onClick={() => setShowAddSource(false)} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-100">Cancel</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {sources.length === 0 ? (
            <div className="p-4 text-center">
              <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No sources configured</p>
              <p className="text-xs text-gray-400 mt-1">Add a source to begin monitoring</p>
            </div>
          ) : (
            sources.map(src => (
              <div
                key={src.id}
                onClick={() => setSelectedSourceId(src.id)}
                className={`px-4 py-2.5 flex items-center justify-between cursor-pointer border-b border-gray-50 ${
                  selectedSourceId === src.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div>
                  <p className="text-sm text-gray-900 font-medium">{src.name}</p>
                  <p className="text-xs text-gray-500">{src.sourceType}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteSource(src.id); }} className="p-1 hover:bg-red-50 rounded">
                  <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Zone configuration */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedSourceId ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Select a source to configure zones</p>
            </div>
          </div>
        ) : (
          <>
            <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Restricted Zones — {sources.find(s => s.id === selectedSourceId)?.name}
                </h3>
                <p className="text-xs text-gray-500">{zones.length} zone{zones.length !== 1 ? 's' : ''} configured</p>
              </div>
              <button
                onClick={() => { setIsDrawing(true); setDrawingPoints([]); setEditingZone('new'); }}
                disabled={isDrawing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-700 text-white rounded-md hover:bg-blue-800 disabled:opacity-50"
              >
                <Plus className="w-3.5 h-3.5" />
                Draw Zone
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Canvas */}
              <div className="flex-1 p-4 flex items-center justify-center bg-gray-100">
                <div className="relative bg-white rounded-lg border border-gray-200 shadow-sm" style={{ width: 480, height: 360 }}>
                  <canvas
                    ref={canvasRef}
                    width={480}
                    height={360}
                    onClick={handleCanvasClick}
                    className={`w-full h-full rounded-lg ${isDrawing ? 'cursor-crosshair' : 'cursor-default'}`}
                  />
                  {isDrawing && (
                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between bg-white/90 rounded px-2 py-1.5 border border-gray-200">
                      <span className="text-xs text-gray-600">Click to add points ({drawingPoints.length}/min 3)</span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setDrawingPoints(prev => prev.slice(0, -1))}
                          disabled={drawingPoints.length === 0}
                          className="px-2 py-0.5 text-xs border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50"
                        >
                          Undo
                        </button>
                        {drawingPoints.length >= 3 && (
                          <button
                            onClick={() => setEditingZone('save')}
                            className="px-2 py-0.5 text-xs bg-blue-700 text-white rounded hover:bg-blue-800"
                          >
                            Save Zone
                          </button>
                        )}
                        <button
                          onClick={() => { setIsDrawing(false); setDrawingPoints([]); setEditingZone(null); }}
                          className="px-2 py-0.5 text-xs border border-gray-200 rounded hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Zone list */}
              <div className="w-64 border-l border-gray-200 bg-white overflow-auto">
                <div className="px-3 py-2 border-b border-gray-100">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase">Zone List</h4>
                </div>
                {editingZone === 'save' && (
                  <div className="px-3 py-2 border-b border-gray-100 bg-blue-50">
                    <input
                      type="text"
                      placeholder="Zone name"
                      value={newZoneName}
                      onChange={e => setNewZoneName(e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded px-2 py-1 mb-1.5"
                      autoFocus
                    />
                    <div className="flex gap-1">
                      <button onClick={saveZone} className="flex-1 px-2 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-800">Save</button>
                      <button onClick={() => { setEditingZone(null); setDrawingPoints([]); setIsDrawing(false); }} className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50">Cancel</button>
                    </div>
                  </div>
                )}
                {zones.length === 0 ? (
                  <div className="p-3 text-center">
                    <p className="text-xs text-gray-400">No zones defined</p>
                  </div>
                ) : (
                  zones.map(zone => (
                    <div key={zone.id} className="px-3 py-2 border-b border-gray-50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-900 font-medium">{zone.name}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => toggleZone(zone.id, !zone.enabled)} className="p-0.5 hover:bg-gray-100 rounded">
                            {zone.enabled ? (
                              <ToggleRight className="w-4 h-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                          <button onClick={() => deleteZone(zone.id)} className="p-0.5 hover:bg-red-50 rounded">
                            <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">{zone.polygon.length} points · {zone.enabled ? 'Active' : 'Disabled'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
