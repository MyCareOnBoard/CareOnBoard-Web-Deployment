import {Printer, X} from "lucide-react";
import React from "react";
import AgencyCommunityBasedNote from "@/pages/agency/notes/components/commnityBased";
import {useGetSingleActivityLogQuery} from "@/pages/userPanel/notes/api";


export default function AgencyEditNote(
  {isOpen, setIsOpen, activityLogId}: {
    isOpen: boolean,
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>,
    activityLogId: string | null
  }
) {
  const {data: activityLog, isLoading} = useGetSingleActivityLogQuery(activityLogId!, {
    skip: !activityLogId
  });
  const handleCancel = () => setIsOpen(false);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-transparent bg-opacity-40 backdrop-blur z-60"
      onClick={() => setIsOpen(false)}
    >
      <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
        <div
          className="bg-white rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] relative animate-fadeIn p-6 flex flex-col">
          {/* Header */}
          <div className="flex space-x-3 items-center justify-end mb-3 flex-shrink-0">
            <button
              onClick={handleCancel}
              className="flex items-center space-x-3 cursor-pointer text-white hover:text-gray-600 transition-colors bg-[#B2B2B3] rounded-full px-4 py-3"
              aria-label="Close modal"
            >
              <Printer className="w-6 h-6"/>
              <span>Print</span>
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center space-x-3 cursor-pointer text-white hover:text-gray-600 transition-colors bg-[#B2B2B3] rounded-full px-4 py-3"
              aria-label="Close modal"
            >
              <X className="w-6 h-6"/>
              <span>Close</span>
            </button>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto">
            {
              activityLog?.activityType === 'community-based' && (
                <AgencyCommunityBasedNote
                  activityLogId={activityLogId}
                  isLoading={isLoading}
                  activityLog={activityLog}
                />
              )
            }
          </div>
        </div>
      </div>
    </div>
  )
}