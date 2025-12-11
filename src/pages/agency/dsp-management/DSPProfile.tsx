import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MessageSquare } from "lucide-react";
import ServicesAvatar from "@/assets/icons/services-avatar.png";
import { DSP, Shift, Document } from "./types";
import { SHIFTS_CHART_DATA } from "./mockData";

interface DSPProfileProps {
  dsp: DSP;
  shifts: Shift[];
  documents: Document[];
  onBack: () => void;
  onChatClick: () => void;
}

export function DSPProfile({ dsp, shifts, documents, onBack, onChatClick }: DSPProfileProps) {
  const [activeTab, setActiveTab] = useState<"Activity" | "Shifts" | "Profile">("Activity");
  const [page, setPage] = useState(1);
  const pageSize = 8;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleDeactivateUser = () => {
    console.log("Deactivate user");
  };

  const handleActivateUser = () => {
    console.log("Activate user");
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
      >
        <ChevronLeft className="w-5 h-5" />
        <span className="text-sm font-medium">Back to Directory</span>
      </button>

      {/* Profile Section */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Avatar className="h-24 w-24 border-2 border-gray-200">
            <AvatarImage src={dsp.profileImage || ServicesAvatar} alt={dsp.fullName} />
            <AvatarFallback className="bg-gray-200 text-gray-700 text-lg font-medium">
              {getInitials(dsp.fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{dsp.fullName}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                dsp.status === "Active" 
                  ? "bg-green-100 text-green-700" 
                  : "bg-gray-200 text-gray-700"
              }`}>
                {dsp.status}
              </span>
            </div>
            <p className="text-sm text-gray-600">{dsp.role} · {dsp.age} yrs old</p>
            <button
              onClick={onChatClick}
              className="flex items-center gap-2 mt-3 px-4 py-2 bg-gray-900 text-white text-sm rounded-full hover:bg-gray-800 transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              Chat
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("Activity")}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === "Activity"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            Activity
          </button>
          <button
            onClick={() => setActiveTab("Shifts")}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === "Shifts"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            Shifts
          </button>
          <button
            onClick={() => setActiveTab("Profile")}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-colors ${
              activeTab === "Profile"
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100"
            }`}
          >
            Profile
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "Activity" && (
        <div className="space-y-6">
          {/* Shifts Chart */}
          <div className="border-t pt-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-gray-900">SHIFTS</h3>
                <p className="text-sm text-gray-600">These Are Ongoing Shift Of Dr Brooklyn Simmons</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-gray-600">Scheduled</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-300"></div>
                  <span className="text-xs text-gray-600">Visit Completed</span>
                </div>
              </div>
            </div>

            {/* Chart */}
            <div className="flex items-end justify-between gap-4 h-64">
              {SHIFTS_CHART_DATA.map((data, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end justify-center gap-1 h-48">
                    <div className="relative w-full max-w-10">
                      <div
                        className="bg-blue-500 rounded-t-lg w-full relative"
                        style={{ height: `${(data.scheduled / 35) * 100}%` }}
                      >
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-900">
                          {data.scheduled}
                        </span>
                      </div>
                    </div>
                    <div className="relative w-full max-w-10">
                      <div
                        className="bg-blue-300 rounded-t-lg w-full relative"
                        style={{ height: `${(data.completed / 35) * 100}%` }}
                      >
                        <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-gray-900">
                          {data.completed}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-gray-600">{data.day}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Training Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Training</h3>
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span>Assigned</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-300"></div>
                  <span>Training Completed</span>
                </div>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="flex-1 bg-blue-500 rounded-lg h-8 flex items-center justify-center text-white text-sm font-medium">
                20
              </div>
              <div className="flex-1 bg-blue-300 rounded-lg h-8 flex items-center justify-center text-white text-sm font-medium">
                18
              </div>
            </div>
          </div>

          {/* Documents Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Documents</h3>
                <p className="text-sm text-gray-600">Here are your uploaded documents</p>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-[#00B4B8] text-white text-sm rounded-full hover:bg-[#00A0A4] transition-colors">
                <span className="text-lg">+</span>
                Request new document
              </button>
            </div>

            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-900">{doc.name}</span>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    doc.status === "Available" 
                      ? "bg-green-100 text-green-700"
                      : doc.status === "Draft"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-orange-100 text-orange-700"
                  }`}>
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "Shifts" && (
        <div className="border-t pt-6 space-y-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Shifts</h3>
            <p className="text-sm text-gray-600">These Are Ongoing Shift Of Dr Brooklyn Simmons</p>
          </div>

          <div className="space-y-2">
            {shifts.slice((page - 1) * pageSize, page * pageSize).map((shift) => (
              <div key={shift.id} className="flex items-center justify-between py-4 px-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-4 flex-1">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={shift.clientImage || ServicesAvatar} alt={shift.clientName} />
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
                      {getInitials(shift.clientName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{shift.clientName}</p>
                    <p className="text-xs text-gray-500">Client</p>
                  </div>
                </div>

                <div className="flex items-center gap-8">
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="text-sm text-gray-900">{shift.date}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="text-sm text-gray-900">{shift.location}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Clocked In</p>
                    <p className="text-sm text-gray-900">{shift.clockIn}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Clocked Out</p>
                    <p className="text-sm text-gray-900">{shift.clockOut}</p>
                  </div>
                  <div>
                    <span className="px-3 py-1 rounded-md bg-gray-200 text-gray-700 text-xs font-medium">
                      {shift.duration}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 pt-4">
            <span className="text-sm text-gray-600">{page} / {Math.ceil(shifts.length / pageSize)}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(Math.min(Math.ceil(shifts.length / pageSize), page + 1))}
              disabled={page === Math.ceil(shifts.length / pageSize)}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {activeTab === "Profile" && (
        <div className="border-t pt-6 space-y-6">
          <div className="space-y-0 divide-y divide-gray-200">
            {/* Gender */}
            <div className="flex items-center justify-between py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">Gender</p>
              </div>
              <p className="text-sm text-gray-900 font-normal">{dsp.gender}</p>
            </div>

            {/* Email */}
            <div className="flex items-center justify-between py-5">
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
            <div className="flex items-center justify-between py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">Phone number</p>
              </div>
              <button className="text-sm text-gray-400 hover:text-gray-600">Update Number</button>
            </div>

            {/* Address */}
            <div className="flex items-center justify-between py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">Address</p>
              </div>
              <p className="text-sm text-gray-900 font-normal">{dsp.address}</p>
            </div>

            {/* Joining Date */}
            <div className="flex items-center justify-between py-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">Joining date</p>
              </div>
              <p className="text-sm text-gray-900 font-normal">{dsp.joiningDate}</p>
            </div>

            {/* Professional Summary */}
            <div className="flex items-start justify-between py-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 mb-1">Professional summary</p>
                  <p className="text-sm text-gray-900 leading-relaxed">{dsp.professionalSummary}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 pt-6 border-t">
            <button className="px-6 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors">
              Report
            </button>
            {dsp.status === "Active" ? (
              <button
                onClick={handleDeactivateUser}
                className="px-6 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition-colors"
              >
                Deactivate User
              </button>
            ) : (
              <button
                onClick={handleActivateUser}
                className="px-6 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition-colors"
              >
                Activate User
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
