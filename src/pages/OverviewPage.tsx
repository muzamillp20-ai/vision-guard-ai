import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../db';
import { getIncidents } from '../services/incidents';
import { useAuth } from '../contexts/AuthContext';
import type { Incident, MonitoringSession, VideoSource } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar } from 'recharts';
import { Video, AlertTriangle, Camera, Clock, ArrowRight, Shield, Plus, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react';

export default function OverviewPage() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [sessions, setSessions] = useState<MonitoringSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [inc, src, sess] = await Promise.all([
        getIncidents(),
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

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-sm text-gray-500">Loading overview…</p></div>;
  }

  const activeSessions = sessions.filter(s => s.status === 'running');
  const openIncidents = incidents.filter(i => i.status === 'open' || i.status === 'investigating');
  const criticalIncidents = incidents.filter(i => i.severity === 'critical' || i.severity === 'high');
  const resolvedIncidents = incidents.filter(i => i.status === 'resolved' || i.status === 'closed');
  const recentIncidents = incidents.slice(0, 5);

  // Chart data
  const severityData = [
    { name: 'Low', value: incidents.filter(i => i.severity === 'low').length, color: '#9ca3af' },
    { name: 'Medium', value: incidents.filter(i => i.severity === 'medium').length, color: '#3b82f6' },
    { name: 'High', value: incidents.filter(i => i.severity === 'high').length, color: '#f59e0b' },
    { name: 'Critical', value: incidents.filter(i => i.severity === 'critical').length, color: '#ef4444' },
  ].filter(d => d.value > 0);

  const statusData = [
    { name: 'Open', value: incidents.filter(i => i.status === 'open').length, color: '#ef4444' },
    { name: 'Investigating', value: incidents.filter(i => i.status === 'investigating').length, color: '#f59e0b' },
    { name: 'Resolved', value: incidents.filter(i => i.status === 'resolved').length, color: '#22c55e' },
    { name: 'Closed', value: incidents.filter(i => i.status === 'closed').length, color: '#6b7280' },
  ].filter(d => d.value > 0);

  const originData = [
    { name: 'Manual', value: incidents.filter(i => i.origin === 'manual').length, color: '#6366f1' },
    { name: 'AI Detected', value: incidents.filter(i => i.origin === 'ai_detected').length, color: '#8b5cf6' },
  ].filter(d => d.value > 0);

  // Time series - last 7 days
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const trendData = last7Days.map(date => ({
    date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    count: incidents.filter(i => i.timestamp.slice(0, 10) === date).length,
  }));

  const isAdmin = user?.role === 'admin';
  const greeting = isAdmin ? 'Administrator Dashboard' : 'Safety Operator Dashboard';

  // Empty state
  if (incidents.length === 0 && sources.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-blue-700" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Welcome to VisionGuard AI</h2>
          <p className="text-sm text-gray-600 mb-6">
            Intelligent visual safety monitoring powered by real-time computer vision.
            Set up your first monitoring source or create an incident to get started.
          </p>
          <div className="flex gap-3 justify-center">
            <Link to="/sources" className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-700 text-white text-sm font-medium rounded-md hover:bg-blue-800">
              <Camera className="w-4 h-4" />
              Configure Source
            </Link>
            <Link to="/incidents" className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50">
              <Plus className="w-4 h-4" />
              Create Incident
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {greeting}
          </h2>
          <p className="text-sm text-gray-500">
            Welcome back, {user?.displayName}. Here's your safety monitoring overview.
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/incidents" className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-700 text-white rounded-md hover:bg-blue-800">
            <Plus className="w-3.5 h-3.5" />
            Create Incident
          </Link>
          <Link to="/monitoring" className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            <Video className="w-3.5 h-3.5" />
            Start Monitoring
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Total Incidents"
          value={incidents.length}
          icon={<AlertTriangle className="w-4 h-4 text-blue-600" />}
          link="/incidents"
        />
        <KpiCard
          label="Open Incidents"
          value={openIncidents.length}
          icon={<AlertCircle className="w-4 h-4 text-amber-600" />}
          accent={openIncidents.length > 0}
        />
        <KpiCard
          label="Critical / High"
          value={criticalIncidents.length}
          icon={<AlertTriangle className="w-4 h-4 text-red-600" />}
          accent={criticalIncidents.length > 0}
        />
        <KpiCard
          label="Resolved"
          value={resolvedIncidents.length}
          icon={<CheckCircle className="w-4 h-4 text-green-600" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Incident trend */}
        <div className="col-span-2 bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Incident Trend (Last 7 Days)</h3>
          {incidents.length === 0 ? (
            <EmptyChart message="No incidents recorded yet" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Severity distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">By Severity</h3>
          {severityData.length === 0 ? (
            <EmptyChart message="No data" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={severityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, value }) => `${name}: ${value}`}>
                  {severityData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Status distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">By Status</h3>
          {statusData.length === 0 ? (
            <EmptyChart message="No data" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} label={({ name, value }) => `${name}: ${value}`}>
                  {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Origin comparison */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Incident Origins</h3>
          {originData.length === 0 ? (
            <EmptyChart message="No data" />
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={originData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {originData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* System status */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">System Status</h3>
          <div className="space-y-2.5">
            <StatusRow label="Active Sessions" value={activeSessions.length.toString()} ok={activeSessions.length > 0} />
            <StatusRow label="Configured Sources" value={sources.length.toString()} ok={sources.length > 0} />
            <StatusRow label="Model" value="Ready" ok />
            <StatusRow label="Database" value="Connected" ok />
          </div>
        </div>
      </div>

      {/* Recent incidents */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Recent Incidents</h3>
          <Link to="/incidents" className="text-xs text-blue-700 hover:underline flex items-center gap-1">
            View All <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {recentIncidents.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No incidents recorded yet.
            </div>
          ) : (
            recentIncidents.map(inc => (
              <div key={inc.id} className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <SeverityBadge severity={inc.severity} />
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900 truncate">{inc.title}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(inc.timestamp).toLocaleString()} · {inc.location || inc.sourceName}
                    </p>
                  </div>
                </div>
                <StatusBadge status={inc.status} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, accent, link }: { label: string; value: number; icon: React.ReactNode; accent?: boolean; link?: string }) {
  const content = (
    <div className={`bg-white rounded-lg border p-4 ${accent ? 'border-amber-200' : 'border-gray-200'} ${link ? 'cursor-pointer hover:shadow-sm' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
  return link ? <Link to={link}>{content}</Link> : content;
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    low: 'bg-gray-100 text-gray-700',
    medium: 'bg-blue-50 text-blue-700',
    high: 'bg-amber-50 text-amber-700',
    critical: 'bg-red-50 text-red-700',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[severity] || colors.low}`}>{severity}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: 'bg-red-50 text-red-700',
    investigating: 'bg-amber-50 text-amber-700',
    resolved: 'bg-green-50 text-green-700',
    closed: 'bg-gray-100 text-gray-600',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
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

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[180px]">
      <p className="text-xs text-gray-400">{message}</p>
    </div>
  );
}
