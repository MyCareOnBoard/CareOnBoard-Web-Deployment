import React from "react";
import {Link} from "react-router";
import UserIcon from "@/assets/icons/user-heroicon.svg?react";
import ChatBubbleIcon from "@/assets/icons/chat-bubble-heroicon.svg?react";
import WrenchIcon from "@/assets/icons/wrench-heroicon.svg?react";
import PhoneIcon from "@/assets/icons/phone-heroicon.svg?react";
import ShieldIcon from "@/assets/icons/shield-heroicon.svg?react";
import ChatEllipsisIcon from "@/assets/icons/chat-ellipsis-heroicon.svg?react";
import {useGetAllActivityLogsQuery, useSeedActivityLogsMutation} from "@/pages/userPanel/notes/api";
import {Routes} from "@/routes/constants";
import {cn} from "@/lib/utils";
import {Button} from "@/components/ui/button";
import {Database, Loader2} from "lucide-react";

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

function NoteCard({note, noteId}: { note: NoteCardType, noteId: string | undefined }) {
  const Icon = note.icon;

  return (
    <Link
      to={noteId ? note.path + "?id=" + noteId : ""}
      className={cn(
        "group bg-[rgba(255,255,255,0.3)] backdrop-blur backdrop-filter rounded-[30px] p-5 border border-[rgba(255,255,255,0.3)] flex flex-col gap-3 w-full lg:w-[379px] transition-all hover:border-[#00b4b8] cursor-pointer no-underline",
        !noteId && "opacity-50 cursor-not-allowed"
      )}
    >
      {/* Icon */}
      <div
        className="bg-[rgba(255,255,255,0.5)] border border-[rgba(255,255,255,0.3)] rounded-full h-10 w-10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-[#10141a] [&_*]:fill-[#10141a] [&_path]:fill-[#10141a]"/>
      </div>

      {/* Title and Description */}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[20px] font-medium leading-[1.6] text-[#10141a] font-['Urbanist',sans-serif]">
          {note.title}
        </h3>
        <p
          className="text-[14px] font-medium leading-[1.4] text-[#808081] line-clamp-2 h-10 overflow-hidden font-['Urbanist',sans-serif]">
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
  const {data: notes = [], isLoading} = useGetAllActivityLogsQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const [seedData, {isLoading: seedingData}] = useSeedActivityLogsMutation();

  const noteKeys = notes?.reduce((acc: Record<string, string>, note) => {
    acc[note.activityType] = note.id;
    return acc;
  }, {}) || {};

  const seedInfo = [
    {
      "activityType": "community-based",
      "description": "",
      "metadata": {
        "individual": "Alex Johnson",
        "serviceYear": 2025,
        "serviceCode": "TDHJ/3421",
        "ISPOutcome": "Proceed to generate",
        "strategies": [
          "dailyLiving",
          "comunityParticipation",
          "independence",
          "support",
          "learning"
        ]
      }
    },
    {
      "activityType": "community-inclusion",
      "description": "",
      "metadata": {
        "individual": "John Doe",
        "serviceCode": "TDHJ/3422"
      }
    },
    {
      "activityType": "day-habilitation",
      "description": "",
      "metadata": {
        "individual": "Jane Doe",
        "serviceCode": "TDHJ/3423"
      }
    },
    {
      "activityType": "prevocational-training",
      "description": "",
      "metadata": {
        "individual": "Andrews Doe",
        "serviceCode": "TDHJ/3424"
      }
    },
    {
      "activityType": "respite-log",
      "description": "",
      "metadata": {
        "individual": "Andrews Doe",
        "serviceCode": "TDHJ/3424",
        "toileting": "Test"
      }
    },
    {
      "activityType": "supported-employment-pre",
      "description": "",
      "metadata": {
        "individual": "Andrews Doe",
        "serviceCode": "TDHJ/3424",
        "totalHours": "4",
        "reportingStartDate": "2025-11-20",
        "reportingEndDate": "2025-11-30"
      }
    },
    {
      "activityType": "supported-employment-intervention",
      "description": "",
      "metadata": {
        "individual": "Andrews Doe",
        "employer": "Downtown Inc",
        "jobType": "Menial Work",
        "ISPOutcome": "All good",
        "serviceCode": "TDHJ/3426",
        "totalHours": "4",
        "reportingStartDate": "2025-11-20",
        "reportingEndDate": "2025-11-30"
      }
    }
  ]

  const handleSeedData = async () => {
    try {
      await seedData(seedInfo).unwrap();
    } catch (error) {
      console.error("Error seeding data:", error);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div
            className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-[#00b4b8] border-r-transparent"></div>
          <p className="text-sm text-[#808081]">Loading activity log...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-[58px]">
        <h1 className="text-[40px] font-semibold leading-[1.6] text-[#10141a] font-['Urbanist',sans-serif]">
          Notes
        </h1>
        <div className={"flex items-center space-x-4"}>
          {!isLoading && (
            <Button
              onClick={handleSeedData}
              disabled={seedingData}
              className="bg-[#808081] hover:bg-[#6a6a6b] text-white rounded-full px-4 py-2 lg:py-3 h-auto text-[14px] font-semibold shadow-sm transition-all duration-200 flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {seedingData ? (
                <Loader2 size={20} className="animate-spin"/>
              ) : (
                <Database size={20}/>
              )}
              {seedingData ? 'Creating...' : 'Seed Data'}
            </Button>
          )}
          <p className="text-[20px] font-semibold leading-[1.6] text-[#10141a] font-['Urbanist',sans-serif]">
            Total Mileage : 0KM
          </p>
        </div>
      </div>

      {/* Notes Grid */}
      <div className="flex flex-wrap gap-3">
        {noteTypes.map((note) => (
          <NoteCard key={note.id} noteId={noteKeys[note.id]} note={note}/>
        ))}
      </div>
    </div>
  );
}

