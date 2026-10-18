import { useEffect, useState } from 'react';
import { db, getSettings, saveSettings } from '../db';
import type { AppSettings } from '../types';
import { Save, RotateCcw, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSettings().then(s => {
      setSettings(s);
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    if (!settings) return;
    await saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleReset() {
    if (!confirm('Reset all settings to defaults? This does not delete incidents or sources.')) return;
    const defaults: AppSettings = {
      confidenceThreshold: 0.5,
      consecutiveFrameConfirmation: 3,
      cooldownMs: 10000,
      targetClass: 'person',
      evidenceRetentionDays: 30,
      severityRules: { high: 5, critical: 15 },
    };
    setSettings(defaults);
    await saveSettings(defaults);
  }

  async function handleClearData() {
    if (!confirm('Delete ALL data (sources, zones, incidents, sessions, detections)? This cannot be undone.')) return;
    if (!confirm('Are you absolutely sure? All monitoring data will be permanently deleted.')) return;
    await db.sources.clear();
    await db.zones.clear();
    await db.incidents.clear();
    await db.monitoringSessions.clear();
    await db.sessions.clear();
    await db.users.clear();
    await db.auditLog.clear();
    await db.notifications.clear();
    await db.detections.clear();
    alert('All data cleared. The application will start fresh.');
    window.location.reload();
  }

  if (loading || !settings) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-sm text-gray-500">Loading settings…</p></div>;
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl">
        {/* Detection settings */}
        <div className="bg-white rounded-lg border border-gray-200 mb-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Detection Configuration</h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Target Detection Class</label>
              <select
                value={settings.targetClass}
                onChange={e => setSettings(s => s ? { ...s, targetClass: e.target.value } : s)}
                className="w-full text-sm border border-gray-200 rounded-md px-3 py-2"
              >
                <option value="person">Person</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">COCO-SSD supports: person, bicycle, car, motorcycle, bus, truck, cat, dog, and more.</p>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">
                Confidence Threshold: {(settings.confidenceThreshold * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="0.95"
                step="0.05"
                value={settings.confidenceThreshold}
                onChange={e => setSettings(s => s ? { ...s, confidenceThreshold: parseFloat(e.target.value) } : s)}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum confidence score to register a detection.</p>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Consecutive Frame Confirmation</label>
              <input
                type="number"
                min="1"
                max="30"
                value={settings.consecutiveFrameConfirmation}
                onChange={e => setSettings(s => s ? { ...s, consecutiveFrameConfirmation: parseInt(e.target.value) || 1 } : s)}
                className="w-32 text-sm border border-gray-200 rounded-md px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">Number of consecutive frames a person must be in the zone before triggering an incident.</p>
            </div>

            <div>
              <label className="block text-sm text-gray-700 mb-1">Incident Cooldown (ms)</label>
              <input
                type="number"
                min="1000"
                max="120000"
                step="1000"
                value={settings.cooldownMs}
                onChange={e => setSettings(s => s ? { ...s, cooldownMs: parseInt(e.target.value) || 10000 } : s)}
                className="w-40 text-sm border border-gray-200 rounded-md px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">Minimum time between incidents for the same zone to prevent duplicates.</p>
            </div>
          </div>
        </div>

        {/* Severity rules */}
        <div className="bg-white rounded-lg border border-gray-200 mb-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Severity Rules</h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">High Severity Threshold (seconds in zone)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={settings.severityRules.high}
                onChange={e => setSettings(s => s ? { ...s, severityRules: { ...s.severityRules, high: parseInt(e.target.value) || 5 } } : s)}
                className="w-32 text-sm border border-gray-200 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Critical Severity Threshold (seconds in zone)</label>
              <input
                type="number"
                min="1"
                max="120"
                value={settings.severityRules.critical}
                onChange={e => setSettings(s => s ? { ...s, severityRules: { ...s.severityRules, critical: parseInt(e.target.value) || 15 } } : s)}
                className="w-32 text-sm border border-gray-200 rounded-md px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Evidence */}
        <div className="bg-white rounded-lg border border-gray-200 mb-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Evidence & Retention</h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Evidence Retention (days)</label>
              <input
                type="number"
                min="1"
                max="365"
                value={settings.evidenceRetentionDays}
                onChange={e => setSettings(s => s ? { ...s, evidenceRetentionDays: parseInt(e.target.value) || 30 } : s)}
                className="w-32 text-sm border border-gray-200 rounded-md px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">Evidence images are stored with incidents in IndexedDB.</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-md hover:bg-blue-800"
          >
            <Save className="w-4 h-4" />
            Save Settings
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          {saved && <span className="text-sm text-green-600">✓ Saved</span>}
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-lg border border-red-200">
          <div className="px-4 py-3 border-b border-red-100">
            <h3 className="text-sm font-semibold text-red-700">Danger Zone</h3>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 mb-3">Permanently delete all application data including sources, zones, incidents, and detection records.</p>
            <button
              onClick={handleClearData}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-700 text-sm font-medium rounded-md hover:bg-red-100 border border-red-200"
            >
              <Trash2 className="w-4 h-4" />
              Delete All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
