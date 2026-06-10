import { apiFetch, exportUrl } from '../api.js';
import React, { useState, useEffect, useRef } from 'react';
import DispatchForm from '../components/DispatchForm.jsx';
import DispatchList from '../components/DispatchList.jsx';
import MultiStoreForm from '../components/MultiStoreForm.jsx';

export default function DispatchPage({ supervisor, showToast, onClose }) {
  const [session, setSession] = useState(null);
  const [entries, setEntries] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [showForm, setShowForm] = useState(false);   // single-store form
  const [showMulti, setShowMulti] = useState(false); // multi-store form
  const [formInitial, setFormInitial] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanError, setScanError] = useState('');
  const [loading, setLoading] = useState(true);
  const scannerRef = useRef(null);
  const formRef = useRef(null);
  const scannerDivId = 'qr-reader';

  useEffect(() => {
    loadSession();
    loadDestinations();
  }, []);

  const loadSession = async () => {
    try {
      const res = await apiFetch(`/api/sessions/today?supervisor=${encodeURIComponent(supervisor)}`);
      const data = await res.json();
      setSession(data);
      loadEntries(data.id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startNewDispatch = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/sessions/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supervisor }),
      });
      const data = await res.json();
      setSession(data);
      setEntries([]);
      setShowForm(false);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadEntries = async (sessionId) => {
    const res = await apiFetch(`/api/entries?session_id=${sessionId}`);
    const data = await res.json();
    setEntries(data);
  };

  const loadDestinations = async () => {
    const res = await apiFetch('/api/destinations');
    const data = await res.json();
    setDestinations(data);
  };

  const handleAdded = () => {
    setShowForm(false);
    setShowMulti(false);
    setFormInitial(null);
    setEditEntry(null);
    if (session) loadEntries(session.id);
  };

  const handleDelete = async (id) => {
    await apiFetch(`/api/entries/${id}`, { method: 'DELETE' });
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
        const { Html5QrcodeSupportedFormats } = await import('html5-qrcode');
        await qr.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            formatsToSupport: [
              Html5QrcodeSupportedFormats.QR_CODE,
              Html5QrcodeSupportedFormats.EAN_13,
              Html5QrcodeSupportedFormats.EAN_8,
              Html5QrcodeSupportedFormats.UPC_A,
              Html5QrcodeSupportedFormats.UPC_E,
              Html5QrcodeSupportedFormats.CODE_128,
              Html5QrcodeSupportedFormats.CODE_39,
            ],
          },
          async (decodedText) => {
            stopScanner();
            setShowScanner(false);

            // Try JSON first (our QR codes) — must be an object with item_name
            try {
              const data = JSON.parse(decodedText);
              if (data && typeof data === 'object' && data.item_name) {
                setFormInitial({
                  item_name: data.item_name || '',
                  qty: data.default_qty || '',
                  unit: data.unit || '',
                  destination: '',
                  note: '',
                });
                setShowForm(true);
                return;
              }
            } catch {}

            // Otherwise treat as barcode (GS1/EAN/UPC) — look up in catalog
            try {
              const res = await apiFetch(`/api/items/barcode/${encodeURIComponent(decodedText.trim())}`);
              if (res.ok) {
                const item = await res.json();
                setFormInitial({
                  item_name: item.name,
                  qty: item.default_qty || '',
                  unit: item.default_unit || '',
                  destination: '',
                  note: '',
                });
                setShowForm(true);
              } else {
                // Barcode not in catalog — let them fill manually
                setScanError(`Barcode "${decodedText}" not found in catalog. Add it via Catalog → Edit item → Barcode field.`);
                setShowScanner(true);
              }
            } catch {
              setScanError('Could not look up barcode. Check your connection.');
              setShowScanner(true);
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
    const d = new Date(dateStr);
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
          <div className="mt-3 space-y-2">
            <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-2 text-sm font-medium flex items-center gap-2">
              ✅ Submitted &amp; synced to Google Sheets
            </div>
            <button
              onClick={startNewDispatch}
              className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              + Start New Dispatch
            </button>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!locked && !showForm && !showMulti && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={startScanner}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-4 rounded-2xl flex flex-col items-center gap-1 transition-colors shadow-sm"
          >
            <span className="text-2xl">📷</span>
            <span className="text-xs text-center">Scan QR / Barcode</span>
          </button>
          <button
            onClick={() => { setFormInitial(null); setEditEntry(null); setShowForm(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }}
            className="bg-white hover:bg-amber-50 border-2 border-amber-400 text-amber-700 font-semibold py-4 rounded-2xl flex flex-col items-center gap-1 transition-colors shadow-sm"
          >
            <span className="text-2xl">✏️</span>
            <span className="text-xs text-center">Single Store</span>
          </button>
          <button
            onClick={() => { setShowMulti(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50); }}
            className="bg-white hover:bg-amber-50 border-2 border-amber-400 text-amber-700 font-semibold py-4 rounded-2xl flex flex-col items-center gap-1 transition-colors shadow-sm"
          >
            <span className="text-2xl">🏪</span>
            <span className="text-xs text-center">Multi Store</span>
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
      {/* Single-store form */}
      <div ref={formRef} />
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

      {/* Multi-store form */}
      {showMulti && session && (
        <MultiStoreForm
          sessionId={session.id}
          destinations={destinations}
          onAdded={(msg) => {
            if (session) loadEntries(session.id); // refresh list
            if (msg) showToast(msg);
            // form stays open for next item — reset is handled inside MultiStoreForm
          }}
          onCancel={() => setShowMulti(false)}
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
