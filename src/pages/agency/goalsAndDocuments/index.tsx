import React from "react";
import { useNavigate } from "react-router";
import { Routes } from "@/routes/constants";
import { FileText, ChevronRight } from "lucide-react";

interface GoalDocumentCard {
  id: string;
  title: string;
  description: string;
  route: string;
  icon: React.ReactNode;
}

export default function GoalsAndDocumentsPage() {
  const navigate = useNavigate();

  const documentCards: GoalDocumentCard[] = [
    {
      id: "natural-supports-training",
      title: "Natural Supports Training",
      description: "Manage natural supports training documentation and goals",
      route: Routes.agency.goalsAndDocuments.naturalSupportsTraining,
      icon: <FileText className="w-6 h-6 text-[#2B82FF]" />,
    },
    {
      id: "community-inclusion-services",
      title: "Community Inclusion Services – Annual Update",
      description: "Track and update community inclusion services goals",
      route: Routes.agency.goalsAndDocuments.communityInclusionServices,
      icon: <FileText className="w-6 h-6 text-[#2B82FF]" />,
    },
    {
      id: "community-inclusion-individualized-goals",
      title: "Community Inclusion Services – Individualized Goals",
      description: "Manage individualized goals for community inclusion services",
      route: Routes.agency.goalsAndDocuments.communityInclusionIndividualizedGoals,
      icon: <FileText className="w-6 h-6 text-[#2B82FF]" />,
    },
    {
      id: "day-habilitation-services",
      title: "Day Habilitation Services – Annual Update",
      description: "Manage day habilitation services documentation",
      route: Routes.agency.goalsAndDocuments.dayHabilitationServices,
      icon: <FileText className="w-6 h-6 text-[#2B82FF]" />,
    },
    {
      id: "prevocational-training-services",
      title: "Prevocational Training Services – Annual Update",
      description: "Track prevocational training goals and progress",
      route: Routes.agency.goalsAndDocuments.prevocationalTrainingServices,
      icon: <FileText className="w-6 h-6 text-[#2B82FF]" />,
    },
  ];

  const handleCardClick = (route: string) => {
    navigate(route);
  };

  return (
    <div className="min-h-[calc(100vh-200px)]">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
          Goals & Documents
        </h1>
        <p className="text-[14px] font-medium text-[#808081] mt-2">
          Manage goals and documentation for various services
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {documentCards.map((card) => (
          <div
            key={card.id}
            onClick={() => handleCardClick(card.route)}
            className="cursor-pointer rounded-[20px] bg-white p-6 shadow-sm border border-[#e5e5e6] hover:border-[#2B82FF] hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4 flex-1">
                <div className="shrink-0 w-12 h-12 rounded-full bg-[#2B82FF]/10 flex items-center justify-center">
                  {card.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-[18px] font-semibold text-[#10141a] mb-2 group-hover:text-[#2B82FF] transition-colors">
                    {card.title}
                  </h3>
                  <p className="text-[14px] text-[#808081]">
                    {card.description}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-[#808081] group-hover:text-[#2B82FF] transition-colors shrink-0 ml-4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
