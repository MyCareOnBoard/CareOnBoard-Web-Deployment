import React, { useState, useMemo } from "react";
import { Link } from "react-router";
import UserIcon from "@/assets/icons/user-heroicon.svg?react";
import ChatBubbleIcon from "@/assets/icons/chat-bubble-heroicon.svg?react";
import WrenchIcon from "@/assets/icons/wrench-heroicon.svg?react";
import PhoneIcon from "@/assets/icons/phone-heroicon.svg?react";
import ShieldIcon from "@/assets/icons/shield-heroicon.svg?react";
import ChatEllipsisIcon from "@/assets/icons/chat-ellipsis-heroicon.svg?react";
import { useGetAllActivityLogsQuery } from "@/pages/userPanel/notes/api";
import { useListClientsQuery, Client } from "@/lib/api/clients";
import { ActivityLog } from "@/lib/api/employees";
import { Routes } from "@/routes/constants";
import { cn } from "@/lib/utils";
import { ArrowLeft, Search, FileText, ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";

export type NoteCardType = {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  path: string;
  client?: string;
  createdAt?: string;
};

const noteTypes: NoteCardType[] = [
  {
    id: "community-based",
    icon: UserIcon,
    title: "Community Based / Individual Supports",
    description: "Step-by-step instructions for using key features of the dashboard, including viewing doctor schedules.",
    path: Routes.userPanel.notes.communityBased,
  },
  {
    id: "community-inclusion",
    icon: ChatBubbleIcon,
    title: "Community Inclusion Services – Activities Log",
    description: "Provides answers to common healthcare-related questions, such as how to schedule an appointment, doctor availability, and room booking.",
    path: Routes.userPanel.notes.communityInclusion,
  },
  {
    id: "day-habilitation",
    icon: WrenchIcon,
    title: "Day Habilitation Services – Activities Log",
    description: "Solutions to common issues, such as errors in appointment booking, missing patient data, or login problems.",
    path: Routes.userPanel.notes.dayHabilitation,
  },
  {
    id: "prevocational-training",
    icon: PhoneIcon,
    title: "Prevocational Training Services – Activities Log",
    description: "Information on how to reach the support team via chat, email, or phone.",
    path: Routes.userPanel.notes.preVocationalTraining,
  },
  {
    id: "supported-employment-intervention",
    icon: PhoneIcon,
    title: "Supported Employment Services – Intervention Plan and Service Log",
    description: "Information on how to reach the support team via chat, email, or phone.",
    path: Routes.userPanel.notes.supportedEmploymentIntervention,
  },
  {
    id: "supported-employment-pre",
    icon: ShieldIcon,
    title: "Supported Employment Services – Pre‐Employment Service Log",
    description: "Explanation of how patient data is protected, privacy policies, and compliance with healthcare standards.",
    path: Routes.userPanel.notes.supportedEmploymentPre,
  },
  {
    id: "respite-log",
    icon: ChatEllipsisIcon,
    title: "Respite Log",
    description: "A section where users can provide input on current features and suggest improvements.",
    path: Routes.userPanel.notes.respiteLog,
  },
];

const noteTypeLabels: Record<string, string> = {
  "community-based": "Community Based",
  "community-inclusion": "Community Inclusion",
  "day-habilitation": "Day Habilitation",
  "prevocational-training": "Prevocational",
  "supported-employment-intervention": "Supported Employment",
  "supported-employment-pre": "Employment Pre",
  "respite-log": "Respite Log",
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getLastActivityDate(logs: ActivityLog[]): string {
  const dates = logs
    .map((l) => l.createdAt)
    .filter(Boolean)
    .map((d) => new Date(d!).getTime());
  if (!dates.length) return "";
  const latest = new Date(Math.max(...dates));
  return latest.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getUniqueNoteTypes(logs: ActivityLog[]): string[] {
  const seen = new Set<string>();
  for (const log of logs) {
    if (log.activityType) seen.add(log.activityType);
  }
  return Array.from(seen);
}

interface ClientCardProps {
  clientName: string;
  logs: ActivityLog[];
  client?: Client;
  onSelect: () => void;
}

function ClientCard({ clientName, logs, client, onSelect }: ClientCardProps) {
  const initials = getInitials(clientName);
  const lastActivity = getLastActivityDate(logs);
  const noteTypesList = getUniqueNoteTypes(logs);
  const service = client?.services?.[0]?.name || logs[0]?.metadata?.serviceCode || null;

  return (
    <button
      onClick={onSelect}
      className="group text-left bg-[rgba(255,255,255,0.3)] backdrop-blur backdrop-filter rounded-[30px] p-5 border border-[rgba(255,255,255,0.3)] flex flex-col gap-4 w-full transition-all hover:border-[#00b4b8] hover:shadow-md cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-[rgba(255,255,255,0.5)]">
            {client?.profileImage && <AvatarImage src={client.profileImage} alt={clientName} />}
            <AvatarFallback className="bg-[#00b4b8] text-white text-sm font-semibold font-['Urbanist',sans-serif]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-[16px] font-semibold text-[#10141a] font-['Urbanist',sans-serif] leading-tight">
              {clientName}
            </p>
            <p className="text-[12px] text-[#808081] font-['Urbanist',sans-serif]">Client</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-[#808081] transition-transform group-hover:translate-x-1 group-hover:text-[#00b4b8]" />
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-[#00b4b8]" />
          <span className="text-[13px] font-semibold text-[#10141a] font-['Urbanist',sans-serif]">
            {logs.length} {logs.length === 1 ? "note" : "notes"}
          </span>
        </div>
        {lastActivity && (
          <span className="text-[12px] text-[#808081] font-['Urbanist',sans-serif]">
            Last: {lastActivity}
          </span>
        )}
      </div>

      {/* Note type pills */}
      {noteTypesList.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {noteTypesList.slice(0, 3).map((type) => (
            <span
              key={type}
              className="px-2.5 py-0.5 rounded-full bg-[rgba(0,180,184,0.1)] text-[#00b4b8] text-[11px] font-medium font-['Urbanist',sans-serif] border border-[rgba(0,180,184,0.2)]"
            >
              {noteTypeLabels[type] || type}
            </span>
          ))}
          {noteTypesList.length > 3 && (
            <span className="px-2.5 py-0.5 rounded-full bg-[rgba(128,128,129,0.1)] text-[#808081] text-[11px] font-medium font-['Urbanist',sans-serif]">
              +{noteTypesList.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Service */}
      {service && (
        <p className="text-[12px] text-[#808081] font-['Urbanist',sans-serif]">
          Service: <span className="text-[#10141a] font-medium">{service}</span>
        </p>
      )}

      {/* CTA */}
      <span className="text-[#2b82ff] text-[13px] font-semibold font-['Urbanist',sans-serif] transition-colors group-hover:text-[#00b4b8]">
        View Notes →
      </span>
    </button>
  );
}

interface ClientNotesViewProps {
  clientName: string;
  logs: ActivityLog[];
  client?: Client;
  onBack: () => void;
}

function ClientNotesView({ clientName, logs, client, onBack }: ClientNotesViewProps) {
  const initials = getInitials(clientName);

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-[#808081] hover:text-[#10141a] transition-colors font-['Urbanist',sans-serif] text-[14px] font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            All Clients
          </button>
          <div className="w-px h-6 bg-[rgba(0,0,0,0.1)]" />
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 ring-2 ring-[rgba(0,180,184,0.2)]">
              {client?.profileImage && <AvatarImage src={client.profileImage} alt={clientName} />}
              <AvatarFallback className="bg-[#00b4b8] text-white text-sm font-semibold font-['Urbanist',sans-serif]">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-[28px] font-semibold leading-tight text-[#10141a] font-['Urbanist',sans-serif]">
                {clientName}
              </h1>
              {client?.services?.[0]?.name && (
                <p className="text-[13px] text-[#808081] font-['Urbanist',sans-serif]">
                  {client.services[0].name}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="bg-[rgba(0,180,184,0.1)] border border-[rgba(0,180,184,0.2)] rounded-full px-4 py-1.5">
          <span className="text-[13px] text-[#00b4b8] font-semibold font-['Urbanist',sans-serif]">
            {logs.length} {logs.length === 1 ? "Note" : "Notes"}
          </span>
        </div>
      </div>

      {/* Notes grid */}
      {logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
          <FileText className="w-12 h-12 text-[rgba(128,128,129,0.4)]" />
          <p className="text-[#808081] font-['Urbanist',sans-serif] text-[16px]">No notes for this client yet.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {logs.map((note) => {
            const noteModified = {
              ...(noteTypes.find((n) => n.id === note.activityType) || noteTypes[0]),
              client: note?.metadata?.individual,
              createdAt: note?.createdAt,
            };
            return <NoteCard key={note.id} noteId={note.id} note={noteModified} />;
          })}
        </div>
      )}
    </div>
  );
}

export default function NotesPage() {
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const { data: notes = [], isLoading: logsLoading } = useGetAllActivityLogsQuery(undefined);
  const { data: clientsData } = useListClientsQuery();

  const clientMap = useMemo(() => {
    const map: Record<string, Client> = {};
    for (const client of clientsData?.clients ?? []) {
      const fullName = [client.firstName, client.lastName].filter(Boolean).join(" ").trim();
      if (fullName) map[fullName] = client;
    }
    return map;
  }, [clientsData]);

  const clientGroups = useMemo(() => {
    const groups: Record<string, ActivityLog[]> = {};
    for (const log of notes) {
      const name = log.metadata?.individual?.trim() || "Unknown Client";
      if (!groups[name]) groups[name] = [];
      groups[name].push(log);
    }
    return groups;
  }, [notes]);

  const filteredClientNames = useMemo(() => {
    return Object.keys(clientGroups).filter((name) =>
      name.toLowerCase().includes(search.toLowerCase())
    );
  }, [clientGroups, search]);

  if (logsLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent" />
          <p className="text-sm text-[#808081]">Loading notes...</p>
        </div>
      </div>
    );
  }

  if (selectedClientName !== null) {
    return (
      <ClientNotesView
        clientName={selectedClientName}
        logs={clientGroups[selectedClientName] ?? []}
        client={clientMap[selectedClientName]}
        onBack={() => setSelectedClientName(null)}
      />
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-4">
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a] font-['Urbanist',sans-serif] shrink-0">
          Notes
        </h1>
        <div className="relative max-w-xs w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#808081]" />
          <Input
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-full border-[rgba(0,0,0,0.1)] bg-[rgba(255,255,255,0.5)] font-['Urbanist',sans-serif]"
          />
        </div>
      </div>

      {/* Client count */}
      {filteredClientNames.length > 0 && (
        <p className="text-[13px] text-[#808081] font-['Urbanist',sans-serif] mb-5">
          {filteredClientNames.length} {filteredClientNames.length === 1 ? "client" : "clients"}
        </p>
      )}

      {/* Empty state */}
      {filteredClientNames.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[350px] gap-4">
          <FileText className="w-14 h-14 text-[rgba(128,128,129,0.3)]" />
          <div className="text-center">
            <p className="text-[18px] font-semibold text-[#10141a] font-['Urbanist',sans-serif] mb-1">
              {search ? "No clients found" : "No notes yet"}
            </p>
            <p className="text-[14px] text-[#808081] font-['Urbanist',sans-serif]">
              {search ? "Try a different search term." : "Notes will appear here once activity logs are added."}
            </p>
          </div>
        </div>
      )}

      {/* Client cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredClientNames.map((clientName) => (
          <ClientCard
            key={clientName}
            clientName={clientName}
            logs={clientGroups[clientName]}
            client={clientMap[clientName]}
            onSelect={() => setSelectedClientName(clientName)}
          />
        ))}
      </div>
    </div>
  );
}