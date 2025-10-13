export default function LoginPage() {
  return (
    <div className="w-full rounded-lg bg-white p-8 shadow-md">
      <h1 className="mb-2 text-2xl font-semibold text-slate-900">Welcome back</h1>
      <p className="mb-6 text-sm text-slate-500">Log in to continue to Care On Board.</p>
      <form className="space-y-4">
        <input className="w-full rounded-md border border-slate-200 p-2" placeholder="Email" type="email" />
        <input className="w-full rounded-md border border-slate-200 p-2" placeholder="Password" type="password" />
        <button type="submit" className="w-full rounded-md bg-[#00b4b8] py-2 text-white">Log in</button>
      </form>
    </div>
  );
}

