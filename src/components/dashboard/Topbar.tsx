import React from 'react';
import { Bell, User2 } from 'lucide-react';

export default function Topbar({ title = 'Dashboard' }: { title?: string }) {
  return (
    <div className="flex items-center justify-between w-full px-4 py-3 bg-white/60 backdrop-blur-sm rounded-lg">
      <div className="flex items-center gap-4">
        <button className="text-sm text-slate-600">☰</button>
        <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-md hover:bg-slate-100">
          <Bell className="w-5 h-5 text-slate-600" />
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-medium leading-none text-white bg-red-600 rounded-full">3</span>
        </button>

        <div className="flex items-center gap-2 p-2 rounded-md hover:bg-slate-50">
          <img src="/avatar-placeholder.png" alt="avatar" className="w-8 h-8 rounded-full" />
          <span className="text-sm font-medium text-slate-700">Ronald</span>
          <User2 className="w-4 h-4 text-slate-600" />
        </div>
      </div>
    </div>
  );
}
