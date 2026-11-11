import React from "react";
import { Link } from "react-router";
import { cn } from "@/lib/utils";

export type NoteCardType = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  path: string;
  client?: string;
  createdAt?: string;
};

export function NoteCard({ note, noteId }: { note: NoteCardType; noteId: string | undefined }) {
  const Icon = note.icon;

  return (
    <Link
      to={noteId ? note.path + "?id=" + noteId : ""}
      className={cn(
        "group bg-[rgba(255,255,255,0.3)] backdrop-blur backdrop-filter rounded-[30px] p-5 border border-[rgba(255,255,255,0.3)] flex flex-col gap-3 w-full lg:w-[379px] transition-all hover:border-[#00b4b8] cursor-pointer no-underline",
        !noteId && "opacity-50 cursor-not-allowed"
      )}
    >
      <div className={"flex justify-between items-center"}>
        <div className="flex space-x-2 bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#10141a] [&_*]:fill-[#10141a] [&_path]:fill-[#10141a]" />
          <span className={"w-full"}>{note?.client}</span>
        </div>
        <span className={"text-sm text-[#808081]"}>{note?.createdAt ? new Date(note.createdAt).toDateString() : ""}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="text-[20px] font-medium leading-[1.6] text-[#10141a] font-['Urbanist',sans-serif]">
          {note.title}
        </h3>
        <p className="text-[14px] font-medium leading-[1.4] text-[#808081] line-clamp-2 h-10 overflow-hidden font-['Urbanist',sans-serif]">
          {note.description}
        </p>
      </div>

      <span className="text-[#2b82ff] text-[14px] font-semibold leading-[1.4] rounded-[60px] backdrop-blur-[22px] backdrop-filter py-2 text-left transition-colors group-hover:text-[#00b4b8]">
        Fill Now
      </span>
    </Link>
  );
}
