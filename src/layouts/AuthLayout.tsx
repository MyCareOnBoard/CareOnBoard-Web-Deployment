import { Outlet } from "react-router";

export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-[#eef4f5] to-white">
      <header className="flex items-center justify-between px-10 py-6">
        <div className="text-2xl font-semibold text-[#10141a]">Care On Board</div>
        <nav className="space-x-4 text-sm text-[#4f4f4f]">
          <a href="#" className="hover:text-[#00b4b8]">Support</a>
          <a href="#" className="hover:text-[#00b4b8]">Contact</a>
        </nav>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl">
          <Outlet />
        </div>
      </main>
      <footer className="px-10 py-6 text-sm text-[#808081]">© {new Date().getFullYear()} Care On Board. All rights reserved.</footer>
    </div>
  );
}

