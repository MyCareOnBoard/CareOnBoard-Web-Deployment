import React from "react";
import {useNavigate} from "react-router";
import {Routes} from "@/routes/constants";
import {NoteCard, NoteCardType} from "@/pages/userPanel/notes";
import {Button} from "@/components/ui/button";
import {List} from "lucide-react";
import UserIcon from "@/assets/icons/user-heroicon.svg?react";
import ChatBubbleIcon from "@/assets/icons/chat-bubble-heroicon.svg?react";
import WrenchIcon from "@/assets/icons/wrench-heroicon.svg?react";
import PhoneIcon from "@/assets/icons/phone-heroicon.svg?react";

export default function GoalsAndDocumentsPage() {
    const navigate = useNavigate();

    const documentCards: NoteCardType[] = [
        {
            id: "community-inclusion-individualized-goals",
            title: "Community Inclusion Services – Individualized Goals",
            description: "Manage individualized goals for community inclusion services",
            path: Routes.agency.goalsAndDocuments.communityInclusionIndividualizedGoals,
            icon: UserIcon,
        },
        {
            id: "day-habilitation-individualized-goals",
            title: "Day Habilitation Services – Individualized Goals",
            description: "Provides answers to common healthcare-related questions, such as how to schedule an " +
                "appointment, doctor availability, and room booking.",
            path: Routes.agency.goalsAndDocuments.dayHabilitationIndividualizedGoals,
            icon: ChatBubbleIcon,
        },
        {
            id: "natural-supports-training",
            title: "Natural Supports Training",
            description: "Manage natural supports training documentation and goals",
            path: Routes.agency.goalsAndDocuments.naturalSupportsTraining,
            icon: WrenchIcon,
        },
        {
            id: "prevocational-training-individualized-goals",
            title: "Prevocational Training – Individualized Goals",
            description: "Information on how to reach the support team via chat, email, or phone.",
            path: Routes.agency.goalsAndDocuments.prevocationalTrainingIndividualizedGoals,
            icon: PhoneIcon,
        },
        {
            id: "community-inclusion-services",
            title: "Community Inclusion Services – Annual Update",
            description: "Track and update community inclusion services goals",
            path: Routes.agency.goalsAndDocuments.communityInclusionServices,
            icon: UserIcon,
        },
        {
            id: "day-habilitation-services",
            title: "Day Habilitation Services – Annual Update",
            description: "Manage day habilitation services documentation",
            path: Routes.agency.goalsAndDocuments.dayHabilitationServices,
            icon: ChatBubbleIcon,
        },
        {
            id: "prevocational-training-services",
            title: "Prevocational Training Services – Annual Update",
            description: "Track prevocational training goals and progress",
            path: Routes.agency.goalsAndDocuments.prevocationalTrainingServices,
            icon: PhoneIcon,
        },
    ];

    const handleCardClick = (route: string) => {
        navigate(route);
    };

    return (
        <div className="min-h-[calc(100vh-200px)]">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-[40px] font-bold leading-[1.4] text-[#10141a]">
                            Goals & Documents
                        </h1>
                        <p className="text-[14px] font-medium text-[#808081] mt-2">
                            Manage goals and documentation for various services
                        </p>
                    </div>
                    <Button
                        onClick={() => navigate(`${Routes.agency.goalsAndDocuments.index}/list`)}
                        className="flex items-center gap-2 bg-[#2B82FF] hover:bg-[#1a5fbf] text-white"
                    >
                        <List size={20} />
                        View All Documents
                    </Button>
                </div>
            </div>

            {/* Cards Grid */}
            <div className="flex flex-wrap gap-3">
                {documentCards.map((card) => (
                    <NoteCard
                        key={card.id}
                        noteId={card.id}
                        note={card}
                    />
                ))}
            </div>
        </div>
    );
}
