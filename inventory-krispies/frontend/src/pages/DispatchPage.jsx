import React, { useState, useEffect, useRef } from 'react';
import DispatchForm from '../components/DispatchForm.jsx';
import DispatchList from '../components/DispatchList.jsx';

export default function DispatchPage({ supervisor, showToast, onClose }) {
  const [session, setSession] = useState(null);
  const [entries, setEntries] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formInitial, setFormInitial] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState('');
  const [loading, setLoading] = useState(true);
  const scannerRef = useRef(null);
  const scannerDivId = 'qr-reader';

  useEffect(() => {
    loadSession();
    loadDestinations();
  }, []);

  const loadSession = async () => {
    try {
      const res = await fetch(`/api/sessions/today?supervisor=${encodeURIComponent(supervisor)}`);
      const data = await res.json();
      setSession(data);
      loadEntries(data.id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadEntries = async (sessionId) => {
    const res = await fetch(`/api/entries?session_id=${sessionId}`);
    const data = await res.json();
    setEntries(data);
  };

  const loadDestinations = async () => {
    const res = await fetch('/api/destinations');
    const data = await res.json();
    setDestinations(data);
  };

  const handleAdded = () => {
    setShowForm(false);
    setFormInitial(null);
    setEditEntry(null);
    if (session) loadEntries(session.id);
  };

  const handleDelete = async (id) => {
    await fetch(`/api/entries/${id}`, { method: 'DELETE' });
    showToast('Entry deleted');
    if (session) loadEntries(session.id);
  };

  const handleEdit = (entry) => {
    setEditEntry(entry);
    setFormInitial({
      item_name: entry.item_name,
      qty: entry.qty,
      unit: entry.unit,
      destination: entry.destination,
      note: entry.note,
    });
    setShowForm(true);
  };

  const startScanner = async () => {
    setScanError('');
    setShowScanner(true);
    // Wait for DOM
    setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const qr = new Html5Qrcode(scannerDivId);
        scannerRef.current = qr;
        await qr.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            try {
              const data = JSON.parse(decodedText);
              stopScanner();
              setFormInitial({
                item_name: data.item_name || '',
                qty: data.default_qty || '',
                unit: data.unit || '',
                destination: '',
                note: '',
              });
              setShowForm(true);
              setShowScanner(false);
            } catch {
              setScanError('Invalid QR code data');
            }
          },
          () => {}
        );
      } catch (err) {
        setScanError(
          err?.message?.includes('Permission')
            ? 'Camera permission denied. Please allow camera access and try again.'
            : 'Could not start camera. Please try manually adding the item.'
        );
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {}
      scannerRef.current = null;
    }
  };

  const closeScanner = () => {
    stopScanner();
    setShowScanner(false);
    setScanError('');
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-amber-500 text-lg">Loading session…</div>
      </div>
    );
  }

  const locked = session?.locked === 1;

  return (
    <div className="max-w-lg mx-auto px-4 py-4">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-amber-800">Today's Dispatch</h1>
            <p className="text-sm text-gray-500">{session ? formatDate(session.session_date) : ''}</p>
            <p className="text-sm text-gray-600 mt-0.5">Supervisor: <span className="font-medium">{supervisor}</span></p>
          </div>
          <div className="text-right">
            <div className="bg-amber-100 text-amber-700 font-bold text-xl rounded-full w-12 h-12 flex items-center justify-center">
              {entries.length}
            </div>
            <p className="text-xs text-gray-400 mt-1">items</p>
          </div>
        </div>
        {locked && (
          <div className="mt-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2">
            🔒 This dispatch has been submitted and locked
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!locked && !showForm && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={startScanner}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-4 rounded-2xl flex flex-col items-center gap-1 transition-colors shadow-sm"
          >
            <span className="text-2xl">📷</span>
            <span className="text-sm">Scan QR Code</span>
          </button>
          <button
            onClick={() => { setFormInitial(null); setEditEntry(null); setShowForm(true); }}
            className="bg-white hover:bg-amber-50 border-2 border-amber-400 text-amber-700 font-semibold py-4 rounded-2xl flex flex-col items-center gap-1 transition-colors shadow-sm"
          >
            <span className="text-2xl">✏️</span>
            <span className="text-sm">Add Manually</span>
          </button>
        </div>
      )}

      {/* QR Scanner modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/70 z-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-bold text-gray-800">Scan QR Code</h2>
              <button onClick={closeScanner} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-4">
              {scanError ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">⚠️</div>
                  <p className="text-red-600 text-sm font-medium mb-4">{scanError}</p>
                  <button
                    onClick={closeScanner}
                    className="bg-amber-500 text-white px-6 py-2 rounded-xl font-medium"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div id={scannerDivId} className="w-full rounded-xl overflow-hidden" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && session && (
        <DispatchForm
          initialData={formInitial}
          editEntry={editEntry}
          sessionId={session.id}
          destinations={destinations}
          onAdded={(msg) => { handleAdded(); if (msg) showToast(msg); }}
          onCancel={() => { setShowForm(false); setFormInitial(null); setEditEntry(null); }}
        />
      )}

      {/* Entries list */}
      {session && (
        <DispatchList
          entries={entries}
          locked={locked}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Close dispatch button */}
      {!locked && session && entries.length > 0 && (
        <div className="mt-4 mb-2">
          <button
            onClick={() => onClose(session.id)}
            className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-4 rounded-2xl text-base transition-colors shadow-sm"
          >
            Close &amp; Submit Dispatch
          </button>
        </div>
      )}
    </div>
  );
}
