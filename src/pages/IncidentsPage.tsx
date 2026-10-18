import { useEffect, useState } from 'react';
import { db } from '../db';
import { updateIncidentStatus } from '../services/incidents';
import type { Incident, IncidentFilter, VideoSource } from '../types';
import { AlertTriangle, Search, Filter, Download, CheckCircle, Eye } from 'lucide-react';

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [filters, setFilters] = useState<IncidentFilter>({});
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [inc, src] = await Promise.all([
      db.incidents.orderBy('timestamp').reverse().toArray(),
      db.sources.toArray(),
    ]);
    setIncidents(inc);
    setSources(src);
    setLoading(false);
  }

  async function handleStatusChange(id: string, status: Incident['status']) {
    await updateIncidentStatus(id, status);
    setIncidents(prev => prev.map(i => i.id === id ? { ...i, status, updatedAt: new Date().toISOString() } : i));
    if (selectedIncident?.id === id) {
      setSelectedIncident(prev => prev ? { ...prev, status } : null);
    }
  }

  const filtered = incidents.filter(inc => {
    if (filters.status && inc.status !== filters.status) return false;
    if (filters.severity && inc.severity !== filters.severity) return false;
    if (filters.sourceId && inc.sourceId !== filters.sourceId) return false;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      if (!inc.explanation.toLowerCase().includes(s) && !inc.sourceName.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  function handleExport() {
    const headers = ['ID', 'Timestamp', 'Source', 'Type', 'Severity', 'Status', 'Confidence', 'Explanation'];
    const rows = filtered.map(i => [
      i.id, i.timestamp, i.sourceName, i.incidentType, i.severity, i.status,
      (i.confidence * 100).toFixed(1) + '%', `"${i.explanation}"`,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visionguard-incidents-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center"><p className="text-sm text-gray-500">Loading incidents…</p></div>;
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search incidents…"
              value={filters.search || ''}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md"
            />
          </div>
          <select
            value={filters.status || ''}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value as any || undefined }))}
            className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="acknowledged">Acknowledged</option>
            <option value="resolved">Resolved</option>
          </select>
          <select
            value={filters.severity || ''}
            onChange={e => setFilters(f => ({ ...f, severity: e.target.value as any || undefined }))}
            className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5"
          >
            <option value="">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <select
            value={filters.sourceId || ''}
            onChange={e => setFilters(f => ({ ...f, sourceId: e.target.value || undefined }))}
            className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5"
          >
            <option value="">All Sources</option>
            {sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button onClick={handleExport} disabled={filtered.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50">
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <span className="text-xs text-gray-500">{filtered.length} incident{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <AlertTriangle className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No incidents recorded yet.</p>
              <p className="text-xs text-gray-400 mt-1">Incidents will appear here when restricted-zone events are detected.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Timestamp</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Source</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Type</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Severity</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Confidence</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Evidence</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(inc => (
                  <tr key={inc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-900">{new Date(inc.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-gray-700">{inc.sourceName}</td>
                    <td className="px-4 py-2.5 text-gray-700">{inc.incidentType}</td>
                    <td className="px-4 py-2.5"><SeverityBadge severity={inc.severity} /></td>
                    <td className="px-4 py-2.5"><StatusBadge status={inc.status} /></td>
                    <td className="px-4 py-2.5 text-gray-700">{(inc.confidence * 100).toFixed(1)}%</td>
                    <td className="px-4 py-2.5">
                      {inc.evidenceRef ? <span className="text-green-600 text-xs">✓ Available</span> : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setSelectedIncident(inc)} className="p-1 hover:bg-gray-100 rounded" title="View details">
                          <Eye className="w-3.5 h-3.5 text-gray-500" />
                        </button>
                        {inc.status === 'new' && (
                          <button onClick={() => handleStatusChange(inc.id, 'acknowledged')} className="p-1 hover:bg-gray-100 rounded" title="Acknowledge">
                            <CheckCircle className="w-3.5 h-3.5 text-amber-500" />
                          </button>
                        )}
                        {inc.status !== 'resolved' && (
                          <button onClick={() => handleStatusChange(inc.id, 'resolved')} className="px-1.5 py-0.5 text-xs text-green-700 bg-green-50 rounded hover:bg-green-100">
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedIncident && (
        <div className="w-80 border-l border-gray-200 bg-white overflow-auto">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Incident Detail</h3>
            <button onClick={() => setSelectedIncident(null)} className="text-xs text-gray-400 hover:text-gray-600">Close</button>
          </div>
          <div className="p-4 space-y-3">
            <DetailRow label="ID" value={selectedIncident.id.slice(0, 8) + '…'} />
            <DetailRow label="Timestamp" value={new Date(selectedIncident.timestamp).toLocaleString()} />
            <DetailRow label="Source" value={selectedIncident.sourceName} />
            <DetailRow label="Type" value={selectedIncident.incidentType} />
            <DetailRow label="Severity" value={selectedIncident.severity} />
            <DetailRow label="Status" value={selectedIncident.status} />
            <DetailRow label="Confidence" value={`${(selectedIncident.confidence * 100).toFixed(1)}%`} />
            <DetailRow label="Explanation" value={selectedIncident.explanation} />
            <DetailRow label="Notes" value={selectedIncident.operatorNotes || '—'} />
            <DetailRow label="Created" value={new Date(selectedIncident.createdAt).toLocaleString()} />
            <DetailRow label="Updated" value={new Date(selectedIncident.updatedAt).toLocaleString()} />

            {selectedIncident.evidenceRef && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Evidence</p>
                <img src={selectedIncident.evidenceRef} alt="Evidence" className="w-full rounded border border-gray-200" />
              </div>
            )}

            <div className="pt-2 space-y-2">
              {selectedIncident.status === 'new' && (
                <button
                  onClick={() => handleStatusChange(selectedIncident.id, 'acknowledged')}
                  className="w-full px-3 py-2 text-sm bg-amber-50 text-amber-800 rounded-md hover:bg-amber-100 font-medium"
                >
                  Acknowledge
                </button>
              )}
              {selectedIncident.status !== 'resolved' && (
                <button
                  onClick={() => handleStatusChange(selectedIncident.id, 'resolved')}
                  className="w-full px-3 py-2 text-sm bg-green-50 text-green-800 rounded-md hover:bg-green-100 font-medium"
                >
                  Resolve
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm text-gray-900">{value}</p>
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
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[severity] || colors.low}`}>{severity}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: 'bg-red-50 text-red-700',
    acknowledged: 'bg-amber-50 text-amber-700',
    resolved: 'bg-green-50 text-green-700',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}
