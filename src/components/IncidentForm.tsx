import { useState, useRef } from 'react';
import { db } from '../db';
import { createManualIncident } from '../services/incidents';
import type { IncidentFormData, IncidentCategory, IncidentSeverity, VideoSource } from '../types';
import { X, Upload, Camera, AlertCircle, Loader2 } from 'lucide-react';

interface IncidentFormProps {
  onClose: () => void;
  onCreated: () => void;
  currentUserName: string;
  currentUserId: string | null;
}

const CATEGORIES: IncidentCategory[] = [
  'Zone Intrusion',
  'Safety Violation',
  'Unauthorized Access',
  'Equipment Hazard',
  'Environmental',
  'PPE Violation',
  'Other',
];

const SEVERITIES: IncidentSeverity[] = ['low', 'medium', 'high', 'critical'];

export default function IncidentForm({ onClose, onCreated, currentUserName, currentUserId }: IncidentFormProps) {
  const [formData, setFormData] = useState<IncidentFormData>({
    title: '',
    category: 'Other',
    severity: 'medium',
    timestamp: new Date().toISOString().slice(0, 16),
    location: '',
    description: '',
    tags: [],
    evidenceDataUrl: null,
  });
  const [tagInput, setTagInput] = useState('');
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useState(() => {
    db.sources.toArray().then(s => {
      setSources(s);
      if (s.length > 0) setSelectedSourceId(s[0].id);
    });
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (!formData.description.trim()) {
      setError('Description is required');
      return;
    }

    setSaving(true);
    try {
      const data: IncidentFormData = {
        ...formData,
        sourceId: selectedSourceId || undefined,
        timestamp: new Date(formData.timestamp).toISOString(),
      };

      await createManualIncident(data, currentUserName, currentUserId);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create incident');
    } finally {
      setSaving(false);
    }
  }

  function handleEvidenceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Only image files are supported for evidence');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Evidence file must be under 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setEvidencePreview(dataUrl);
      setFormData(prev => ({ ...prev, evidenceDataUrl: dataUrl }));
    };
    reader.readAsDataURL(file);
  }

  function removeEvidence() {
    setEvidencePreview(null);
    setFormData(prev => ({ ...prev, evidenceDataUrl: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  }

  function removeTag(tag: string) {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Create Incident</h2>
            <p className="text-xs text-gray-500 mt-0.5">Report a safety incident manually</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-md">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Incident Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief summary of the incident"
              required
            />
          </div>

          {/* Category + Severity */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={e => setFormData(f => ({ ...f, category: e.target.value as IncidentCategory }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={formData.severity}
                onChange={e => setFormData(f => ({ ...f, severity: e.target.value as IncidentSeverity }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {SEVERITIES.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date/Time + Location */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={formData.timestamp}
                onChange={e => setFormData(f => ({ ...f, timestamp: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location / Zone</label>
              <input
                type="text"
                value={formData.location}
                onChange={e => setFormData(f => ({ ...f, location: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Warehouse A, Lab 3"
              />
            </div>
          </div>

          {/* Related Source */}
          {sources.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Related Monitoring Source</label>
              <select
                value={selectedSourceId}
                onChange={e => setSelectedSourceId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description & Observations <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.description}
              onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Describe what happened, who was involved, and any relevant observations…"
              required
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add tag and press Enter"
              />
              <button type="button" onClick={addTag} className="px-3 py-2 text-sm bg-gray-100 rounded-md hover:bg-gray-200">
                Add
              </button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {formData.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-blue-900">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Evidence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Evidence (Image)</label>
            {evidencePreview ? (
              <div className="relative inline-block">
                <img src={evidencePreview} alt="Evidence" className="max-h-40 rounded border border-gray-200" />
                <button
                  type="button"
                  onClick={removeEvidence}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <Upload className="w-4 h-4" />
                  Upload Image
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <Camera className="w-4 h-4" />
                  Take Photo
                </button>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleEvidenceUpload}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleEvidenceUpload}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-700 text-white rounded-md hover:bg-blue-800 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Create Incident'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
