export default function OnboardingPage() {
  return (
    <div className="w-full rounded-lg bg-white p-10 shadow-md">
      <h1 className="mb-4 text-3xl font-semibold text-slate-900">Onboarding</h1>
      <p className="mb-8 text-base text-slate-600">
        Let’s walk through a few steps to get you ready. Complete each section below to finish onboarding.
      </p>
      <ol className="space-y-4 text-slate-700">
        <li className="flex items-start gap-4">
          <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#00b4b8]/10 text-[#00b4b8]">1</span>
          <div>
            <h2 className="text-lg font-semibold">Verify your profile</h2>
            <p className="text-sm text-slate-500">Confirm personal details and employment preferences.</p>
          </div>
        </li>
        <li className="flex items-start gap-4">
          <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#00b4b8]/10 text-[#00b4b8]">2</span>
          <div>
            <h2 className="text-lg font-semibold">Upload documents</h2>
            <p className="text-sm text-slate-500">Provide required certifications and identification.</p>
          </div>
        </li>
        <li className="flex items-start gap-4">
          <span className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-[#00b4b8]/10 text-[#00b4b8]">3</span>
          <div>
            <h2 className="text-lg font-semibold">Schedule orientation</h2>
            <p className="text-sm text-slate-500">Pick a time to meet with our onboarding specialist.</p>
          </div>
        </li>
      </ol>
    </div>
  );
}

