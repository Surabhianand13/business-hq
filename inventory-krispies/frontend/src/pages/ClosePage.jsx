import React, { useState, useEffect } from 'react';

export default function ClosePage({ sessionId, showToast, onBack }) {
  const [session, setSession] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    loadData();
  }, [sessionId]);

  const loadData = async () => {
    try {
      const [sRes, eRes] = await Promise.all([
        fetch(`/api/sessions`),
        fetch(`/api/entries?session_id=${sessionId}`),
      ]);
      const sessions = await sRes.json();
      const entriesData = await eRes.json();
      setSession(sessions.find(s => s.id === sessionId) || null);
      setEntries(entriesData);
    } finally {
      setLoading(false);
    }
  };

  const handleLock = async () => {
    setLocking(true);
    try {
      await fetch(`/api/sessions/${sessionId}/lock`, { method: 'POST' });
      showToast('✓ Dispatch submitted and locked');
      loadData();
    } finally {
      setLocking(false);
    }
  };

  const handleExport = () => {
    window.open(`/api/sessions/${sessionId}/export`, '_blank');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-amber-500">Loading…</div>;
  }

  const locked = session?.locked === 1;

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-amber-600 hover:text-amber-800 text-2xl">←</button>
        <h1 className="text-xl font-bold text-amber-800">Close Dispatch</h1>
      </div>

      {locked && (
        <div className="bg-green-50 border border-green-300 rounded-2xl p-4 mb-4 text-center">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-green-700 font-semibold">This dispatch has been submitted and locked</p>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
        <div className="p-4 border-b bg-amber-50">
          <h2 className="font-semibold text-amber-800">Dispatch Summary — {session?.session_date}</h2>
          <p className="text-sm text-gray-500">Supervisor: {session?.supervisor_name} · {entries.length} items</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="text-left px-4 py-2">Item</th>
                <th className="text-right px-4 py-2">Qty</th>
                <th className="text-left px-4 py-2">Dest.</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2 font-medium">{e.item_name}</td>
                  <td className="px-4 py-2 text-right text-gray-600">{e.qty} {e.unit}</td>
                  <td className="px-4 py-2 text-gray-500">{e.destination || '—'}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={3} className="text-center py-6 text-gray-400">No entries</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={handleExport}
          className="w-full bg-white border-2 border-amber-400 text-amber-700 font-semibold py-3 rounded-2xl hover:bg-amber-50 transition-colors"
        >
          ⬇️ Export CSV
        </button>
        {!locked && (
          <button
            onClick={handleLock}
            disabled={locking || entries.length === 0}
            className="w-full bg-red-500 hover:bg-red-600 disabled:bg-red-200 text-white font-bold py-4 rounded-2xl transition-colors"
          >
            {locking ? 'Submitting…' : '🔒 Submit & Lock Dispatch'}
          </button>
        )}
      </div>
    </div>
  );
}
