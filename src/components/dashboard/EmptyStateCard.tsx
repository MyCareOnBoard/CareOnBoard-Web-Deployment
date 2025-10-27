import React from 'react';

export default function EmptyStateCard({ title, description, ctaText, onCta }: { title: string, description: string, ctaText: string, onCta?: () => void }) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-8 flex flex-col items-center text-center">
      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"><path d="M12 2v20" stroke="#94a3b8" strokeWidth="1.5"/><path d="M2 12h20" stroke="#94a3b8" strokeWidth="1.5"/></svg>
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-slate-600 mb-4 max-w-md">{description}</p>
      <div className="mt-2">
        <button onClick={onCta} className="bg-[#00B6B3] text-white px-4 py-2 rounded-md">{ctaText}</button>
      </div>
    </div>
  );
}
