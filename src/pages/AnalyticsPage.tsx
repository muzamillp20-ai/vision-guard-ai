import { useEffect, useState } from 'react';
import { db } from '../db';
import type { Incident } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    db.incidents.orderBy('timestamp').toArray().then(data => {
      setIncidents(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-sm text-gray-500">Loading analytics…</p></div>;
  }

  if (incidents.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <BarChart3 className="w-10 h-10 text-gray-300 mb-3" />
        <p className="text-sm text-gray-500">No analytics data available yet.</p>
        <p className="text-xs text-gray-400 mt-1">Charts will populate once incidents are recorded from actual monitoring sessions.</p>
      </div>
    );
  }

  // Prepare data
  const byDate = incidents.reduce((acc, inc) => {
    const date = new Date(inc.timestamp).toLocaleDateString();
    acc[date] = (acc[date] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const timeSeriesData = Object.entries(byDate).map(([date, count]) => ({ date, count }));

  const bySeverity = Object.values(
    incidents.reduce((acc, inc) => {
      if (!acc[inc.severity]) acc[inc.severity] = { name: inc.severity, value: 0 };
      acc[inc.severity].value++;
      return acc;
    }, {} as Record<string, { name: string; value: number }>)
  );

  const byStatus = Object.values(
    incidents.reduce((acc, inc) => {
      const s = inc.status;
      if (!acc[s]) acc[s] = { name: s, value: 0 };
      acc[s].value++;
      return acc;
    }, {} as Record<string, { name: string; value: number }>)
  );

  const bySource = Object.values(
    incidents.reduce((acc, inc) => {
      if (!acc[inc.sourceName]) acc[inc.sourceName] = { name: inc.sourceName, count: 0 };
      acc[inc.sourceName].count++;
      return acc;
    }, {} as Record<string, { name: string; count: number }>)
  );

  const severityColors: Record<string, string> = {
    low: '#9ca3af',
    medium: '#3b82f6',
    high: '#f59e0b',
    critical: '#ef4444',
  };

  const statusColors: Record<string, string> = {
    open: '#ef4444',
    investigating: '#f59e0b',
    resolved: '#22c55e',
    closed: '#6b7280',
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* Incidents over time */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Incidents Over Time</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={timeSeriesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#1d4ed8" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* By severity */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">By Severity</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={bySeverity} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                {bySeverity.map((entry, i) => (
                  <Cell key={i} fill={severityColors[entry.name] || '#9ca3af'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* By status */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">By Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name, value }) => `${name}: ${value}`}>
                {byStatus.map((entry, i) => (
                  <Cell key={i} fill={statusColors[entry.name] || '#9ca3af'} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* By source */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">By Source</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={bySource}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary stats */}
      <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">Summary</h3>
        <div className="grid grid-cols-5 gap-4">
          <StatCard label="Total Incidents" value={incidents.length} />
          <StatCard label="Open" value={incidents.filter(i => i.status === 'open').length} />
          <StatCard label="Investigating" value={incidents.filter(i => i.status === 'investigating').length} />
          <StatCard label="Resolved" value={incidents.filter(i => i.status === 'resolved').length} />
          <StatCard label="Avg Confidence" value={`${(incidents.reduce((s, i) => s + i.confidence, 0) / incidents.length * 100).toFixed(1)}%`} />
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}
