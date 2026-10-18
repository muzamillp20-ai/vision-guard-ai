import { useEffect, useState } from 'react';
import { getAuditLog, type AuditEntry } from '../services/audit';
import { ScrollText, Filter } from 'lucide-react';

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterResource, setFilterResource] = useState('');

  useEffect(() => {
    loadEntries();
  }, [filterAction, filterResource]);

  async function loadEntries() {
    setLoading(true);
    const data = await getAuditLog({
      action: filterAction || undefined,
      resourceType: filterResource || undefined,
      limit: 100,
    });
    setEntries(data);
    setLoading(false);
  }

  const actions = [...new Set(entries.map(e => e.action))];
  const resources = [...new Set(entries.map(e => e.resourceType).filter(Boolean))];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center gap-3">
        <Filter className="w-4 h-4 text-gray-500" />
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5"
        >
          <option value="">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={filterResource}
          onChange={e => setFilterResource(e.target.value)}
          className="text-sm border border-gray-200 rounded-md px-2.5 py-1.5"
        >
          <option value="">All Resources</option>
          {resources.map(r => <option key={r} value={r!}>{r}</option>)}
        </select>
        <span className="text-xs text-gray-500 ml-auto">{entries.length} entries</span>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-gray-500">Loading audit log…</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <ScrollText className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-sm text-gray-500">No audit entries recorded yet.</p>
            <p className="text-xs text-gray-400 mt-1">Actions will be logged as users interact with the system.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Timestamp</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Actor</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Action</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Resource</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">
                    {entry.actorEmail || <span className="text-gray-400">System</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{entry.action}</code>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">
                    {entry.resourceType ? (
                      <span className="text-xs">{entry.resourceType}{entry.resourceId ? `:${entry.resourceId.slice(0, 8)}` : ''}</span>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 text-xs max-w-xs truncate">{entry.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
