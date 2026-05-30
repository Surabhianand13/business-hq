import React from 'react';

export default function Toast({ message }) {
  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div className="bg-green-600 text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap animate-bounce-in">
        <span>✓</span>
        <span>{message}</span>
      </div>
    </div>
  );
}
