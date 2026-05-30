import { apiFetch, exportUrl } from '../api.js';
import React, { useState, useEffect, useRef } from 'react';

export default function DispatchForm({ initialData, editEntry, sessionId, destinations, onAdded, onCancel }) {
  const [form, setForm] = useState({
    item_name: '',
    qty: '',
    unit: '',
    destination: '',
    note: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [allItems, setAllItems] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const suggestionsRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    apiFetch('/api/items').then(r => r.json()).then(setAllItems).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialData) {
      setForm({
        item_name: initialData.item_name || '',
        qty: initialData.qty != null ? String(initialData.qty) : '',
        unit: initialData.unit || '',
        destination: initialData.destination || '',
        note: initialData.note || '',
      });
    }
  }, [initialData]);

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }));

  const handleNameChange = (val) => {
    set('item_name', val);
    if (val.trim().length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const q = val.toLowerCase();
    const matched = allItems.filter(item =>
      item.name.toLowerCase().includes(q)
    ).slice(0, 8);
    setSuggestions(matched);
    setShowSuggestions(matched.length > 0);
    setHighlightIndex(-1);
  };

  const selectSuggestion = (item) => {
    setForm(p => ({
      ...p,
      item_name: item.name,
      qty: p.qty || String(item.default_qty),
      unit: p.unit || item.default_unit || '',
    }));
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && highlightIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[highlightIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.item_name.trim() || !form.qty) { setError('Item name and quantity are required'); return; }
    setError('');
    setSaving(true);
    try {
      if (editEntry) {
        const res = await apiFetch(`/api/entries/${editEntry.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            item_name: form.item_name.trim(),
            qty: parseFloat(form.qty),
            unit: form.unit.trim(),
            destination: form.destination,
            note: form.note.trim(),
          }),
        });
        if (!res.ok) throw new Error('Failed to update');
        onAdded(`✓ ${form.item_name.trim()} updated`);
      } else {
        const res = await apiFetch('/api/entries', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            session_id: sessionId,
            item_name: form.item_name.trim(),
            qty: parseFloat(form.qty),
            unit: form.unit.trim(),
            destination: form.destination,
            note: form.note.trim(),
          }),
        });
        if (!res.ok) throw new Error('Failed to add');
        onAdded(`✓ ${form.item_name.trim()} — ${form.qty} ${form.unit} added`);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const highlight = (text, query) => {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-bold text-amber-700">{text.slice(idx, idx + query.length)}</span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-4 mb-4 space-y-3">
      <h2 className="font-semibold text-amber-800 text-base">{editEntry ? 'Edit Entry' : 'Add Item'}</h2>
      {error && <div className="text-red-500 text-sm">{error}</div>}

      {/* Item name with autocomplete */}
      <div className="relative">
        <label className="block text-xs font-medium text-gray-500 mb-1">Item Name *</label>
        <input
          ref={inputRef}
          type="text"
          required
          value={form.item_name}
          onChange={e => handleNameChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onFocus={() => form.item_name && suggestions.length > 0 && setShowSuggestions(true)}
          placeholder="Type to search items…"
          autoComplete="off"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
        {showSuggestions && (
          <ul
            ref={suggestionsRef}
            className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden"
          >
            {suggestions.map((item, i) => (
              <li
                key={item.id}
                onMouseDown={() => selectSuggestion(item)}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer text-sm border-b border-gray-50 last:border-0 ${
                  i === highlightIndex ? 'bg-amber-50' : 'hover:bg-gray-50'
                }`}
              >
                <span className="text-gray-800">{highlight(item.name, form.item_name)}</span>
                <span className="text-xs text-gray-400 ml-3 shrink-0">{item.default_qty} {item.default_unit} · {item.category}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Quantity *</label>
          <input
            type="number" required min="0.01" step="0.01" value={form.qty}
            onChange={e => set('qty', e.target.value)}
            placeholder="0"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
          <input
            type="text" value={form.unit}
            onChange={e => set('unit', e.target.value)}
            placeholder="pcs / loaf / pkt"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Destination</label>
        <select
          value={form.destination}
          onChange={e => set('destination', e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white"
        >
          <option value="">Select destination</option>
          {destinations.map(d => (
            <option key={d.id} value={d.name}>{d.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Note (optional)</label>
        <input
          type="text" value={form.note}
          onChange={e => set('note', e.target.value)}
          placeholder="Any extra info"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-white font-semibold py-3 rounded-xl transition-colors"
        >
          {saving ? 'Saving…' : editEntry ? 'Update Entry' : 'Add to Dispatch'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-3 text-gray-500 hover:text-gray-700 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
