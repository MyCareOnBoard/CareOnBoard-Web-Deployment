import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import ServicesAvatar from "@/assets/icons/services-avatar.png";

interface PlanOfCareClient {
  id: string;
  fullName: string;
  clientId: string;
  date: string;
  location: string;
  service: string;
  profileImage?: string;
}

// Mock data
const MOCK_CLIENTS: PlanOfCareClient[] = Array.from({ length: 10 }, (_, i) => ({
  id: `client-${i + 1}`,
  fullName: "DR Brooklyn Simmons",
  clientId: `CLT-${1000 + i}`,
  date: "12 January",
  location: "2211B Baker Street",
  service: "Service Name",
  profileImage: undefined,
}));

export default function PlanOfCarePage() {
  const [clients] = useState<PlanOfCareClient[]>(MOCK_CLIENTS);
  const [selectedClient, setSelectedClient] = useState<PlanOfCareClient | null>(null);
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const pageSize = 10;
  const totalPages = Math.ceil(clients.length / pageSize);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleViewPlanOfCare = (client: PlanOfCareClient) => {
    setSelectedClient(client);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedClient(null);
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (page < totalPages) {
      setPage(page + 1);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Plan of Care</h1>
          </div>
          <Button className="bg-[#00B4B8] hover:bg-[#00A0A4] hover:cursor-pointer text-white rounded-full px-6">
            + Manual Timesheet
          </Button>
        </div>

        {/* Plan of Care List */}
        <div className="bg-[#edf1f2] rounded-2xl shadow-sm overflow-hidden">
          <div className="px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900">Plan of care</h2>
            <p className="text-sm text-gray-600 mt-0.5">
              These are your active plan of care
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {clients.map((client) => (
              <div
                key={client.id}
                className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-[#e2eaea] transition-colors items-center"
              >
                {/* Client Info */}
                <div className="col-span-3 flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={client.profileImage || ServicesAvatar} alt={client.fullName} />
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
                      {getInitials(client.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {client.fullName}
                    </p>
                    <p className="text-xs text-gray-500">Client</p>
                  </div>
                </div>

                {/* Date */}
                <div className="col-span-2 flex items-center">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Date</p>
                    <p className="text-sm text-gray-900">{client.date}</p>
                  </div>
                </div>

                {/* Location */}
                <div className="col-span-2 flex items-center">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Location</p>
                    <p className="text-sm text-gray-900">{client.location}</p>
                  </div>
                </div>

                {/* Service */}
                <div className="col-span-3 flex items-center">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Service</p>
                    <p className="text-sm text-gray-900">{client.service}</p>
                  </div>
                </div>

                {/* Action */}
                <div className="col-span-2 flex items-center justify-end">
                  <button
                    onClick={() => handleViewPlanOfCare(client)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-full hover:bg-gray-300 transition-colors hover:cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    View Plan of care
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 px-6 py-4 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePreviousPage}
              disabled={page === 1}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }

                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setPage(pageNum)}
                    className={`h-8 w-8 p-0 ${
                      page === pageNum
                        ? "bg-[#00B4B8] text-white hover:bg-[#00A0A4]"
                        : "text-gray-700"
                    }`}
                  >
                    {pageNum}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNextPage}
              disabled={page === totalPages}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Plan of Care Modal */}
      {showModal && selectedClient && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">Plan of care</h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  Here is a plan o care you can read
                </p>
              </div>
              <div className="flex items-center gap-4 ml-4">
                <div className="flex items-center text-right gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {selectedClient.fullName}
                    </p>
                    <p className="text-xs text-gray-500">Client</p>
                  </div>
                  <Avatar className="h-12 w-12">
                    <AvatarImage 
                      src={selectedClient.profileImage || ServicesAvatar} 
                      alt={selectedClient.fullName} 
                    />
                    <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
                      {getInitials(selectedClient.fullName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-3">
                {/* Placeholder lines to simulate plan of care content */}
                {Array.from({ length: 30 }, (_, i) => (
                  <div
                    key={i}
                    className="h-3 bg-gray-200 rounded"
                    style={{
                      width: i % 5 === 0 ? '100%' : i % 3 === 0 ? '95%' : '98%'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-center px-6 py-4 border-t border-gray-100">
              <button
                onClick={handleCloseModal}
                className="flex items-center gap-2 px-6 py-2 bg-gray-400 text-white text-sm rounded-full hover:bg-gray-500 transition-colors"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
