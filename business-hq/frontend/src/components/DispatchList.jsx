import React from 'react';

export default function DispatchList({ entries, locked, onEdit, onDelete }) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <div className="text-4xl mb-2">📭</div>
        <p>No items added yet</p>
        <p className="text-sm mt-1">Scan a QR code or add manually</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b bg-amber-50 flex items-center justify-between">
        <h2 className="font-semibold text-amber-800 text-sm">Dispatch Entries</h2>
        <span className="text-xs text-gray-400">{entries.length} items</span>
      </div>
      <div className="divide-y divide-gray-100">
        {entries.map((entry) => (
          <div key={entry.id} className="px-4 py-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-800 text-sm leading-snug">{entry.item_name}</div>
              <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-x-2">
                <span className="font-semibold text-amber-600">{entry.qty} {entry.unit}</span>
                {entry.destination && <span>→ {entry.destination}</span>}
                {entry.note && <span className="italic text-gray-400">{entry.note}</span>}
              </div>
            </div>
            {!locked && (
              <div className="flex gap-1 flex-shrink-0">
                <button
                  onClick={() => onEdit(entry)}
                  className="text-blue-500 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors"
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onDelete(entry.id)}
                  className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors"
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
