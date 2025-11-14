import React from "react";
import { Link } from "react-router";
import UserIcon from "@/assets/icons/user-heroicon.svg?react";
import ChatBubbleIcon from "@/assets/icons/chat-bubble-heroicon.svg?react";
import WrenchIcon from "@/assets/icons/wrench-heroicon.svg?react";
import PhoneIcon from "@/assets/icons/phone-heroicon.svg?react";
import ShieldIcon from "@/assets/icons/shield-heroicon.svg?react";
import ChatEllipsisIcon from "@/assets/icons/chat-ellipsis-heroicon.svg?react";

type NoteCardType = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  path: string;
};

const noteTypes: NoteCardType[] = [
  {
    id: "community-based",
    icon: UserIcon,
    title: "Community Based / Individual Supports",
    description: "Step-by-step instructions for using key features of the dashboard, including viewing doctor schedules.",
    path: "/user-panel/notes/community-based",
  },
  {
    id: "community-inclusion",
    icon: ChatBubbleIcon,
    title: "Community Inclusion Services – Activities Log",
    description: "Provides answers to common healthcare-related questions, such as how to schedule an appointment, doctor availability, and room booking.",
    path: "/user-panel/notes/community-inclusion",
  },
  {
    id: "day-habilitation",
    icon: WrenchIcon,
    title: "Day Habilitation Services – Activities Log",
    description: "Solutions to common issues, such as errors in appointment booking, missing patient data, or login problems.",
    path: "/user-panel/notes/day-habilitation",
  },
  {
    id: "prevocational-training",
    icon: PhoneIcon,
    title: "Prevocational Training Services – Activities Log",
    description: "Information on how to reach the support team via chat, email, or phone.",
    path: "/user-panel/notes/prevocational-training",
  },
  {
    id: "supported-employment-intervention",
    icon: PhoneIcon,
    title: "Supported Employment Services – Intervention Plan and Service Log",
    description: "Information on how to reach the support team via chat, email, or phone.",
    path: "/user-panel/notes/supported-employment-intervention",
  },
  {
    id: "supported-employment-pre",
    icon: ShieldIcon,
    title: "Supported Employment Services – Pre‐Employment Service Log",
    description: "Explanation of how patient data is protected, privacy policies, and compliance with healthcare standards.",
    path: "/user-panel/notes/supported-employment-pre",
  },
  {
    id: "respite-log",
    icon: ChatEllipsisIcon,
    title: "Respite Log",
    description: "A section where users can provide input on current features and suggest improvements.",
    path: "/user-panel/notes/respite-log",
  },
];

function NoteCard({ note }: { note: NoteCardType }) {
  const Icon = note.icon;
  
  return (
    <Link
      to={note.path}
      className="group bg-[rgba(255,255,255,0.3)] backdrop-blur backdrop-filter rounded-[30px] p-5 border border-[rgba(255,255,255,0.3)] flex flex-col gap-3 w-full lg:w-[379px] transition-all hover:border-[#00b4b8] cursor-pointer no-underline"
    >
      {/* Icon */}
      <div className="bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full h-10 w-10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-[#10141a] [&_*]:fill-[#10141a] [&_path]:fill-[#10141a]" />
      </div>

      {/* Title and Description */}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[20px] font-medium leading-[1.6] text-[#10141a] font-['Urbanist',sans-serif]">
          {note.title}
        </h3>
        <p className="text-[14px] font-medium leading-[1.4] text-[#808081] line-clamp-2 h-10 overflow-hidden font-['Urbanist',sans-serif]">
          {note.description}
        </p>
      </div>

      {/* Fill Now Link */}
      <span
        className="text-[#2b82ff] text-[14px] font-semibold leading-[1.4] rounded-[60px] backdrop-blur-[22px] backdrop-filter py-2 text-left transition-colors group-hover:text-[#00b4b8]"
      >
        Fill Now
      </span>
    </Link>
  );
}

export default function NotesPage() {
  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-[58px]">
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a] font-['Urbanist',sans-serif]">
          Notes
        </h1>
        <p className="text-[20px] font-semibold leading-[1.6] text-[#10141a] font-['Urbanist',sans-serif]">
          Total Mileage : 23KM
        </p>
      </div>

      {/* Notes Grid */}
      <div className="flex flex-wrap gap-3">
        {noteTypes.map((note) => (
          <NoteCard key={note.id} note={note} />
        ))}
      </div>
    </div>
  );
}

