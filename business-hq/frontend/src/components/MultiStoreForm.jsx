import { apiFetch } from '../api.js';
import React, { useState, useEffect, useRef } from 'react';

export default function MultiStoreForm({ sessionId, destinations, onAdded, onCancel }) {
  const [itemName, setItemName] = useState('');
  const [unit, setUnit] = useState('');
  const [note, setNote] = useState('');
  const [stores, setStores] = useState({}); // { destName: { checked, qty } }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [allItems, setAllItems] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const inputRef = useRef(null);

  useEffect(() => {
    apiFetch('/api/items').then(r => r.json()).then(setAllItems).catch(() => {});
  }, []);

  // Init store rows from destinations
  useEffect(() => {
    const initial = {};
    destinations.forEach(d => { initial[d.name] = { checked: false, qty: '' }; });
    setStores(initial);
  }, [destinations]);

  const handleNameChange = (val) => {
    setItemName(val);
    if (!val.trim()) { setSuggestions([]); setShowSuggestions(false); return; }
    const q = val.toLowerCase();
    const matched = allItems.filter(i => i.name.toLowerCase().includes(q)).slice(0, 8);
    setSuggestions(matched);
    setShowSuggestions(matched.length > 0);
    setHighlightIndex(-1);
  };

  const selectSuggestion = (item) => {
    setItemName(item.name);
    setUnit(item.default_unit || '');
    // Pre-fill qty for all currently checked stores
    setStores(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (next[k].checked && !next[k].qty) {
          next[k] = { ...next[k], qty: String(item.default_qty || '') };
        }
      });
      return next;
    });
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIndex(i => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(i => Math.max(i - 1, -1)); }
    else if (e.key === 'Enter' && highlightIndex >= 0) { e.preventDefault(); selectSuggestion(suggestions[highlightIndex]); }
    else if (e.key === 'Escape') setShowSuggestions(false);
  };

  const toggleStore = (name) => {
    setStores(prev => {
      const current = prev[name];
      const nowChecked = !current.checked;
      // Auto-fill qty from default if item selected
      let qty = current.qty;
      if (nowChecked && !qty) {
        const item = allItems.find(i => i.name.toLowerCase() === itemName.toLowerCase());
        if (item) qty = String(item.default_qty || '');
      }
      return { ...prev, [name]: { checked: nowChecked, qty: nowChecked ? qty : '' } };
    });
  };

  const setQty = (name, val) => {
    setStores(prev => ({ ...prev, [name]: { ...prev[name], qty: val } }));
  };

  const checkedStores = Object.entries(stores).filter(([, v]) => v.checked && v.qty);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!itemName.trim()) { setError('Item name is required'); return; }
    if (checkedStores.length === 0) { setError('Select at least one store with a quantity'); return; }
    setError('');
    setSaving(true);
    try {
      await Promise.all(
        checkedStores.map(([dest, { qty }]) =>
          apiFetch('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              session_id: sessionId,
              item_name: itemName.trim(),
              qty: parseFloat(qty),
              unit: unit.trim(),
              destination: dest,
              note: note.trim(),
            }),
          })
        )
      );
      const msg = `✓ ${itemName.trim()} — added to ${checkedStores.length} store${checkedStores.length > 1 ? 's' : ''}`;
      // Reset form for next item — stay open so they can add more
      setItemName('');
      setUnit('');
      setNote('');
      const reset = {};
      destinations.forEach(d => { reset[d.name] = { checked: false, qty: '' }; });
      setStores(reset);
      onAdded(msg);
    } catch {
      setError('Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const highlight = (text, query) => {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (<>{text.slice(0, idx)}<span className="font-bold text-amber-700">{text.slice(idx, idx + query.length)}</span>{text.slice(idx + query.length)}</>);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-4 mb-4 space-y-4">
      <h2 className="font-semibold text-amber-800 text-base">Add to Multiple Stores</h2>
      {error && <div className="text-red-500 text-sm">{error}</div>}

      {/* Item name with autocomplete */}
      <div className="relative">
        <label className="block text-xs font-medium text-gray-500 mb-1">Item Name *</label>
        <input
          ref={inputRef}
          type="text" required value={itemName}
          onChange={e => handleNameChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onFocus={() => itemName && suggestions.length > 0 && setShowSuggestions(true)}
          placeholder="Type to search items…"
          autoComplete="off"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
        {showSuggestions && (
          <ul className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
            {suggestions.map((item, i) => (
              <li key={item.id} onMouseDown={() => selectSuggestion(item)}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer text-sm border-b border-gray-50 last:border-0 ${i === highlightIndex ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
                <span className="text-gray-800">{highlight(item.name, itemName)}</span>
                <span className="text-xs text-gray-400 ml-3 shrink-0">{item.default_qty} {item.default_unit} · {item.category}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Unit */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
        <input
          type="text" value={unit} onChange={e => setUnit(e.target.value)}
          placeholder="pcs / loaf / pkt"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>

      {/* Store rows */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">Select Stores & Quantities</label>
        <div className="space-y-2">
          {destinations.map(d => {
            const s = stores[d.name] || { checked: false, qty: '' };
            return (
              <div key={d.name}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors ${s.checked ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
                <button
                  type="button"
                  onClick={() => toggleStore(d.name)}
                  className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${s.checked ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-300 bg-white'}`}
                >
                  {s.checked && <span className="text-xs font-bold">✓</span>}
                </button>
                <span
                  className={`flex-1 text-sm font-medium cursor-pointer ${s.checked ? 'text-amber-800' : 'text-gray-600'}`}
                  onClick={() => toggleStore(d.name)}
                >
                  {d.name}
                </span>
                <input
                  type="number" min="0.01" step="0.01"
                  value={s.qty}
                  onChange={e => { if (!s.checked) toggleStore(d.name); setQty(d.name, e.target.value); }}
                  onFocus={() => { if (!s.checked) toggleStore(d.name); }}
                  placeholder="Qty"
                  className={`w-20 border rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-amber-300 transition-colors ${s.checked ? 'border-amber-300 bg-white' : 'border-gray-200 bg-white text-gray-400'}`}
                />
              </div>
            );
          })}
        </div>
        {checkedStores.length > 0 && (
          <p className="text-xs text-amber-600 mt-2 font-medium">
            {checkedStores.length} store{checkedStores.length > 1 ? 's' : ''} selected
          </p>
        )}
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Note (optional)</label>
        <input
          type="text" value={note} onChange={e => setNote(e.target.value)}
          placeholder="Any extra info"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit" disabled={saving || checkedStores.length === 0}
          className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {saving ? 'Adding…' : `Add to Dispatch${checkedStores.length > 0 ? ` — ${checkedStores.length} store${checkedStores.length > 1 ? 's' : ''}` : ''}`}
        </button>
        <button
          type="button" onClick={onCancel}
          className="px-5 py-3 text-gray-500 hover:text-gray-700 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
