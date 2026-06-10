import { apiFetch, exportUrl } from '../api.js';
import React, { useState, useEffect } from 'react';

export default function ClosePage({ sessionId, showToast, onBack, onNewDispatch }) {
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
        apiFetch(`/api/sessions`),
        apiFetch(`/api/entries?session_id=${sessionId}`),
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
      await apiFetch(`/api/sessions/${sessionId}/lock`, { method: 'POST' });
      showToast('✓ Dispatch submitted — synced to Google Sheets');
      loadData();
    } finally {
      setLocking(false);
    }
  };

  const handleExportCSV = () => {
    window.open(exportUrl(`/api/sessions/${sessionId}/export`), '_blank');
  };

  const handleDownloadPDF = (store) => {
    const url = store
      ? exportUrl(`/api/sessions/${sessionId}/pdf?store=${encodeURIComponent(store)}`)
      : exportUrl(`/api/sessions/${sessionId}/pdf`);
    window.open(url, '_blank');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-amber-500">Loading…</div>;
  }

  const locked = session?.locked === 1;

  // Get unique stores that have entries
  const stores = [...new Set(entries.map(e => e.destination).filter(Boolean))].sort();

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="text-amber-600 hover:text-amber-800 text-2xl leading-none">←</button>
        <h1 className="text-xl font-bold text-amber-800">Close Dispatch</h1>
      </div>

      {locked && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-4 text-center">
          <div className="text-3xl mb-1">✅</div>
          <p className="text-green-700 font-semibold text-sm">Submitted &amp; synced to Google Sheets</p>
          <p className="text-green-600 text-xs mt-1">This dispatch is locked — no further edits</p>
        </div>
      )}

      {/* Summary table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
        <div className="p-4 border-b bg-amber-50">
          <h2 className="font-semibold text-amber-800">Summary — {formatDate(session?.session_date)}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {session?.supervisor_name} · {entries.length} item{entries.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-400 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2">Item</th>
                <th className="text-right px-4 py-2">Qty</th>
                <th className="text-left px-4 py-2">Store</th>
                <th className="text-left px-4 py-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{e.item_name}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600 whitespace-nowrap">{e.qty} {e.unit}</td>
                  <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{e.destination || '—'}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">{e.note || ''}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">No entries</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delivery note PDFs — per store */}
      {entries.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
          <h3 className="font-semibold text-gray-800 mb-1">📄 Delivery Notes (PDF)</h3>
          <p className="text-xs text-gray-400 mb-3">One PDF per store — print or share via WhatsApp for signature</p>
          <div className="space-y-2">
            {stores.map(store => (
              <button
                key={store}
                onClick={() => handleDownloadPDF(store)}
                className="w-full flex items-center justify-between bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl transition-colors text-sm font-medium"
              >
                <span>🏪 {store}</span>
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  {entries.filter(e => e.destination === store).length} items · Download PDF ↓
                </span>
              </button>
            ))}
            {stores.length > 1 && (
              <button
                onClick={() => handleDownloadPDF(null)}
                className="w-full flex items-center justify-between bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 px-4 py-3 rounded-xl transition-colors text-sm font-medium"
              >
                <span>📦 All Stores Combined</span>
                <span className="text-xs text-gray-500">Download PDF ↓</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Export & submit buttons */}
      <div className="space-y-3">
        <button
          onClick={handleExportCSV}
          className="w-full bg-white border-2 border-amber-400 text-amber-700 font-semibold py-3 rounded-2xl hover:bg-amber-50 transition-colors"
        >
          ⬇️ Export CSV
        </button>

        {!locked ? (
          <button
            onClick={handleLock}
            disabled={locking || entries.length === 0}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-200 text-white font-bold py-4 rounded-2xl transition-colors text-base"
          >
            {locking ? 'Submitting…' : '📤 Submit & Sync to Google Sheets'}
          </button>
        ) : (
          <button
            onClick={onNewDispatch}
            className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-2xl transition-colors text-base"
          >
            + Start New Dispatch
          </button>
        )}
      </div>
    </div>
  );
}
