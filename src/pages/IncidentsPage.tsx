import { useEffect, useState } from 'react';
import { db } from '../db';
import { getIncidents, updateIncidentStatus, addIncidentNote, assignIncident } from '../services/incidents';
import { useAuth } from '../contexts/AuthContext';
import type { Incident, IncidentFilter, IncidentStatus, VideoSource } from '../types';
import IncidentForm from '../components/IncidentForm';
import { AlertTriangle, Search, Download, Plus, Eye, X, Clock, User, Tag, MessageSquare } from 'lucide-react';

export default function IncidentsPage() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [sources, setSources] = useState<VideoSource[]>([]);
  const [filters, setFilters] = useState<IncidentFilter>({});
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [noteInput, setNoteInput] = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [inc, src] = await Promise.all([
      getIncidents(),
      db.sources.toArray(),
    ]);
    setIncidents(inc);
    setSources(src);
    setLoading(false);
  }

  async function handleStatusChange(id: string, status: IncidentStatus) {
    await updateIncidentStatus(id, status, user?.displayName || 'Operator', user?.id || null);
    await loadData();
    if (selectedIncident?.id === id) {
      const updated = incidents.find(i => i.id === id);
      if (updated) setSelectedIncident({ ...updated, status });
    }
  }

  async function handleAddNote() {
    if (!selectedIncident || !noteInput.trim()) return;
    await addIncidentNote(selectedIncident.id, noteInput, user?.displayName || 'Operator', user?.id || null);
    setNoteInput('');
    await loadData();
  }

  const filtered = incidents.filter(inc => {
    if (filters.status && inc.status !== filters.status) return false;
    if (filters.severity && inc.severity !== filters.severity) return false;
    if (filters.category && inc.category !== filters.category) return false;
    if (filters.origin && inc.origin !== filters.origin) return false;
    if (filters.sourceId && inc.sourceId !== filters.sourceId) return false;
    if (filters.search) {
      const s = filters.search.toLowerCase();
      const searchable = [inc.title, inc.description, inc.explanation, inc.sourceName, inc.location, ...(inc.tags || [])].join(' ').toLowerCase();
      if (!searchable.includes(s) && !inc.id.toLowerCase().includes(s)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (filters.sortBy) {
      case 'oldest': return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      case 'severity': {
        const order = { critical: 0, high: 1, medium: 2, low: 3 };
        return order[a.severity] - order[b.severity];
      }
      case 'updated': return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      default: return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    }
  });

  function handleExport() {
    const headers = ['ID', 'Title', 'Timestamp', 'Category', 'Severity', 'Status', 'Origin', 'Location', 'Description'];
    const rows = sorted.map(i => [
      i.id, `"${i.title}"`, i.timestamp, i.category, i.severity, i.status, i.origin, `"${i.location}"`, `"${i.description}"`,
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
        {/* Toolbar */}
        <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by title, ID, tag…"
              value={filters.search || ''}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-md"
            />
          </div>
          <select value={filters.status || ''} onChange={e => setFilters(f => ({ ...f, status: (e.target.value || undefined) as any }))} className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5">
            <option value="">All Statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select value={filters.severity || ''} onChange={e => setFilters(f => ({ ...f, severity: (e.target.value || undefined) as any }))} className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5">
            <option value="">All Severities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
          <select value={filters.category || ''} onChange={e => setFilters(f => ({ ...f, category: (e.target.value || undefined) as any }))} className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5">
            <option value="">All Categories</option>
            <option value="Zone Intrusion">Zone Intrusion</option>
            <option value="Safety Violation">Safety Violation</option>
            <option value="Unauthorized Access">Unauthorized Access</option>
            <option value="Equipment Hazard">Equipment Hazard</option>
            <option value="Environmental">Environmental</option>
            <option value="PPE Violation">PPE Violation</option>
            <option value="Other">Other</option>
          </select>
          <select value={filters.origin || ''} onChange={e => setFilters(f => ({ ...f, origin: (e.target.value || undefined) as any }))} className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5">
            <option value="">All Origins</option>
            <option value="manual">Manual</option>
            <option value="ai_detected">AI Detected</option>
          </select>
          <select value={filters.sortBy || 'newest'} onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value as any }))} className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="severity">By Severity</option>
            <option value="updated">Recently Updated</option>
          </select>
          <button onClick={handleExport} disabled={sorted.length === 0} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50">
            <Download className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-700 text-white rounded-md hover:bg-blue-800"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Incident
          </button>
          <span className="text-xs text-gray-500 ml-auto">{sorted.length} incident{sorted.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <AlertTriangle className="w-10 h-10 text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">No incidents recorded yet.</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">Create your first incident or wait for AI-detected events.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-700 text-white rounded-md hover:bg-blue-800"
              >
                <Plus className="w-4 h-4" />
                Create First Incident
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Title</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Time</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Category</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Severity</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Origin</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Evidence</th>
                  <th className="text-left px-4 py-2.5 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sorted.map(inc => (
                  <tr key={inc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <p className="text-gray-900 font-medium truncate max-w-xs">{inc.title}</p>
                      <p className="text-xs text-gray-500 truncate max-w-xs">{inc.location || inc.sourceName}</p>
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap text-xs">{new Date(inc.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-gray-700 text-xs">{inc.category}</td>
                    <td className="px-4 py-2.5"><SeverityBadge severity={inc.severity} /></td>
                    <td className="px-4 py-2.5"><StatusBadge status={inc.status} /></td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${inc.origin === 'ai_detected' ? 'bg-purple-50 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                        {inc.origin === 'ai_detected' ? 'AI' : 'Manual'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {inc.evidenceRef || inc.evidenceItems?.length > 0 ? (
                        <span className="text-green-600 text-xs">✓ {inc.evidenceItems?.length || 1}</span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => setSelectedIncident(inc)} className="p-1 hover:bg-gray-100 rounded" title="View details">
                        <Eye className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail Panel */}
      {selectedIncident && (
        <div className="w-96 border-l border-gray-200 bg-white overflow-auto flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
            <h3 className="text-sm font-semibold text-gray-900">Incident Detail</h3>
            <button onClick={() => setSelectedIncident(null)} className="text-xs text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-3">
            <div>
              <p className="text-xs text-gray-500">Title</p>
              <p className="text-sm text-gray-900 font-medium">{selectedIncident.title}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-gray-500">ID</p><p className="text-xs text-gray-700 font-mono">{selectedIncident.id.slice(0, 8)}</p></div>
              <div><p className="text-xs text-gray-500">Status</p><StatusBadge status={selectedIncident.status} /></div>
              <div><p className="text-xs text-gray-500">Severity</p><SeverityBadge severity={selectedIncident.severity} /></div>
              <div><p className="text-xs text-gray-500">Origin</p><p className="text-xs text-gray-700">{selectedIncident.origin === 'ai_detected' ? 'AI Detected' : 'Manual'}</p></div>
            </div>
            <div><p className="text-xs text-gray-500">Category</p><p className="text-sm text-gray-700">{selectedIncident.category}</p></div>
            <div><p className="text-xs text-gray-500">Location</p><p className="text-sm text-gray-700">{selectedIncident.location || '—'}</p></div>
            <div><p className="text-xs text-gray-500">Timestamp</p><p className="text-sm text-gray-700">{new Date(selectedIncident.timestamp).toLocaleString()}</p></div>
            <div><p className="text-xs text-gray-500">Created By</p><p className="text-sm text-gray-700">{selectedIncident.createdByName}</p></div>
            <div>
              <p className="text-xs text-gray-500">Description</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedIncident.description}</p>
            </div>
            {selectedIncident.tags?.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {selectedIncident.tags.map(t => (
                    <span key={t} className="px-1.5 py-0.5 bg-blue-50 text-blue-700 text-xs rounded">{t}</span>
                  ))}
                </div>
              </div>
            )}
            {selectedIncident.evidenceRef && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Evidence</p>
                <img src={selectedIncident.evidenceRef} alt="Evidence" className="w-full rounded border border-gray-200" />
              </div>
            )}

            {/* Status actions */}
            <div className="pt-2 border-t border-gray-100 space-y-2">
              <p className="text-xs font-medium text-gray-700">Update Status</p>
              <div className="flex flex-wrap gap-1.5">
                {selectedIncident.status !== 'investigating' && (
                  <button onClick={() => handleStatusChange(selectedIncident.id, 'investigating')} className="px-2.5 py-1 text-xs bg-amber-50 text-amber-800 rounded hover:bg-amber-100">
                    Investigating
                  </button>
                )}
                {selectedIncident.status !== 'resolved' && (
                  <button onClick={() => handleStatusChange(selectedIncident.id, 'resolved')} className="px-2.5 py-1 text-xs bg-green-50 text-green-800 rounded hover:bg-green-100">
                    Resolve
                  </button>
                )}
                {selectedIncident.status !== 'closed' && (
                  <button onClick={() => handleStatusChange(selectedIncident.id, 'closed')} className="px-2.5 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                    Close
                  </button>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-700 mb-1.5">Add Note</p>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={noteInput}
                  onChange={e => setNoteInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddNote(); }}
                  placeholder="Add investigation note…"
                  className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded"
                />
                <button onClick={handleAddNote} disabled={!noteInput.trim()} className="px-2.5 py-1.5 text-xs bg-blue-700 text-white rounded disabled:opacity-50">
                  Add
                </button>
              </div>
            </div>

            {/* Activity timeline */}
            {selectedIncident.activity && selectedIncident.activity.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-700 mb-2">Activity</p>
                <div className="space-y-2">
                  {selectedIncident.activity.map(a => (
                    <div key={a.id} className="flex gap-2 text-xs">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      <div>
                        <p className="text-gray-700">{a.details}</p>
                        <p className="text-gray-400">{a.actorName} · {new Date(a.timestamp).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Form Modal */}
      {showCreateForm && (
        <IncidentForm
          onClose={() => setShowCreateForm(false)}
          onCreated={loadData}
          currentUserName={user?.displayName || 'Operator'}
          currentUserId={user?.id || null}
        />
      )}
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
    open: 'bg-red-50 text-red-700',
    investigating: 'bg-amber-50 text-amber-700',
    resolved: 'bg-green-50 text-green-700',
    closed: 'bg-gray-100 text-gray-600',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}
