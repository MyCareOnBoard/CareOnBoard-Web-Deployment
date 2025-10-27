import React from 'react';
import { Home, FileText, Users } from 'lucide-react';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white h-screen p-6 border-r hidden md:block">
      <div className="mb-6">
        <img src="/cab-logo-color.png" alt="logo" className="w-28" />
      </div>
      <nav className="space-y-2">
        <a className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-100" href="#">
          <Home className="w-4 h-4" /> <span>Overview</span>
        </a>
        <a className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-100" href="#">
          <FileText className="w-4 h-4" /> <span>My Forms</span>
        </a>
        <a className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-100" href="#">
          <Users className="w-4 h-4" /> <span>Team</span>
        </a>
      </nav>
    </aside>
  );
}
