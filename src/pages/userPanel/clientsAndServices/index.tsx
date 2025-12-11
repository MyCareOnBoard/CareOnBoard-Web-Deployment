import { useState, useEffect } from "react";
import { listClients, type Client } from "@/lib/api/clients";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Check, X } from "lucide-react";
import { toast } from "sonner";
import ExpandIcon from "@/assets/icons/arrow-expand-01.svg?react";
import ServicesAvatar from "@/assets/icons/services-avatar.png";

export default function ClientsAndServicesPage() {
  const [pendingClients, setPendingClients] = useState<Client[]>([]);
  const [pastClients, setPastClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [workAvailability, setWorkAvailability] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [acceptedClientName, setAcceptedClientName] = useState("");
  const [pendingExpanded, setPendingExpanded] = useState(true);
  const [pastExpanded, setPastExpanded] = useState(true);
  const pageSize = 10;

  useEffect(() => {
    loadClients();
  }, [page]);

  const loadClients = async () => {
    try {
      setLoading(true);
      
      // Fetch all clients (both pending and active/past)
      const allClients = await listClients({
        limit: 100, // Get more clients to properly filter
      });
      
      // Filter by status
      const pending = allClients.filter(c => c.status === 'pending');
      const past = allClients.filter(c => c.status !== 'pending' && c.status !== undefined);
      
      setPendingClients(pending);
      setPastClients(past);
      setTotalPages(Math.ceil(past.length / pageSize));
    } catch (error: any) {      toast.error("Failed to load clients", {
        description: error.message || "Please try again later",
      });
    } finally {
      setLoading(false);
    }
  };

  const getClientName = (client: Client) => {
    if (client.firstName && client.lastName) {
      return `${client.firstName} ${client.lastName}`;
    }
    return client.id;
  };

  const getInitials = (client: Client) => {
    const name = getClientName(client);
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAccept = (client: Client) => {
    setAcceptedClientName(getClientName(client));
    setShowAcceptModal(true);
    
    // Remove from pending and add to past
    setPendingClients(prev => prev.filter(c => c.id !== client.id));
    setPastClients(prev => [...prev, { ...client, status: 'active' }]);
    
    // Auto close modal after 3 seconds
    setTimeout(() => {
      setShowAcceptModal(false);
    }, 3000);
  };

  const handleReject = (clientId: string) => {
    setPendingClients(prev => prev.filter(c => c.id !== clientId));
    toast.success("Client request rejected");
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
    <div className="min-h-screen rounded-2xl">
      <div className=" mx-auto p-6 space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Client & Services</h1>
          </div>

          {/* Work Availability Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">
              Work Availability
            </span>
            <Toggle
              className="h-8 w-14"
              pressed={workAvailability}
              onPressedChange={setWorkAvailability}
            />
          </div>
        </div>

        {/* Work Availability Off State */}
        {!workAvailability && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-white" strokeWidth={3} />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Your availability is turned off
              </h2>
              <p className="text-gray-600">
                Turn your availability on so that you can see client requests
              </p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && workAvailability && (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-[#00B4B8]" />
              <p className="text-sm text-gray-500">Loading clients...</p>
            </div>
          </div>
        )}

        {/* Pending Clients Section */}
        {!loading && workAvailability && pendingClients.length > 0 && (
          <div className="bg-blue-50 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Pending Clients</h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  These are your pending clients
                </p>
              </div>
              <button 
                onClick={() => setPendingExpanded(!pendingExpanded)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-600 text-sm rounded-full hover:bg-gray-50 transition-colors"
              >
                <ExpandIcon className="w-4 h-4" />
                Expand
              </button>
            </div>

            {pendingExpanded && (
              <div className="divide-y divide-gray-200">
                {pendingClients.map((client) => (
                  <div
                    key={client.id}
                    className="grid grid-cols-12 gap-4 px-6 py-4 bg-blue-50 items-center"
                  >
                    {/* Client Info */}
                    <div className="col-span-2 flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={client.profileImage || ServicesAvatar} alt={getClientName(client)} />
                        <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
                          {getInitials(client)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {getClientName(client)}
                        </p>
                        <p className="text-xs text-gray-500">Client</p>
                      </div>
                    </div>

                    {/* Date */}
                    <div className="col-span-2 flex items-center">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Date</p>
                        <p className="text-sm text-gray-900">
                          {client.createdAt ? new Date(client.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                        </p>
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
                    <div className="col-span-2 flex items-center">
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Service</p>
                        <p className="text-sm text-gray-900">{client.service}</p>
                      </div>
                    </div>

                    {/* Service Code */}
                    <div className="col-span-2 flex items-center">
                      <span className="inline-flex items-center px-3 py-1 rounded-md bg-gray-200 text-gray-700 text-xs font-medium">
                        {client.serviceCode || client.service}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleAccept(client)}
                        className="flex items-center gap-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full text-sm font-medium transition-colors"
                      >
                        <Check className="w-4 h-4" />
                        Accept
                      </button>
                      <button
                        onClick={() => handleReject(client.id)}
                        className="flex items-center gap-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-full text-sm font-medium transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Past Clients Section */}
        {!loading && (workAvailability || true) && pastClients.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Past Clients</h2>
                <p className="text-sm text-gray-600 mt-0.5">
                  These are your Previous clients
                </p>
              </div>
              <button 
                onClick={() => setPastExpanded(!pastExpanded)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-gray-600 text-sm rounded-full hover:bg-gray-50 transition-colors"
              >
                <ExpandIcon className="w-4 h-4" />
                Expand
              </button>
            </div>

            {pastExpanded && (
              <>
                <div className="divide-y divide-gray-100">
                  {pastClients.map((client) => (
                    <div
                      key={client.id}
                      className="grid grid-cols-12 gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                    >
                      {/* Client Info */}
                      <div className="col-span-3 flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={client.profileImage || ServicesAvatar} alt={getClientName(client)} />
                          <AvatarFallback className="bg-gray-200 text-gray-700 text-sm font-medium">
                            {getInitials(client)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">
                            {getClientName(client)}
                          </p>
                          <p className="text-xs text-gray-500">Client</p>
                        </div>
                      </div>

                      {/* Location */}
                      <div className="col-span-3 flex items-center">
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

                      {/* Status */}
                      <div className="col-span-3 flex items-center justify-end">
                        <span className="inline-flex items-center px-3 py-1 rounded-md bg-gray-200 text-gray-700 text-xs font-medium">
                          {client.status || 'active'}
                        </span>
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
              </>
            )}
          </div>
        )}
      </div>

      {/* Accept Success Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center space-y-4">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-white" strokeWidth={3} />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                You accepted {acceptedClientName}'s request.
              </h3>
              <p className="text-sm text-gray-600">
                This activity is on your shift management tab which is in 3 days
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
