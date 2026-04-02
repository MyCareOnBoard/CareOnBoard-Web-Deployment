import React from "react";
import {X} from "lucide-react";
import {Button} from "@/components/ui/button";


export default function ClientReportModal(
  {
    onClose
  }: {
    onClose: () => void
  }
) {
  const documents = [
    {
      id: 1,
      name: "Document name"
    },
    {
      id: 2,
      name: "Document name"
    },
    {
      id: 3,
      name: "Document name"
    }
  ]
  return (
    <div>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50"/>

      <div className="w-lg fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl">
        <div className={"flex justify-between p-6"}>
          <div>
            <h4 className={"text-xl font-semibold"}>Report</h4>
            <p className={"text-sm text-[#808081]"}>Documents for Brooklyn Simmons</p>
          </div>
          <div>
            <div className={"flex bg-[#EFF2F3] rounded-full p-2 cursor-pointer"} onClick={onClose}>
              <X className="w-4 h-4"/>
            </div>
          </div>
        </div>
        <div className={"px-6 py-4 flex items-center gap-4"}>
          <div className={"bg-[#E0E0E0] w-[60px] h-[60px] rounded-[10px]"}></div>
          <div>
            <h4 className={"font-semibold"}>Dr. Brooklyn Simmons</h4>
            <p className={"text-[#808081]"}>Client</p>
          </div>
        </div>
        <div className={"px-6 pt-4 pb-8 flex flex-col gap-4"}>
          {documents.map((document) => (
            <div key={document.id} className={"flex items-center justify-between gap-4 mb-4"}>
              <h4 className={"font-semibold"}>{document.name}</h4>
              <Button
                className={"px-6 py-1 rounded-full text-xs font-semibold transition-colors bg-[#0EAF521A] hover:bg-[#0EAF521A] text-[#0EAF52] border border-[#0EAF52]"}
              >
                View Document
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}