import React from "react";
import { useLocation, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Routes } from "@/routes/constants";
import PersonalCareNoteForm from "@/pages/userPanel/notes/hha-personal-care/PersonalCareNoteForm";

export default function HhaPersonalCareNotePage() {
  const navigate = useNavigate();
  const activityLogId = new URLSearchParams(useLocation().search).get("id");

  return (
    <div className="min-h-[calc(100vh-200px)] pb-20">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a] font-['Urbanist',sans-serif]">
          Notes
        </h1>
        <Button
          onClick={() => navigate(Routes.userPanel.notes.index)}
          className="flex h-auto items-center gap-2 rounded-full bg-[#00b4b8] px-6 py-3 font-semibold text-white shadow-sm hover:bg-[#009da1]"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Notes
        </Button>
      </div>

      {activityLogId ? (
        <PersonalCareNoteForm activityLogId={activityLogId} />
      ) : (
        <p className="text-[#808081] font-['Urbanist',sans-serif]">No note selected.</p>
      )}
    </div>
  );
}
