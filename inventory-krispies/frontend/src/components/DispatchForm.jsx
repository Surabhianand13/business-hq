import React, { useState, useEffect } from 'react';

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.item_name.trim() || !form.qty) { setError('Item name and quantity are required'); return; }
    setError('');
    setSaving(true);
    try {
      if (editEntry) {
        const res = await fetch(`/api/entries/${editEntry.id}`, {
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
        const res = await fetch('/api/entries', {
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

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-4 mb-4 space-y-3">
      <h2 className="font-semibold text-amber-800 text-base">{editEntry ? 'Edit Entry' : 'Add Item'}</h2>
      {error && <div className="text-red-500 text-sm">{error}</div>}

      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1">Item Name *</label>
        <input
          type="text" required value={form.item_name}
          onChange={e => set('item_name', e.target.value)}
          placeholder="e.g. Sourdough Bread"
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-300"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Quantity *</label>
          <input
            type="number" required min="0.01" step="0.01" value={form.qty}
            onChange={e => set('qty', e.target.value)}
            placeholder="100"
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Unit</label>
          <input
            type="text" value={form.unit}
            onChange={e => set('unit', e.target.value)}
            placeholder="pcs / loaf / box"
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
