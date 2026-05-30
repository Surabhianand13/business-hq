import React, { useEffect, useState } from 'react';

export default function QRPrintPage({ items, onClose }) {
  const [qrDataUrls, setQrDataUrls] = useState({});

  useEffect(() => {
    let cancelled = false;
    const generate = async () => {
      const QRCode = (await import('qrcode')).default;
      const urls = {};
      for (const item of items) {
        const data = JSON.stringify({
          item_id: item.id,
          item_name: item.name,
          default_qty: item.default_qty,
          unit: item.default_unit,
        });
        try {
          urls[item.id] = await QRCode.toDataURL(data, { width: 160, margin: 1 });
        } catch {}
      }
      if (!cancelled) setQrDataUrls(urls);
    };
    generate();
    return () => { cancelled = true; };
  }, [items]);

  return (
    <div className="min-h-screen bg-white p-4">
      <div className="flex items-center justify-between mb-6 print:hidden">
        <h1 className="text-xl font-bold text-amber-800">QR Code Catalog</h1>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="bg-amber-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-amber-600"
          >
            🖨️ Print
          </button>
          <button
            onClick={onClose}
            className="bg-gray-100 text-gray-600 px-4 py-2 rounded-xl font-medium hover:bg-gray-200"
          >
            ← Back
          </button>
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
        {items.map(item => (
          <div key={item.id} className="flex flex-col items-center border border-gray-200 rounded-xl p-3 bg-white">
            {qrDataUrls[item.id] ? (
              <img src={qrDataUrls[item.id]} alt={`QR for ${item.name}`} className="w-32 h-32" />
            ) : (
              <div className="w-32 h-32 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">
                Loading…
              </div>
            )}
            <div className="mt-2 text-center">
              <p className="text-xs font-semibold text-gray-700 leading-tight">{item.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.default_qty} {item.default_unit}</p>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
