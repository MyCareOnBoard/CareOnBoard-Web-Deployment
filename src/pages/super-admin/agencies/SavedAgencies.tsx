import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";

interface SavedAgency {
  id: string;
  name: string;
  savedDate: string;
  formData: any;
}

export default function SavedAgencies() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Load saved agencies from localStorage
  const [savedAgencies, setSavedAgencies] = useState<SavedAgency[]>(() => {
    const stored = localStorage.getItem('agencyDrafts');
    return stored ? JSON.parse(stored) : [];
  });

  const filteredAgencies = savedAgencies.filter((agency) =>
    agency.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredAgencies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedAgencies = filteredAgencies.slice(startIndex, startIndex + itemsPerPage);

  const handleEdit = (agency: SavedAgency) => {
    // Navigate to the wizard with the saved data
    navigate(Routes.superAdmin.addAgency, { state: { savedData: agency } });
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this saved application?")) {
      const updatedAgencies = savedAgencies.filter((agency) => agency.id !== id);
      setSavedAgencies(updatedAgencies);
      localStorage.setItem('agencyDrafts', JSON.stringify(updatedAgencies));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#dbe8eb] to-[#eaeeef] flex flex-col">
      <div className="bg-white flex-1 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#e5e5e6] px-8 py-6 z-10">
          <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
            <div>
              <h2 className="text-[40px] font-bold text-[#10141a]">Add new agency</h2>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <div className="max-w-7xl mx-auto">
            {/* Saved Agencies Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-[20px] font-medium text-[#10141a]">Saved Agencies</h3>
                  <p className="text-[14px] text-[#808081]">These Are The Saved Applications</p>
                </div>
                <div className="relative w-[300px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#808081]" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search"
                    className="h-[44px] pl-10 rounded-[12px] border-[#e5e5e6] focus:border-[#00b4b8] focus:ring-[#00b4b8]"
                  />
                </div>
              </div>
            </div>

            {/* Saved Agencies List */}
            <div className="space-y-4">
              {paginatedAgencies.map((agency) => (
                <div
                  key={agency.id}
                  className="bg-white/50 backdrop-blur-[20px] rounded-[20px] p-4 flex items-center justify-between border border-transparent hover:border-[#00b4b8] transition-colors"
                >
                  <div className="flex items-center gap-16">
                    <div className="flex flex-col">
                      <p className="text-[16px] font-semibold text-[#10141a]">{agency.name}</p>
                    </div>
                    <div className="text-[14px] font-medium">
                      <p className="text-[#808081] mb-0">Saved on</p>
                      <p className="text-[#10141a]">{agency.savedDate}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => handleDelete(agency.id)}
                      className="bg-[#f04438] hover:bg-[#d63b2f] text-white px-4 py-2 rounded-[60px] font-semibold text-[14px] h-[36px]"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                    <Button
                      onClick={() => handleEdit(agency)}
                      className="bg-[#00b4b8] hover:bg-[#009da1] text-white px-4 py-2 rounded-[60px] font-semibold text-[14px] h-[36px] w-[159px]"
                    >
                      Edit Application
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <p className="text-[16px] font-medium text-[#10141a]">
                  {currentPage}
                  <span className="text-[14px] text-[#808081]">/{totalPages}</span>
                </p>
                <Button
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="bg-white/50 backdrop-blur border border-white/30 p-[6px] rounded-full hover:bg-white/70 disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5 text-[#10141a]" />
                </Button>
                <Button
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="bg-white/50 backdrop-blur border border-white/30 p-[6px] rounded-full hover:bg-white/70 disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5 text-[#10141a]" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
