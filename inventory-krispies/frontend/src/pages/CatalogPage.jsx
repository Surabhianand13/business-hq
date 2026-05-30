import { apiFetch, exportUrl } from '../api.js';
import React, { useState, useEffect } from 'react';
import QRPrintPage from '../components/QRPrintPage.jsx';

export default function CatalogPage({ showToast }) {
  const [items, setItems] = useState([]);
  const [destinations, setDestinations] = useState([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [newItem, setNewItem] = useState({ name: '', default_qty: '', default_unit: '', category: '' });
  const [newDest, setNewDest] = useState('');
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    loadItems();
    loadDestinations();
  }, []);

  const loadItems = () =>
    apiFetch('/api/items').then(r => r.json()).then(setItems);

  const loadDestinations = () =>
    apiFetch('/api/destinations').then(r => r.json()).then(setDestinations);

  const handleAddItem = async (e) => {
    e.preventDefault();
    const payload = { ...newItem, default_qty: parseFloat(newItem.default_qty) || null };
    if (editItem) {
      await apiFetch(`/api/items/${editItem.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      showToast('Item updated');
      setEditItem(null);
    } else {
      await apiFetch('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      showToast('Item added');
    }
    setNewItem({ name: '', default_qty: '', default_unit: '', category: '' });
    setShowAddItem(false);
    loadItems();
  };

  const handleEditItem = (item) => {
    setEditItem(item);
    setNewItem({ name: item.name, default_qty: item.default_qty || '', default_unit: item.default_unit || '', category: item.category || '' });
    setShowAddItem(true);
  };

  const handleDeleteItem = async (id) => {
    if (!confirm('Delete this item?')) return;
    await apiFetch(`/api/items/${id}`, { method: 'DELETE' });
    showToast('Item deleted');
    loadItems();
  };

  const handleAddDest = async (e) => {
    e.preventDefault();
    if (!newDest.trim()) return;
    await apiFetch('/api/destinations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newDest.trim() }) });
    setNewDest('');
    showToast('Destination added');
    loadDestinations();
  };

  const handleDeleteDest = async (id) => {
    if (!confirm('Delete this destination?')) return;
    await apiFetch(`/api/destinations/${id}`, { method: 'DELETE' });
    showToast('Destination deleted');
    loadDestinations();
  };

  if (showQR) {
    return <QRPrintPage items={items} onClose={() => setShowQR(false)} />;
  }

  const categories = [...new Set(items.map(i => i.category).filter(Boolean))].sort();

  return (
    <div className="max-w-lg mx-auto px-4 py-4 pb-20">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-amber-800">Catalog</h1>
        <button
          onClick={() => setShowQR(true)}
          className="bg-amber-100 text-amber-700 px-3 py-2 rounded-xl text-sm font-medium hover:bg-amber-200 transition-colors"
        >
          🖨️ Print QR Codes
        </button>
      </div>

      {/* Items section */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-4">
        <div className="p-4 border-b flex items-center justify-between bg-amber-50">
          <h2 className="font-semibold text-amber-800">Items</h2>
          <button
            onClick={() => { setShowAddItem(!showAddItem); setEditItem(null); setNewItem({ name: '', default_qty: '', default_unit: '', category: '' }); }}
            className="bg-amber-500 text-white text-sm px-3 py-1.5 rounded-xl hover:bg-amber-600 transition-colors"
          >
            + Add Item
          </button>
        </div>

        {showAddItem && (
          <form onSubmit={handleAddItem} className="p-4 bg-amber-50 border-b space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className="text-xs text-gray-500 font-medium">Item Name *</label>
                <input
                  type="text" required value={newItem.name}
                  onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="e.g. Croissant"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Default Qty</label>
                <input
                  type="number" step="0.01" min="0" value={newItem.default_qty}
                  onChange={e => setNewItem(p => ({ ...p, default_qty: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="100"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium">Unit</label>
                <input
                  type="text" value={newItem.default_unit}
                  onChange={e => setNewItem(p => ({ ...p, default_unit: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="pcs / loaf / box"
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-gray-500 font-medium">Category</label>
                <input
                  type="text" value={newItem.category}
                  onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mt-0.5 focus:outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="Bread / Pastry / Cake"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="flex-1 bg-amber-500 text-white py-2 rounded-xl text-sm font-semibold hover:bg-amber-600">
                {editItem ? 'Update Item' : 'Add Item'}
              </button>
              <button type="button" onClick={() => { setShowAddItem(false); setEditItem(null); }} className="px-4 text-gray-500 hover:text-gray-700 text-sm">
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-right px-4 py-2">Qty</th>
                <th className="text-left px-4 py-2">Cat.</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={item.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-2 font-medium">{item.name}</td>
                  <td className="px-4 py-2 text-right text-gray-500">{item.default_qty} {item.default_unit}</td>
                  <td className="px-4 py-2 text-gray-400 text-xs">{item.category}</td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => handleEditItem(item)} className="text-blue-500 hover:text-blue-700 text-xs">Edit</button>
                      <button onClick={() => handleDeleteItem(item.id)} className="text-red-400 hover:text-red-600 text-xs">Del</button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={4} className="text-center py-6 text-gray-400">No items</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Destinations section */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-amber-50">
          <h2 className="font-semibold text-amber-800">Destinations</h2>
        </div>
        <div className="p-4">
          <form onSubmit={handleAddDest} className="flex gap-2 mb-3">
            <input
              type="text" value={newDest}
              onChange={e => setNewDest(e.target.value)}
              placeholder="New destination name"
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
            />
            <button type="submit" className="bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-amber-600">Add</button>
          </form>
          <div className="space-y-2">
            {destinations.map(d => (
              <div key={d.id} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-xl">
                <span className="text-sm font-medium">{d.name}</span>
                <button onClick={() => handleDeleteDest(d.id)} className="text-red-400 hover:text-red-600 text-xs">Delete</button>
              </div>
            ))}
            {destinations.length === 0 && <p className="text-center text-gray-400 text-sm py-4">No destinations</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
