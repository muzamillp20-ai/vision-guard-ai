import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db';
import type { Incident, MonitoringSession, VideoSource } from '../types';
import { Video, AlertTriangle, Camera, Clock, ArrowRight, Shield } from 'lucide-react';

export default function OverviewPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [sessions, setSessions] = useState<MonitoringSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [inc, src, sess] = await Promise.all([
        db.incidents.orderBy('timestamp').reverse().limit(5).toArray(),
        db.sources.toArray(),
        db.monitoringSessions.orderBy('startedAt').reverse().limit(5).toArray(),
      ]);
      setIncidents(inc);
      setSources(src);
      setSessions(sess);
    } finally {
      setLoading(false);
    }
  }

  const activeSessions = sessions.filter(s => s.status === 'running');
  const newIncidents = incidents.filter(i => i.status === 'new');

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-gray-500">Loading overview…</p>
      </div>
    );
  }

  // Empty state - first launch
  if (sources.length === 0 && incidents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-blue-700" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Welcome to VisionGuard AI</h2>
          <p className="text-sm text-gray-600 mb-6">
            Intelligent visual safety monitoring powered by real-time computer vision.
            Set up your first monitoring source to begin detecting safety events.
          </p>
          <Link
            to="/sources"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 text-white text-sm font-medium rounded-md hover:bg-blue-800 transition-colors"
          >
            <Camera className="w-4 h-4" />
            Configure Monitoring Source
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* KPI Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Active Sessions"
          value={activeSessions.length}
          icon={<Video className="w-4 h-4 text-blue-600" />}
        />
        <KpiCard
          label="Total Sources"
          value={sources.length}
          icon={<Camera className="w-4 h-4 text-gray-600" />}
        />
        <KpiCard
          label="New Incidents"
          value={newIncidents.length}
          icon={<AlertTriangle className="w-4 h-4 text-amber-600" />}
          accent={newIncidents.length > 0}
        />
        <KpiCard
          label="Total Incidents"
          value={incidents.length}
          icon={<Clock className="w-4 h-4 text-gray-600" />}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* Recent Incidents */}
        <div className="col-span-2 bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Recent Incidents</h3>
            <Link to="/incidents" className="text-xs text-blue-700 hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {incidents.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                No incidents recorded yet.
              </div>
            ) : (
              incidents.map(inc => (
                <div key={inc.id} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <SeverityBadge severity={inc.severity} />
                    <div>
                      <p className="text-sm text-gray-900">{inc.explanation}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(inc.timestamp).toLocaleString()} — {inc.sourceName}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={inc.status} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Status */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">System Status</h3>
          </div>
          <div className="p-4 space-y-3">
            <StatusRow label="Model" value="Ready" ok />
            <StatusRow label="Sources" value={`${sources.length} configured`} ok={sources.length > 0} />
            <StatusRow label="Active Sessions" value={`${activeSessions.length}`} ok={false} />
            <StatusRow label="Incidents Today" value={`${incidents.filter(i => new Date(i.timestamp).toDateString() === new Date().toDateString()).length}`} ok />
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent?: boolean }) {
  return (
    <div className={`bg-white rounded-lg border p-4 ${accent ? 'border-amber-200' : 'border-gray-200'}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-50 text-blue-700',
    high: 'bg-amber-50 text-amber-700',
    critical: 'bg-red-50 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[severity] || colors.low}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: 'bg-red-50 text-red-700',
    acknowledged: 'bg-amber-50 text-amber-700',
    resolved: 'bg-green-50 text-green-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  );
}

function StatusRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-green-500' : 'bg-gray-300'}`} />
        <span className="text-sm text-gray-900 font-medium">{value}</span>
      </div>
    </div>
  );
}
