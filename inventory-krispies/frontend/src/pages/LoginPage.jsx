import React, { useState } from 'react';

export default function LoginPage({ onLogin }) {
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onLogin(trimmed);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🥐</div>
          <h1 className="text-3xl font-bold text-amber-800">Bakery Dispatch</h1>
          <p className="text-gray-500 mt-2">Factory Dispatch Logger</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name (Supervisor)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-amber-400"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-200 text-white font-semibold py-3 rounded-xl text-base transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}
