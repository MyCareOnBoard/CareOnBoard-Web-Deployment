import { DSP } from "../types";

interface ProfileTabProps {
  dsp: DSP;
  onDeactivate: () => void;
  onActivate: () => void;
}

export function ProfileTab({ dsp, onDeactivate, onActivate }: ProfileTabProps) {
  return (<>
    <div className="bg-[#edf1f2] p-6 rounded-lg space-y-6">
      <div className="space-y-4">
        {/* Date of Birth */}
        <div className="flex bg-[#f2f6f7] rounded-lg items-center justify-between py-5 px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">Date of Birth</p>
          </div>
          <p className="text-sm text-gray-900 font-normal">{dsp.dateOfBirth ? new Date(dsp.dateOfBirth).toLocaleDateString() : 'N/A'}</p>
        </div>

        {/* Email */}
        <div className="flex bg-[#f2f6f7] rounded-lg items-center justify-between py-5 px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">Email</p>
          </div>
          <p className="text-sm text-gray-900 font-normal">{dsp.email}</p>
        </div>

        {/* Phone Number */}
        <div className="flex bg-[#f2f6f7] rounded-lg items-center justify-between py-5 px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">Phone number</p>
          </div>
          <p className="text-sm text-gray-900 font-normal">{dsp.phoneNumber || 'N/A'}</p>
        </div>

        {/* Address */}
        <div className="flex bg-[#f2f6f7] rounded-lg items-center justify-between py-5 px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">Address</p>
          </div>
          <p className="text-sm text-gray-900 font-normal">
            {typeof dsp.address === "object" && dsp.address !== null
              ? [(dsp.address as any).address, (dsp.address as any).city, (dsp.address as any).zipCode].filter(Boolean).join(", ") || "N/A"
              : dsp.address || "N/A"}
          </p>
        </div>

        {/* Joining Date */}
        <div className="flex bg-[#f2f6f7] rounded-lg items-center justify-between py-5 px-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">Joining date</p>
          </div>
          <p className="text-sm text-gray-900 font-normal">
            {dsp.createdAt && dsp.createdAt !== '' 
              ? new Date(dsp.createdAt).toLocaleDateString() 
              : dsp.hireDate && dsp.hireDate !== ''
              ? new Date(dsp.hireDate).toLocaleDateString()
              : 'N/A'}
          </p>
        </div>

        {/* Professional Summary */}
        <div className="flex bg-[#f2f6f7] rounded-lg items-start justify-between py-5 px-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">Professional summary</p>
              <p className="text-sm text-gray-900 font-semibold leading-relaxed">
               {dsp.bio || "No professional summary provided."}
              </p>
            </div>
          </div>
        </div>
      </div>

    </div>
      <div className="flex items-center gap-4 ">
        <button className="px-6 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
          Report
        </button>
        {dsp.status === "active" ? (
          <button
            onClick={onDeactivate}
            className="px-6 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
          >
            Deactivate User
          </button>
        ) : (
          <button
            onClick={onActivate}
            className="px-6 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors cursor-pointer"
          >
            Activate User
          </button>
        )}
      </div>
  </>
  );
}
