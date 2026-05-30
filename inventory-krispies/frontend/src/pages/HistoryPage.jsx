import { apiFetch, exportUrl } from '../api.js';
import React, { useState, useEffect } from 'react';

export default function HistoryPage({ showToast }) {
  const [sessions, setSessions] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [entries, setEntries] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch('/api/sessions')
      .then(r => r.json())
      .then(data => { setSessions(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const toggleExpand = async (id) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!entries[id]) {
      const res = await apiFetch(`/api/entries?session_id=${id}`);
      const data = await res.json();
      setEntries(prev => ({ ...prev, [id]: data }));
    }
  };

  const handleExport = (id) => {
    window.open(exportUrl(`/api/sessions/${id}/export`), '_blank');
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-amber-500">Loading…</div>;
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <h1 className="text-xl font-bold text-amber-800 mb-4">Dispatch History</h1>
      {sessions.length === 0 && (
        <div className="text-center py-12 text-gray-400">No dispatch sessions yet</div>
      )}
      <div className="space-y-3">
        {sessions.map(s => (
          <div key={s.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <button
              onClick={() => toggleExpand(s.id)}
              className="w-full text-left p-4 flex items-center justify-between hover:bg-amber-50 transition-colors"
            >
              <div>
                <div className="font-semibold text-gray-800">{formatDate(s.session_date)}</div>
                <div className="text-sm text-gray-500 mt-0.5">
                  {s.supervisor_name} · {s.entry_count} items
                  {s.locked ? <span className="ml-2 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Submitted</span>
                    : <span className="ml-2 bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full font-medium">Open</span>}
                </div>
              </div>
              <span className="text-gray-400 text-lg">{expanded === s.id ? '▲' : '▼'}</span>
            </button>

            {expanded === s.id && (
              <div className="border-t">
                <div className="px-4 pt-2 pb-1 flex justify-end">
                  <button
                    onClick={() => handleExport(s.id)}
                    className="text-xs text-amber-600 font-medium hover:underline"
                  >
                    ⬇️ Export CSV
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                      <tr>
                        <th className="text-left px-4 py-2">Item</th>
                        <th className="text-right px-4 py-2">Qty</th>
                        <th className="text-left px-4 py-2">Dest.</th>
                        <th className="text-left px-4 py-2">Note</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(entries[s.id] || []).map((e, i) => (
                        <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-2 font-medium">{e.item_name}</td>
                          <td className="px-4 py-2 text-right text-gray-600">{e.qty} {e.unit}</td>
                          <td className="px-4 py-2 text-gray-500">{e.destination || '—'}</td>
                          <td className="px-4 py-2 text-gray-400 text-xs">{e.note || ''}</td>
                        </tr>
                      ))}
                      {(entries[s.id] || []).length === 0 && (
                        <tr><td colSpan={4} className="text-center py-4 text-gray-400">No entries</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
